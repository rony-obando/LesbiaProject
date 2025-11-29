using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using System.Text.Json;
using Entities;
using Interfaces;
using System.Globalization;

public class VentaService : IVentaService
{
    private readonly IAmazonDynamoDB _ddb;
    private readonly string _ventasTable;
    private readonly string _detalleTable;
    private readonly string _productosTable;
    private readonly string _movimientosTable; 
    private readonly string _cuotasTable;    
    private readonly string _pagosTable;      

    public VentaService(IAmazonDynamoDB ddb,
                        string ventasTable = "Ventas",
                        string detalleTable = "DetalleVenta",
                        string productosTable = "Productos",
                        string movimientosTable = "MovimientosInventario",
                        string cuotasTable = "Cuotas",
                        string pagosTable = "PagosVenta")
    {
        _ddb = ddb;
        _ventasTable = ventasTable;
        _detalleTable = detalleTable;
        _productosTable = productosTable;
        _movimientosTable = movimientosTable;
        _cuotasTable = cuotasTable;
        _pagosTable = pagosTable;
    }
    public async Task<List<object>> ObtenerVentasAsync()
    {
        // 1) Scan de todas las ventas
        var scan = await _ddb.ScanAsync(new ScanRequest
        {
            TableName = _ventasTable
        });

        var resultado = new List<object>();

        foreach (var item in scan.Items)
        {
            var venta = new Ventas
            {
                IdVenta = item["IdVenta"].S,
                ClienteId = item["ClienteId"].S,
                Fecha = DateTime.Parse(item["Fecha"].S),
                Total = decimal.Parse(item["Total"].N),
                Estado = item.TryGetValue("Estado", out var e) ? e.S : "ABIERTA"
            };

            // 2) Obtener nombre del cliente
            string nombreCliente = "";
            try
            {
                var cli = await _ddb.GetItemAsync("Clientes", new Dictionary<string, AttributeValue>
                {
                    ["IdCliente"] = new AttributeValue { S = venta.ClienteId }
                });

                if (cli.Item.Count > 0 && cli.Item.ContainsKey("Nombre"))
                    nombreCliente = cli.Item["Nombre"].S;
            }
            catch
            {
                nombreCliente = "";
            }

            // 3) Obtener detalles para calcular cantidad total de items
            var detallesResp = await _ddb.QueryAsync(new QueryRequest
            {
                TableName = _detalleTable,
                KeyConditionExpression = "IdVenta = :v",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":v"] = new AttributeValue { S = venta.IdVenta }
                }
            });

            int cantidadItems = detallesResp.Items
                .Sum(it => int.Parse(it["Cantidad"].N));

            // 4) Calcular saldo pendiente (solo si la venta tiene cuotas)
            decimal saldoPendiente = 0m;
            try
            {
                var cuotasResp = await _ddb.QueryAsync(new QueryRequest
                {
                    TableName = _cuotasTable, // nombre real de tu tabla de cuotas
                    KeyConditionExpression = "IdVenta = :v",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        [":v"] = new AttributeValue { S = venta.IdVenta }
                    }
                });
                int i = 0;
                foreach (var c in cuotasResp.Items)
                {
                    var estadoCuota = c.TryGetValue("Estado", out var ev) ? ev.S : "PENDIENTE";

                    // Si la cuota NO está pagada, la sumamos al saldo
                    if (!string.Equals(estadoCuota, "PAGADA", StringComparison.OrdinalIgnoreCase))
                    {
                        saldoPendiente += decimal.Parse(c["MontoCuota"].N);
                    }
                }
            }
            catch
            {
                // si no hay tabla/cuotas o pasa algo, dejamos saldoPendiente = 0
            }

            // 5) Agregar objeto compuesto
            resultado.Add(new
            {
                Venta = venta,
                ClienteNombre = nombreCliente,
                CantidadItems = cantidadItems,
                SaldoPendiente = saldoPendiente
            });
        }

        return resultado;
    }



    // ---------- REGISTRAR ----------
    public async Task RegistrarAsync(
    Ventas venta,
    IReadOnlyList<DetalleVenta> detalles,
    IReadOnlyList<Cuotas>? cuotas = null,
    IReadOnlyList<PagosVenta>? pagos = null,
    IReadOnlyList<MovimientosInventario>? movsExtra = null)
    {
        // 1) Normalizar estado de la venta si viene vacío o nulo
        if (string.IsNullOrWhiteSpace(venta.Estado))
        {
            // Si hay cuotas, asumimos CRÉDITO → ABIERTA
            if (cuotas != null && cuotas.Count > 0)
            {
                venta.Estado = "ABIERTA";
            }
            else
            {
                // Sin cuotas → venta CONTADO → ya se considera pagada
                venta.Estado = "PAGADA";
            }
        }

        var items = new List<TransactWriteItem>();

        // Put Venta (no duplicar)
        items.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = _ventasTable,
                Item = VentaToItem(venta),
                ConditionExpression = "attribute_not_exists(IdVenta)"
            }
        });
        int linea = 1;
        foreach (var d in detalles)
        {
            items.Add(PutDetalleItem(venta.IdVenta, linea++, d));
            items.Add(UpdateStockItem(d.IdProducto, -d.Cantidad, withNonNegativeCheck: true));

            var mov = new MovimientosInventario
            {
                IdMovimiento = Guid.NewGuid().ToString("N"),
                IdProducto = d.IdProducto,
                TipoMovimiento = "SALIDA",
                Cantidad = d.Cantidad,
                FechaMovimiento = DateTime.UtcNow,
                Referencia = venta.IdVenta
            };

            items.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = _movimientosTable,
                    Item = MovimientoToItem(mov),
                    ConditionExpression = "attribute_not_exists(IdProducto) AND attribute_not_exists(IdMovimiento)"
                }
            });
        }

        // 🔹 Guardar CUOTAS si vienen (venta a crédito)
        if (cuotas != null && cuotas.Count > 0)
        {
            foreach (var c in cuotas)
            {
                var cuotaConVenta = new Cuotas(c)
                {
                    IdVenta = venta.IdVenta,
                    IdCuotas = string.IsNullOrWhiteSpace(c.IdCuotas)
                        ? Guid.NewGuid().ToString("N")
                        : c.IdCuotas
                };

                items.Add(new TransactWriteItem
                {
                    Put = new Put
                    {
                        TableName = _cuotasTable,
                        Item = CuotaToItem(cuotaConVenta),
                        ConditionExpression = "attribute_not_exists(IdVenta) AND attribute_not_exists(IdCuotas)"
                    }
                });
            }
        }

        // 🔹 Guardar PAGOS iniciales si vienen (por ejemplo, pago inicial)
        if (pagos != null && pagos.Count > 0)
        {
            foreach (var p in pagos)
            {
                var pagoConVenta = new PagosVenta(p)
                {
                    IdVenta = venta.IdVenta,
                    IdPago = string.IsNullOrWhiteSpace(p.IdPago)
                        ? Guid.NewGuid().ToString("N")
                        : p.IdPago
                };

                items.Add(new TransactWriteItem
                {
                    Put = new Put
                    {
                        TableName = _pagosTable,
                        Item = PagoToItem(pagoConVenta),
                        ConditionExpression = "attribute_not_exists(IdVenta) AND attribute_not_exists(IdPago)"
                    }
                });
            }
        }

        // 🔹 Guardar movimientos extra si vienen
        if (movsExtra != null && movsExtra.Count > 0)
        {
            foreach (var m in movsExtra)
            {
                

                items.Add(new TransactWriteItem
                {
                    Put = new Put
                    {
                        TableName = _movimientosTable,
                        Item = MovimientoToItem(m),
                        ConditionExpression = "attribute_not_exists(IdProducto) AND attribute_not_exists(IdMovimiento)"
                    }
                });
            }
        }

        await ExecuteTransactInBatchesAsync(items, $"VENTA-REG-{venta.IdVenta}");
    }


    // ---------- ANULAR ----------
    public async Task AnularAsync(string idVenta, string? motivo)
    {
        // Cargar detalles existentes
        var detalles = await QueryDetallesAsync(idVenta);
        if (detalles.Count == 0)
        {
            // también validamos que la venta exista
            var venta = await GetVentaAsync(idVenta);
            if (venta is null) throw new InvalidOperationException($"Venta {idVenta} no existe.");
        }

        var items = new List<TransactWriteItem>();

        // Marcar venta anulada (idempotente)
        items.Add(new TransactWriteItem
        {
            Update = new Update
            {
                TableName = _ventasTable,
                Key = new() { ["IdVenta"] = new AttributeValue { S = idVenta } },
                UpdateExpression = "SET Estado = :an, CancelReason = :m, CanceledAt = :now",
                ConditionExpression = "attribute_exists(IdVenta) AND (attribute_not_exists(Estado) OR Estado <> :an)",
                ExpressionAttributeValues = new()
                {
                    [":an"]  = new AttributeValue { S = "ANULADA" },
                    [":m"]   = new AttributeValue { S = motivo ?? "" },
                    [":now"] = new AttributeValue { S = DateTime.UtcNow.ToString("o") }
                }
            }
        });

        // Reversa de stock por cada línea
        foreach (var d in detalles)
        {
            items.Add(UpdateStockItem(d.IdProducto, +d.Cantidad));
            var mov = new MovimientosInventario
            {
                IdMovimiento = Guid.NewGuid().ToString("N"),
                IdProducto = d.IdProducto,
                TipoMovimiento = "ENTRADA", // por anulación de venta
                Cantidad = d.Cantidad,
                FechaMovimiento = DateTime.UtcNow,
                Referencia = idVenta
            };

            items.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = _movimientosTable,
                    Item = MovimientoToItem(mov),
                    ConditionExpression = "attribute_not_exists(IdProducto) AND attribute_not_exists(IdMovimiento)"
                }
            });
        }


        await ExecuteTransactInBatchesAsync(items, $"VENTA-ANU-{idVenta}");
    }

    // ---------- ACTUALIZAR (cabecera) ----------
    public async Task ActualizarCabeceraAsync(Ventas venta)
    {
        // No cambia stock ni detalles; solo meta.
        var items = new List<TransactWriteItem>
        {
            new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = _ventasTable,
                    Key = new() { ["IdVenta"] = new AttributeValue{ S = venta.IdVenta } },
                    UpdateExpression = "SET ClienteId = :c, #F = :f, Total = :t",
                    ConditionExpression = "attribute_exists(IdVenta) AND (attribute_not_exists(Estado) OR Estado <> :an)",
                    ExpressionAttributeNames = new() { ["#F"] = "Fecha" },
                    ExpressionAttributeValues = new()
                    {
                        [":c"] = new AttributeValue{ S = venta.ClienteId },
                        [":f"] = new AttributeValue{ S = venta.Fecha.ToString(CultureInfo.InvariantCulture) },
                        [":t"] = new AttributeValue{ N = venta.Total.ToString(CultureInfo.InvariantCulture) },
                        [":an"] = new AttributeValue{ S = "ANULADA" }
                    }
                }
            }
        };

        await ExecuteTransactInBatchesAsync(items, $"VENTA-UPD-{venta.IdVenta}");
    }

    // ---------- REEMPLAZAR DETALLES (recalcula stock por delta) ----------
    public async Task ReemplazarDetallesAsync(string idVenta, IReadOnlyList<DetalleVenta> nuevosDetalles)
    {
        // 1) Obtener actuales
        var actuales = await QueryDetallesAsync(idVenta);

        // 2) Calcular delta por ProductoId
        var delta = new Dictionary<string, int>(); // + suma stock, - descuenta stock
        foreach (var d in actuales)
            delta[d.IdProducto] = (delta.TryGetValue(d.IdProducto, out var q) ? q : 0) + d.Cantidad; // devolver

        foreach (var d in nuevosDetalles)
            delta[d.IdProducto] = (delta.TryGetValue(d.IdProducto, out var q) ? q : 0) - d.Cantidad; // tomar

        var items = new List<TransactWriteItem>();

        // 3) Borrar detalles actuales
        foreach (var (pk, sk) in actuales.Select((d, i) => (PK(idVenta), SK(i + 1))))
        {
            items.Add(new TransactWriteItem
            {
                Delete = new Delete
                {
                    TableName = _detalleTable,
                    Key = new() { ["IdDetalleVenta"] = new AttributeValue{ S = pk }, ["SK"] = new AttributeValue{ S = sk } }
                }
            });
        }

        // 4) Poner nuevos detalles
        int linea = 1;
        foreach (var d in nuevosDetalles)
            items.Add(PutDetalleItem(idVenta, linea++, d));

        // 5) Aplicar deltas de stock (con chequeo cuando es negativo)
        foreach (var kv in delta)
        {
            var prodId = kv.Key;
            var q = kv.Value;
            if (q == 0) continue;
            items.Add(UpdateStockItem(prodId, q, withNonNegativeCheck: q < 0));
        }

        await ExecuteTransactInBatchesAsync(items, $"VENTA-REDET-{idVenta}");
    }

    // ---------- OBTENER ----------
    public async Task<(Ventas venta, List<DetalleVenta> detalles)?> ObtenerAsync(string idVenta)
    {
        var venta = await GetVentaAsync(idVenta);
        if (venta is null) return null;
        var dets = await QueryDetallesAsync(idVenta);
        return (venta, dets);
    }

    // ===== Helpers =====
    private Dictionary<string, AttributeValue> VentaToItem(Ventas v) => new()
    {
        ["IdVenta"]  = new AttributeValue{ S = v.IdVenta },
        ["ClienteId"]= new AttributeValue{ S = v.ClienteId },
        ["Fecha"]    = new AttributeValue{ S = v.Fecha.ToString(CultureInfo.InvariantCulture) },
        ["Total"]    = new AttributeValue{ N = v.Total.ToString(CultureInfo.InvariantCulture) },
        ["Estado"]   = new AttributeValue{ S = v.Estado }
    };

    private Dictionary<string, AttributeValue> MovimientoToItem(MovimientosInventario m) => new()
    {
        // Supuesto: PK = IdProducto, SK = IdMovimiento
        ["IdProducto"] = new AttributeValue { S = m.IdProducto },
        ["IdMovimiento"] = new AttributeValue { S = m.IdMovimiento },
        ["TipoMovimiento"] = new AttributeValue { S = m.TipoMovimiento },
        ["Cantidad"] = new AttributeValue { N = m.Cantidad.ToString(CultureInfo.InvariantCulture) },
        ["FechaMovimiento"] = new AttributeValue { S = m.FechaMovimiento.ToString("o") },
        ["Referencia"] = new AttributeValue { S = m.Referencia ?? string.Empty }
    };

    // *** NUEVO: Cuotas ***
    private Dictionary<string, AttributeValue> CuotaToItem(Cuotas c) => new()
    {
        // Supuesto: PK = IdVenta, SK = IdCuota
        ["IdVenta"] = new AttributeValue { S = c.IdVenta },
        ["IdCuotas"] = new AttributeValue { S = c.IdCuotas },
        ["FechaVencimiento"] = new AttributeValue { S = c.FechaVencimiento.ToString("o") },
        ["MontoCuota"] = new AttributeValue { N = c.MontoCuota.ToString(CultureInfo.InvariantCulture) },
        ["Estado"] = new AttributeValue { S = c.Estado }
    };

    // *** NUEVO: Pagos ***
    private Dictionary<string, AttributeValue> PagoToItem(PagosVenta p) => new()
    {
        // Supuesto: PK = IdVenta, SK = IdPago
        ["IdVenta"] = new AttributeValue { S = p.IdVenta },
        ["IdPago"] = new AttributeValue { S = p.IdPago },
        ["FechaPago"] = new AttributeValue { S = p.FechaPago.ToString("o") },
        ["Monto"] = new AttributeValue { N = p.Monto.ToString(CultureInfo.InvariantCulture) }
    };

    private TransactWriteItem PutDetalleItem(string idVenta, int linea, DetalleVenta d) =>
        new TransactWriteItem
        {
            Put = new Put
            {
                TableName = _detalleTable,
                Item = new()
                {
                    ["PK"] = new AttributeValue{ S = PK(idVenta) },
                    ["IdDetalleVenta"] = new AttributeValue {S = (d.IdDetalleVenta==null? Guid.NewGuid().ToString("N").Substring(0, 10) :d.IdDetalleVenta) },
                    ["IdProducto"] = new AttributeValue{ S = d.IdProducto },
                    ["IdVenta"] = new AttributeValue { S = d.IdVenta },
                    ["Cantidad"]   = new AttributeValue{ N = d.Cantidad.ToString(CultureInfo.InvariantCulture) },
                    ["PrecioUnitario"]     = new AttributeValue{ N = d.PrecioUnitario.ToString(CultureInfo.InvariantCulture) },
                    ["SubTotal"]   = new AttributeValue{ N = (d.PrecioUnitario * d.Cantidad).ToString(CultureInfo.InvariantCulture)}
                }
            }
        };

    private TransactWriteItem UpdateStockItem(string IdProducto, int delta, bool withNonNegativeCheck = false)
    {
        var values = new Dictionary<string, AttributeValue>
        {
            [":d"] = new AttributeValue { N = delta.ToString(CultureInfo.InvariantCulture) }
        };

        string updateExpr = "ADD Stock :d";
        string? condition = null;

        if (delta < 0 && withNonNegativeCheck)
        {
            values[":abs"] = new AttributeValue { N = Math.Abs(delta).ToString(CultureInfo.InvariantCulture) };

            // Validar que no quede negativo
            condition = "attribute_not_exists(Stock) OR Stock >= :abs";
        }

        return new TransactWriteItem
        {
            Update = new Update
            {
                TableName = _productosTable,
                Key = new()
                {
                    ["IdProducto"] = new AttributeValue { S = IdProducto }
                },
                UpdateExpression = updateExpr,
                ConditionExpression = condition,
                ExpressionAttributeValues = values
            }
        };
    }


    private async Task ExecuteTransactInBatchesAsync(List<TransactWriteItem> all, string tokenPrefix)
    {

        // DynamoDB permite 25 operaciones por transacción
        const int MaxOps = 25;
        int batch = 0;
        for (int i = 0; i < all.Count; i += MaxOps)
        {
            var slice = all.GetRange(i, Math.Min(MaxOps, all.Count - i));
            var req = new TransactWriteItemsRequest
            {
                ClientRequestToken = Guid.NewGuid().ToString(),//$"{tokenPrefix}-{++batch}",
                TransactItems = slice,
                
                
            };

            try
            {
                await _ddb.TransactWriteItemsAsync(req);
            }
            catch (TransactionCanceledException ex)
            {
                Console.WriteLine("Transacción cancelada");
                if (ex.CancellationReasons != null)
                {
                    for (int ii = 0; ii < ex.CancellationReasons.Count; ii++)
                    {
                        var r = ex.CancellationReasons[ii];
                        Console.WriteLine($"Op {ii}: Code={r.Code}, Message={r.Message}");
                    }
                }

                throw; // o maneja como quieras
            }
        }
    }

    private string PK(string idVenta) => $"VENTA#{idVenta}";
    private string SK(int linea) => $"DET#{linea:D3}";

    private async Task<Ventas?> GetVentaAsync(string idVenta)
    {
        var resp = await _ddb.GetItemAsync(_ventasTable, new()
        {
            ["IdVenta"] = new AttributeValue{ S = idVenta }
        });
        if (resp.Item == null || resp.Item.Count == 0) return null;

        return new Ventas
        {
            IdVenta = resp.Item["IdVenta"].S,
            ClienteId = resp.Item.TryGetValue("ClienteId", out var c) ? c.S : "",
            Fecha = DateTime.TryParse(resp.Item.TryGetValue("Fecha", out var f) ? f.S : null, out var dt) ? dt : DateTime.UtcNow,
            Total = decimal.Parse(resp.Item.TryGetValue("Total", out var t) ? t.N : "0"),
            Estado = resp.Item.TryGetValue("Estado", out var e) ? e.S : "ABIERTA"
        };
    }
    public async Task RegistrarPagoCuotasAsync(string idVenta, decimal montoPago)
    {
        if (string.IsNullOrWhiteSpace(idVenta))
            throw new ArgumentException("idVenta es obligatorio.", nameof(idVenta));

        if (montoPago <= 0)
            throw new InvalidOperationException("El monto del pago debe ser mayor que cero.");

        // 1) Obtener cuotas pendientes de esta venta
        var respCuotas = await _ddb.QueryAsync(new QueryRequest
        {
            TableName = _cuotasTable,
            KeyConditionExpression = "IdVenta = :v",
            ExpressionAttributeValues = new()
            {
                [":v"] = new AttributeValue { S = idVenta }
            }
        });

        var cuotasPendientes = respCuotas.Items
            .Select(it => new Cuotas
            {
                IdCuotas = it["IdCuotas"].S,
                IdVenta = it["IdVenta"].S,
                FechaVencimiento = DateTime.Parse(it["FechaVencimiento"].S, null, DateTimeStyles.RoundtripKind),
                MontoCuota = decimal.Parse(it["MontoCuota"].N, CultureInfo.InvariantCulture),
                Estado = it["Estado"].S
            })
            .Where(c => c.Estado == "PENDIENTE")
            .OrderBy(c => c.FechaVencimiento)
            .ToList();

        if (cuotasPendientes.Count == 0)
            throw new InvalidOperationException("La venta no tiene cuotas pendientes.");

        decimal montoRestante = montoPago;
        var items = new List<TransactWriteItem>();

        // 2) Registrar el pago global en la tabla Pagos
        var pago = new PagosVenta
        {
            IdPago = Guid.NewGuid().ToString("N"),
            IdVenta = idVenta,
            FechaPago = DateTime.UtcNow,
            Monto = montoPago
        };

        items.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = _pagosTable,
                Item = PagoToItem(pago),
                ConditionExpression = "attribute_not_exists(IdVenta) AND attribute_not_exists(IdPago)"
            }
        });

        // 3) Recorrer cuotas en orden y marcar como PAGADA mientras alcance el monto
        bool todasCuotasCanceladas = true;

        foreach (var c in cuotasPendientes)
        {
            if (montoRestante < c.MontoCuota)
            {
                // No alcanza para esta cuota -> dejamos como pendiente
                todasCuotasCanceladas = false;
                break;
            }

            montoRestante -= c.MontoCuota;

            items.Add(new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = _cuotasTable,
                    Key = new()
                    {
                        ["IdVenta"] = new AttributeValue { S = idVenta },
                        ["IdCuotas"] = new AttributeValue { S = c.IdCuotas }
                    },
                    UpdateExpression = "SET Estado = :pag",
                    ConditionExpression = "Estado = :pend",
                    ExpressionAttributeValues = new()
                    {
                        [":pag"] = new AttributeValue { S = "PAGADA" },
                        [":pend"] = new AttributeValue { S = "PENDIENTE" }
                    }
                }
            });
        }

        // 4) Si NO se pagaron todas las pendientes, la venta sigue ABIERTA
        //    Si se pagaron todas las pendientes, cerramos la venta
        if (todasCuotasCanceladas && cuotasPendientes.Count > 0)
        {
            items.Add(new TransactWriteItem
            {
                Update = new Update
                {
                    TableName = _ventasTable,
                    Key = new()
                    {
                        ["IdVenta"] = new AttributeValue { S = idVenta }
                    },
                    UpdateExpression = "SET Estado = :cerrada",
                    ExpressionAttributeValues = new()
                    {
                        [":cerrada"] = new AttributeValue { S = "CERRADA" }
                    }
                }
            });
        }

        await ExecuteTransactInBatchesAsync(items, $"VENTA-PAGO-{idVenta}");
    }


    private async Task<List<DetalleVenta>> QueryDetallesAsync(string idVenta)
    {
        var q = await _ddb.QueryAsync(new QueryRequest
        {
            TableName = _detalleTable,
            KeyConditionExpression = "IdVenta = :pk",
            ExpressionAttributeValues = new() { [":pk"] = new AttributeValue{ S = idVenta } }
        });

        return q.Items.Select(it => new DetalleVenta
        {
            IdProducto = it["IdProducto"].S,
            Cantidad = int.Parse(it["Cantidad"].N),
            PrecioUnitario = decimal.Parse(it["PrecioUnitario"].N)
        }).ToList();
    }

    /*--------------------------------------------------*/
    // *** NUEVO: registrar solo cuotas de una venta (sin tocar stock ni venta) ***
    public async Task RegistrarCuotasAsync(string idVenta, IReadOnlyList<Cuotas> cuotas)
    {
        var items = new List<TransactWriteItem>();

        foreach (var c in cuotas)
        {
            var cuotaConVenta = new Cuotas(c) { IdVenta = idVenta };

            items.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = _cuotasTable,
                    Item = CuotaToItem(cuotaConVenta),
                    ConditionExpression = "attribute_not_exists(IdVenta) AND attribute_not_exists(IdCuotas)"
                }
            });
        }

        await ExecuteTransactInBatchesAsync(items, $"CUOTAS-REG-{idVenta}");
    }

    // *** NUEVO: obtener cuotas por venta ***
    public async Task<List<Cuotas>> ObtenerCuotasPorVentaAsync(string idVenta)
    {
        var resp = await _ddb.QueryAsync(new QueryRequest
        {
            TableName = _cuotasTable,
            KeyConditionExpression = "IdVenta = :v",
            ExpressionAttributeValues = new()
            {
                [":v"] = new AttributeValue { S = idVenta }
            }
        });

        var list = new List<Cuotas>();
        foreach (var it in resp.Items)
        {
            list.Add(new Cuotas
            {
                IdCuotas = it["IdCuotas"].S,
                IdVenta = it["IdVenta"].S,
                FechaVencimiento = DateTime.Parse(it["FechaVencimiento"].S, null, DateTimeStyles.RoundtripKind),
                MontoCuota = decimal.Parse(it["MontoCuota"].N, CultureInfo.InvariantCulture),
                Estado = it["Estado"].S
            });
        }

        return list;
    }
    // *** NUEVO: registrar un pago (útil para abonos posteriores) ***
    public async Task RegistrarPagoAsync(PagosVenta pago)
    {
        var items = new List<TransactWriteItem>
        {
            new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = _pagosTable,
                    Item = PagoToItem(pago),
                    ConditionExpression = "attribute_not_exists(IdVenta) AND attribute_not_exists(IdPago)"
                }
            }
        };

        await ExecuteTransactInBatchesAsync(items, $"PAGO-REG-{pago.IdVenta}");
    }

    // *** NUEVO: registrar múltiples pagos en batch ***
    public async Task RegistrarPagosAsync(IReadOnlyList<PagosVenta> pagos)
    {
        var items = new List<TransactWriteItem>();

        foreach (var p in pagos)
        {
            items.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = _pagosTable,
                    Item = PagoToItem(p),
                    ConditionExpression = "attribute_not_exists(IdVenta) AND attribute_not_exists(IdPago)"
                }
            });
        }

        var token = pagos.Count > 0 ? pagos[0].IdVenta : "PAGOS";
        await ExecuteTransactInBatchesAsync(items, $"PAGOS-REG-{token}");
    }

    // *** NUEVO: obtener pagos realizados a una venta ***
    public async Task<List<PagosVenta>> ObtenerPagosPorVentaAsync(string idVenta)
    {
        var resp = await _ddb.QueryAsync(new QueryRequest
        {
            TableName = _pagosTable,
            KeyConditionExpression = "IdVenta = :v",
            ExpressionAttributeValues = new()
            {
                [":v"] = new AttributeValue { S = idVenta }
            }
        });

        var list = new List<PagosVenta>();
        foreach (var it in resp.Items)
        {
            list.Add(new PagosVenta
            {
                IdPago = it["IdPago"].S,
                IdVenta = it["IdVenta"].S,
                FechaPago = DateTime.Parse(it["FechaPago"].S, null, DateTimeStyles.RoundtripKind),
                Monto = decimal.Parse(it["Monto"].N, CultureInfo.InvariantCulture)
            });
        }

        return list;
    }

    // *** NUEVO: obtener movimientos por producto ***
    public async Task<List<MovimientosInventario>> ObtenerMovimientosPorProductoAsync(string idProducto)
    {
        var resp = await _ddb.QueryAsync(new QueryRequest
        {
            TableName = _movimientosTable,
            KeyConditionExpression = "IdProducto = :p",
            ExpressionAttributeValues = new()
            {
                [":p"] = new AttributeValue { S = idProducto }
            }
        });

        var list = new List<MovimientosInventario>();
        foreach (var it in resp.Items)
        {
            list.Add(new MovimientosInventario
            {
                IdMovimiento = it["IdMovimiento"].S,
                IdProducto = it["IdProducto"].S,
                TipoMovimiento = it["TipoMovimiento"].S,
                Cantidad = int.Parse(it["Cantidad"].N, CultureInfo.InvariantCulture),
                FechaMovimiento = DateTime.Parse(it["FechaMovimiento"].S, null, DateTimeStyles.RoundtripKind),
                Referencia = it.TryGetValue("Referencia", out var r) ? r.S : null
            });
        }

        return list;
    }

}