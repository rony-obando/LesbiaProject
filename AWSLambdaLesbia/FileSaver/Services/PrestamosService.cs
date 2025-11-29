using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Entities;
using Interfaces;
using System.Globalization;


public class PrestamosService : IPrestamosService
{
    private readonly IAmazonDynamoDB _dynamoDb;

    private const string PrestamosTable = "Prestamos";
    private const string CuotasPrestamoTable = "CuotaPrestamo";
    private const string PagosPrestamosTable = "PagosPrestamo";
    private const string AmpliacionesPrestamoTable = "AmpliacionesPrestamo";

    public PrestamosService(IAmazonDynamoDB dynamoDb)
    {
        _dynamoDb = dynamoDb;
    }
    public async Task<List<ResumenPDto>> ObtenerPrestamosConResumenAsync()
    {
        var res = await _dynamoDb.ScanAsync(new ScanRequest
        {
            TableName = PrestamosTable
        });

        var lista = new List<ResumenPDto>();

        foreach (var item in res.Items)
        {
            var prestamo = ItemToPrestamo(item);

            // Reutilizamos tu helper de cuotas
            var cuotas = await ObtenerCuotasPorPrestamoAsync(prestamo.IdPrestamo);

            int totalCuotas = cuotas.Count;
            int cuotasPagadas = cuotas.Count(c => c.Estado == "Pagada");
            decimal saldoPendiente = cuotas
                .Where(c => c.Estado != "Pagada")
                .Sum(c => c.MontoCuota);

            lista.Add(new ResumenPDto
            {
                IdPrestamo = prestamo.IdPrestamo,
                IdCliente = prestamo.IdCliente,
                Capital = prestamo.Capital,
                Estado = prestamo.Estado,
                TotalCuotas = totalCuotas,
                CuotasPagadas = cuotasPagadas,
                SaldoPendiente = saldoPendiente
            });
        }

        return lista;
    }


    // ===========================
    // 1) CREAR PRÉSTAMO + CUOTAS
    // ===========================
    public async Task CrearPrestamoConCuotasAsync(
        Prestamos prestamo,
        IEnumerable<CuotaPrestamo> cuotas)
    {
        if (prestamo == null) throw new ArgumentNullException(nameof(prestamo));
        if (string.IsNullOrWhiteSpace(prestamo.IdPrestamo))
            throw new ArgumentException("IdPrestamo es obligatorio.", nameof(prestamo));

        if (cuotas == null || !cuotas.Any())
            throw new ArgumentException("Debe enviar al menos una cuota.", nameof(cuotas));

        var items = new List<TransactWriteItem>();

        // 1) PUT del préstamo (evita sobrescribir si ya existe)
        //var prestamoItem = prestamo.ToAttributeMap(); // usa tu mapper
        items.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = PrestamosTable,
                Item = PrestamoToItem(prestamo),
                ConditionExpression = "attribute_not_exists(PrestamoId)"
            }
        });

        // 2) PUT de las cuotas
        foreach (var cuota in cuotas)
        {
            cuota.IdPrestamo = prestamo.IdPrestamo;
            if (string.IsNullOrWhiteSpace(cuota.Estado))
                cuota.Estado = "Pendiente";

            //var cuotaItem = cuota.ToAttributeMap();

            items.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = CuotasPrestamoTable,
                    Item = CuotaToItem(cuota),
                }
            });
        }

        var request = new TransactWriteItemsRequest
        {
            TransactItems = items
        };

        await _dynamoDb.TransactWriteItemsAsync(request);
    }

    // ===========================
    // 2) REGISTRAR PAGO + ACTUALIZAR CUOTAS
    // ===========================
    public async Task RegistrarPagoAsync(PagosPrestamo pago)
    {

        if (pago == null) throw new ArgumentNullException(nameof(pago));
        if (string.IsNullOrWhiteSpace(pago.IdPrestamo))
            throw new ArgumentException("IdPrestamo es obligatorio.", nameof(pago));

        // 1) Leer cuotas pendientes primero (fuera de la transacción)
        var cuotasPendientes = await ObtenerCuotasPendientesAsync(pago.IdPrestamo);

        var cuotasOrdenadas = cuotasPendientes
            .OrderBy(c => c.FechaVencimiento)
            .ToList();

        if (!cuotasOrdenadas.Any())
            throw new InvalidOperationException("El préstamo no tiene cuotas pendientes.");

        decimal montoRestante = pago.Monto;

        if (montoRestante <= 0)
            throw new InvalidOperationException("El monto del pago debe ser mayor que cero.");

        var transactItems = new List<TransactWriteItem>();

        // a) Insertar el pago
        transactItems.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = PagosPrestamosTable,
                Item = PagosToItem(pago)
            }
        });

        // b) Aplicar el pago sobre cuotas completas
        foreach (var cuota in cuotasOrdenadas)
        {
            if (montoRestante <= 0)
                break;

            if (montoRestante >= cuota.MontoCuota)
            {
                // ✅ Descontás la cuota completa del monto
                montoRestante -= cuota.MontoCuota;

                var key = new Dictionary<string, AttributeValue>
                {
                    ["IdPrestamo"] = new AttributeValue { S = cuota.IdPrestamo },
                    ["IdCuotaPrestamo"] = new AttributeValue { S = cuota.IdCuotaPrestamo }
                };

                transactItems.Add(new TransactWriteItem
                {
                    Update = new Update
                    {
                        TableName = CuotasPrestamoTable,
                        Key = key,
                        UpdateExpression = "SET #estado = :pagada",
                        ConditionExpression = "#estado = :pendiente",
                        ExpressionAttributeNames = new Dictionary<string, string>
                        {
                            ["#estado"] = "Estado"
                        },
                        ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                        {
                            [":pagada"] = new AttributeValue { S = "Pagada" },
                            [":pendiente"] = new AttributeValue { S = "Pendiente" }
                        }
                    }
                });
            }
            else
            {
                // ya no alcanza para otra cuota completa
                break;
            }
        }

        // 👇 Solo si NO se pagó ninguna cuota (transactItems tiene solo el PUT del pago)
        if (transactItems.Count == 1)
        {
            throw new InvalidOperationException(
                "El monto del pago no alcanza para cubrir ninguna cuota completa."
            );
        }

        // 🔹 OJO: ya NO revisamos montoRestante > 0, ese 'resto' simplemente no se usa
        var request = new TransactWriteItemsRequest
        {
            TransactItems = transactItems
        };

       // await _dynamoDb.TransactWriteItemsAsync(request);
        try
        {
            await _dynamoDb.TransactWriteItemsAsync(request);
        }
        catch (TransactionCanceledException ex)
        {
            if (ex.CancellationReasons != null)
            {
                for (int i = 0; i < ex.CancellationReasons.Count; i++)
                {
                    var r = ex.CancellationReasons[i];
                    Console.WriteLine($"Item #{i} -> Code={r.Code}, Message={r.Message}");
                }
            }

            throw;
        }
        // Si después del pago todas las cuotas quedan pagadas, marcamos el préstamo como Pagado
        var cuotasActualizadas = await ObtenerCuotasPorPrestamoAsync(pago.IdPrestamo);
        if (cuotasActualizadas.All(c => c.Estado == "Pagada"))
        {
            var getPrestamo = await _dynamoDb.GetItemAsync(new GetItemRequest
            {
                TableName = PrestamosTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    ["IdPrestamo"] = new AttributeValue { S = pago.IdPrestamo }
                }
            });

            if (getPrestamo.Item != null && getPrestamo.Item.Count > 0)
            {
                getPrestamo.Item["Estado"] = new AttributeValue { S = "Pagado" };
                await _dynamoDb.PutItemAsync(new PutItemRequest
                {
                    TableName = PrestamosTable,
                    Item = getPrestamo.Item
                });
            }
        }



    }
    private Prestamos ItemToPrestamo(Dictionary<string, AttributeValue> item)
    {
        return new Prestamos
        {
            IdPrestamo = item["IdPrestamo"].S,
            IdCliente =  item.ContainsKey("ClienteId")? item["ClienteId"].S : item["IdCliente"].S,
            Fecha = DateTime.Parse(item["Fecha"].S, CultureInfo.InvariantCulture),
            Capital = decimal.Parse(item["Capital"].N, CultureInfo.InvariantCulture),
            TasaInteres = decimal.Parse(item["TasaInteres"].N, CultureInfo.InvariantCulture),
            FrecuenciaPago = item["FrecuenciaPago"].S,
            Estado = item["Estado"].S
        };
    }
    private Dictionary<string, AttributeValue> PagosToItem(PagosPrestamo p) => new()
    {
        ["IdPagoPrestamo"] = new AttributeValue { S = p.IdPagoPrestamo },        // PK de la tabla PagosPrestamo
        ["IdPrestamo"] = new AttributeValue { S = p.IdPrestamo },            // FK al préstamo
        ["FechaPago"] = new AttributeValue { S = p.FechaPago.ToString(CultureInfo.InvariantCulture) },
        ["Monto"] = new AttributeValue { N = p.Monto.ToString(CultureInfo.InvariantCulture) },
    };
    public async Task<ResumenPDto> ObtenerPrestamoAsync(string prestamoId)
    {
        if (string.IsNullOrWhiteSpace(prestamoId))
            throw new ArgumentException("PrestamoId es obligatorio.", nameof(prestamoId));

        // 1) Obtener préstamo
        var getPrestamo = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = PrestamosTable,
            Key = new Dictionary<string, AttributeValue>
            {
                ["IdPrestamo"] = new AttributeValue { S = prestamoId }
            }
        });

        if (getPrestamo.Item == null || getPrestamo.Item.Count == 0)
            throw new InvalidOperationException("Préstamo no encontrado.");

        var prestamo = ItemToPrestamo(getPrestamo.Item);

        // 2) Obtener cuotas
        var cuotas = await ObtenerCuotasPorPrestamoAsync(prestamoId);

        int totalCuotas = cuotas.Count;
        int cuotasPagadas = cuotas.Count(c => c.Estado == "Pagada");
        decimal saldoPendiente = cuotas
            .Where(c => c.Estado != "Pagada")
            .Sum(c => c.MontoCuota);

        var resumen = new ResumenPDto
        {
            IdPrestamo = prestamo.IdPrestamo,
            IdCliente = prestamo.IdCliente,
            Capital = prestamo.Capital,
            Estado = prestamo.Estado,
            TotalCuotas = totalCuotas,
            CuotasPagadas = cuotasPagadas,
            SaldoPendiente = saldoPendiente,
            Cuotas = cuotas
        };

        return resumen;
    }


    // ===========================
    // 3) REGISTRAR AMPLIACIÓN + NUEVAS CUOTAS
    // ===========================
    public async Task RegistrarAmpliacionAsync(RegistrarAmpliacionDTO dto)
    {
        if (dto == null) throw new ArgumentNullException(nameof(dto));
        if (string.IsNullOrWhiteSpace(dto.IdPrestamo))
            throw new ArgumentException("PrestamoId es obligatorio.", nameof(dto.IdPrestamo));
        if (dto.MontoAdicional <= 0)
            throw new ArgumentException("MontoAdicional debe ser mayor que cero.", nameof(dto.MontoAdicional));
        if (dto.NuevasCuotas <= 0)
            throw new ArgumentException("NuevasCuotas debe ser mayor que cero.", nameof(dto.NuevasCuotas));

        // 1) Obtener el préstamo actual
        var getPrestamo = await _dynamoDb.GetItemAsync(new GetItemRequest
        {
            TableName = PrestamosTable,
            Key = new Dictionary<string, AttributeValue>
            {
                ["IdPrestamo"] = new AttributeValue { S = dto.IdPrestamo }
            }
        });

        if (getPrestamo.Item == null || getPrestamo.Item.Count == 0)
            throw new InvalidOperationException("Préstamo no encontrado.");

        var prestamo = ItemToPrestamo(getPrestamo.Item);

        if (prestamo.Estado == "Pagado")
            throw new InvalidOperationException("No se puede ampliar un préstamo ya pagado.");

        // 2) Tomar tasa y frecuencia (del DTO o del préstamo original)
        var tasa = dto.TasaInteres ?? prestamo.TasaInteres;
        var frecuencia = dto.FrecuenciaPago ?? prestamo.FrecuenciaPago;

        // 3) Calcular interés y nuevas cuotas
        decimal interesAmpliacion = dto.MontoAdicional * (tasa / 100m);
        decimal totalAmpliacion = dto.MontoAdicional + interesAmpliacion;
        decimal montoCuotaNueva = Math.Round(totalAmpliacion / dto.NuevasCuotas, 2);

        // 4) Obtener la última fecha de vencimiento actual
        var cuotasExistentes = await ObtenerCuotasPorPrestamoAsync(dto.IdPrestamo);
        DateTime fechaBase;

        if (cuotasExistentes.Any())
        {
            fechaBase = cuotasExistentes.Max(c => c.FechaVencimiento);
        }
        else
        {
            // Si no hubiera cuotas (caso raro), empezamos desde la fecha de ampliación
            fechaBase = dto.FechaAmpliacion;
        }

        // 5) Generar nuevas cuotas
        var nuevasCuotas = new List<CuotaPrestamo>();
        for (int i = 0; i < dto.NuevasCuotas; i++)
        {
            var fechaVenc = CalcularProximaFecha(fechaBase, frecuencia, i + 1);

            nuevasCuotas.Add(new CuotaPrestamo
            {
                IdPrestamo = prestamo.IdPrestamo,
                IdCuotaPrestamo = $"{prestamo.IdPrestamo}-A-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{i + 1}",
                FechaVencimiento = fechaVenc,
                MontoCuota = montoCuotaNueva,
                Estado = "Pendiente"
            });
        }

        // 6) Crear registro de ampliación
        var ampliacion = new AmpliacionesPrestamo
        {
            IdPrestamo = prestamo.IdPrestamo,
            IdAmpliacion = $"AMP-{Guid.NewGuid()}",
            FechaAmpliacion = dto.FechaAmpliacion,
            MontoAdicional = dto.MontoAdicional
        };

        var items = new List<TransactWriteItem>();

        // a) Actualizar capital del préstamo
        items.Add(new TransactWriteItem
        {
            Update = new Update
            {
                TableName = PrestamosTable,
                Key = new Dictionary<string, AttributeValue>
                {
                    ["IdPrestamo"] = new AttributeValue { S = prestamo.IdPrestamo }
                },
                UpdateExpression = "SET Capital = Capital + :montoAdd",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":montoAdd"] = new AttributeValue
                    {
                        N = dto.MontoAdicional.ToString(CultureInfo.InvariantCulture)
                    }
                }
            }
        });

        // b) Guardar la ampliación
        items.Add(new TransactWriteItem
        {
            Put = new Put
            {
                TableName = AmpliacionesPrestamoTable,
                Item = AmpliacionToItem(ampliacion)
            }
        });

        // c) Guardar las nuevas cuotas
        foreach (var cuota in nuevasCuotas)
        {
            items.Add(new TransactWriteItem
            {
                Put = new Put
                {
                    TableName = CuotasPrestamoTable,
                    Item = CuotaToItem(cuota)
                }
            });
        }

        var request = new TransactWriteItemsRequest
        {
            TransactItems = items
        };

        await _dynamoDb.TransactWriteItemsAsync(request);
    }
    private DateTime CalcularProximaFecha(DateTime baseDate, string frecuencia, int steps)
    {
        var fecha = baseDate;

        switch (frecuencia)
        {
            case "Semanal":
                fecha = fecha.AddDays(7 * steps);
                break;
            case "Quincenal":
                fecha = fecha.AddDays(15 * steps);
                break;
            case "Mensual":
            default:
                fecha = fecha.AddMonths(steps);
                break;
        }

        return fecha;
    }


    // ===========================
    // 4) OBTENER RESUMEN PRÉSTAMO
    // ===========================
    public async Task<ResumenPrestamoDto> ObtenerResumenPrestamoAsync(string prestamoId)
    {
        if (string.IsNullOrWhiteSpace(prestamoId))
            throw new ArgumentException("PrestamoId es obligatorio.", nameof(prestamoId));

        // Aquí uso queries simples. Si ya tenés repositorios para cada tabla, podés delegar.
        var cuotas = await ObtenerCuotasPorPrestamoAsync(prestamoId);
        var pagos = await ObtenerPagosPorPrestamoAsync(prestamoId);
        var ampliaciones = await ObtenerAmpliacionesPorPrestamoAsync(prestamoId);

        return new ResumenPrestamoDto
        {
            PrestamoId = prestamoId,
            Cuotas = cuotas,
            Pagos = pagos,
            Ampliaciones = ampliaciones
        };
    }

    //Helpers//
    private Dictionary<string, AttributeValue> PrestamoToItem(Prestamos p) => new()
    {
        ["IdPrestamo"] = new AttributeValue { S = p.IdPrestamo},
        ["ClienteId"] = new AttributeValue { S = p.IdCliente },
        ["Fecha"] = new AttributeValue { S = p.Fecha.ToString(CultureInfo.InvariantCulture) },
        ["Capital"] = new AttributeValue { N = p.Capital.ToString(CultureInfo.InvariantCulture) },
        ["TasaInteres"] = new AttributeValue { N = p.TasaInteres.ToString(CultureInfo.InvariantCulture) },
        ["FrecuenciaPago"] = new AttributeValue { S = p.FrecuenciaPago},
        ["Estado"] = new AttributeValue { S = p.Estado.ToString(CultureInfo.InvariantCulture) }
    };
    private Dictionary<string, AttributeValue> AmpliacionToItem(AmpliacionesPrestamo a) => new()
    {
        ["IdPrestamo"] = new AttributeValue { S = a.IdPrestamo },
        ["IdAmpliacion"] = new AttributeValue { S = a.IdAmpliacion },
        ["FechaAmpliacion"] = new AttributeValue { S = a.FechaAmpliacion.ToString(CultureInfo.InvariantCulture) },
        ["MontoAdicional"] = new AttributeValue { N = a.MontoAdicional.ToString(CultureInfo.InvariantCulture) },

    };
    private Dictionary<string, AttributeValue> CuotaToItem(CuotaPrestamo c) => new()
    {
        ["IdPrestamo"] = new AttributeValue { S = c.IdPrestamo },
        ["IdCuotaPrestamo"] = new AttributeValue { S = c.IdCuotaPrestamo },
        ["FechaVencimiento"] = new AttributeValue { S = c.FechaVencimiento.ToString(CultureInfo.InvariantCulture) },
        ["MontoCuota"] = new AttributeValue { N = c.MontoCuota.ToString(CultureInfo.InvariantCulture) },
        ["Estado"] = new AttributeValue { S = c.Estado },

    };


    // ===========================
    // MÉTODOS PRIVADOS DE APOYO
    // (puedes reemplazarlos por tus repositorios)
    // ===========================
    private async Task<List<CuotaPrestamo>> ObtenerCuotasPendientesAsync(string prestamoId)
    {
        var request = new QueryRequest
        {
            TableName = CuotasPrestamoTable,
            KeyConditionExpression = "IdPrestamo = :p",
            FilterExpression = "Estado = :pendiente",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":p"] = new AttributeValue { S = prestamoId },
                [":pendiente"] = new AttributeValue { S = "Pendiente" }
            }
        };

        var response = await _dynamoDb.QueryAsync(request);

        var result = new List<CuotaPrestamo>();

        foreach (var item in response.Items)
        {
            result.Add(new CuotaPrestamo
            {
                IdPrestamo = item["IdPrestamo"].S,
                IdCuotaPrestamo = item["IdCuotaPrestamo"].S,
                FechaVencimiento = DateTime.Parse(item["FechaVencimiento"].S, CultureInfo.InvariantCulture),
                MontoCuota = decimal.Parse(item["MontoCuota"].N, CultureInfo.InvariantCulture),
                Estado = item["Estado"].S
            });
        }

        return result;
    }


    private async Task<List<CuotaPrestamo>> ObtenerCuotasPorPrestamoAsync(string prestamoId)
    {
        var request = new QueryRequest
        {
            TableName = CuotasPrestamoTable,
            KeyConditionExpression = "IdPrestamo = :p",
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                [":p"] = new AttributeValue { S = prestamoId }
            }
        };

        var response = await _dynamoDb.QueryAsync(request);

        var result = new List<CuotaPrestamo>();

        foreach (var item in response.Items)
        {
            result.Add(new CuotaPrestamo
            {
                IdPrestamo = item["IdPrestamo"].S,
                IdCuotaPrestamo = item["IdCuotaPrestamo"].S,
                FechaVencimiento = DateTime.Parse(item["FechaVencimiento"].S, CultureInfo.InvariantCulture),
                MontoCuota = decimal.Parse(item["MontoCuota"].N, CultureInfo.InvariantCulture),
                Estado = item["Estado"].S
            });
        }

        return result;
    }


    private async Task<List<PagosPrestamo>> ObtenerPagosPorPrestamoAsync(string prestamoId)
    {
        // Query a PagosPrestamos por PrestamoId
        throw new NotImplementedException();
    }

    private async Task<List<AmpliacionesPrestamo>> ObtenerAmpliacionesPorPrestamoAsync(string prestamoId)
    {
        // Query a AmpliacionesPrestamo por PrestamoId
        throw new NotImplementedException();
    }
}
