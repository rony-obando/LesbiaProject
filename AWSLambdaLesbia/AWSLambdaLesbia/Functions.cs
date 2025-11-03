// Function.cs
using Amazon.DynamoDBv2;
using Amazon.Lambda.Core;
using Entities;
using Infraestructure;
using Interfaces;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace AWSLambdaLesbia;

public class Functions
{
    private static readonly IServiceProvider Services = BuildServices();

    private readonly IProductosRepository _productosRepo;
    private readonly IVentaRepository _ventaRepository;
    private readonly IClientesRepository _clientesRepository;
    // Ejemplo: agrega otros repos conforme crezcan tus entidades
    // private readonly IClientesRepository _clientesRepo;

    public Functions()
    {
        _productosRepo = Services.GetRequiredService<IProductosRepository>();
        _ventaRepository = Services.GetRequiredService<IVentaRepository>();
        _clientesRepository = Services.GetRequiredService<IClientesRepository>();
    }

    public record AppRequest(string Action, JsonElement Payload);
    public record GetDto(string Id);

    public async Task<object> ProductosFunction(JsonElement input, ILambdaContext ctx)
    {
        if (input.TryGetProperty("body", out var bodyElement) && bodyElement.ValueKind == JsonValueKind.String)
        {
            var bodyString = bodyElement.GetString();

            var req = JsonSerializer.Deserialize<AppRequest>(bodyString!);
            switch (req!.Action)
            {
                case "Productos.Save":
                    var p = req.Payload.Deserialize<Productos>();
                    if (p == null)
                    {
                        throw new ArgumentNullException("Producto no válido");
                    }
                    await _productosRepo.SaveProducto(p!, CancellationToken.None);
                    return new { ok = true, p.IdProducto };

                case "Productos.GetById":
                    var get = req.Payload.Deserialize<GetDto>();
                    var producto = await _productosRepo.GetbyIdProducto(get.Id, CancellationToken.None);
                    return producto is null ? new { ok = false, error = "NOT_FOUND" } : new { ok = true, producto };

                case "Productos.Delete":
                    var getdelete = req.Payload.Deserialize<GetDto>();
                    await _productosRepo.DeleteProducto(getdelete.Id, CancellationToken.None);
                    return new { ok = true };

                case "Productos.GetAll":
                    var prds = await _productosRepo.GetAllProducts(CancellationToken.None);
                    return new { ok = true, prds };

                default:
                    return new { ok = false, error = $"Unknown action '{req.Action}'" };
            }
        }
        else
        {
            throw new ArgumentException("No se encontró la propiedad 'body'");
        }
       
    }
    public async Task<object> VentasFunction(JsonElement input, ILambdaContext ctx)
    {
        if (input.TryGetProperty("body", out var bodyElement) && bodyElement.ValueKind == JsonValueKind.String)
        {
            var bodyString = bodyElement.GetString();

            var req = JsonSerializer.Deserialize<AppRequest>(bodyString!);
            switch (req!.Action)
            {
                case "Ventas.Save":
                    var v = req.Payload.Deserialize<Ventas>();
                    if (v == null)
                    {
                        throw new ArgumentNullException("Venta no válido");
                    }
                    await _ventaRepository.SaveAsync(v!, CancellationToken.None);
                    return new { ok = true, v.IdVenta };

                case "Ventas.GetById":
                    var get = req.Payload.Deserialize<GetDto>();
                    var venta = await _ventaRepository.GetByIdAsync(get.Id, CancellationToken.None);
                    return venta is null ? new { ok = false, error = "NOT_FOUND" } : new { ok = true, venta };

                case "Ventas.Delete":
                    var getdelete = req.Payload.Deserialize<GetDto>();
                    await _ventaRepository.DeleteAsync(getdelete.Id, CancellationToken.None);
                    return new { ok = true };

                case "Ventas.GetAll":
                    var vnts = await _ventaRepository.GetAllVentas(CancellationToken.None);
                    return new { ok = true, vnts };

                default:
                    return new { ok = false, error = $"Unknown action '{req.Action}'" };
            }
        }
        else
        {
            throw new ArgumentException("No se encontró la propiedad 'body'");
        }

    }
    public async Task<object> ClientesFunctions(JsonElement input, ILambdaContext ctx)
    {
        if (input.TryGetProperty("body", out var bodyElement) && bodyElement.ValueKind == JsonValueKind.String)
        {
            var bodyString = bodyElement.GetString();

            var req = JsonSerializer.Deserialize<AppRequest>(bodyString!);
            switch (req!.Action)
            {
                case "Clientes.Save":
                    var c = req.Payload.Deserialize<Clientes>();
                    if (c == null)
                    {
                        throw new ArgumentNullException("Cliente no válido");
                    }
                    await _clientesRepository.SaveCliente(c!, CancellationToken.None);
                    return new { ok = true, c.IdCliente };

                case "Clientes.GetById":
                    var get = req.Payload.Deserialize<GetDto>();
                    var venta = await _clientesRepository.GetbyIdCliente(get.Id, CancellationToken.None);
                    return venta is null ? new { ok = false, error = "NOT_FOUND" } : new { ok = true, venta };

                case "Clientes.Delete":
                    var getdelete = req.Payload.Deserialize<GetDto>();
                    await _clientesRepository.DeleteCliente(getdelete.Id, CancellationToken.None);
                    return new { ok = true };

                case "Clientes.GetAll":
                    var clientes = await _clientesRepository.GetAllClientes(CancellationToken.None);
                    return new { ok = true, clientes };

                default:
                    return new { ok = false, error = $"Unknown action '{req.Action}'" };
            }
        }
        else
        {
            throw new ArgumentException("No se encontró la propiedad 'body'");
        }

    }

    private static IServiceProvider BuildServices()
    {
        var services = new ServiceCollection();

        var region = Environment.GetEnvironmentVariable("AWS_REGION") ?? "us-east-2";
        var ddb = new AmazonDynamoDBClient(Amazon.RegionEndpoint.GetBySystemName(region));
        services.AddSingleton<IAmazonDynamoDB>(ddb);

        var productosTable = Environment.GetEnvironmentVariable("PRODUCTOS_TABLE") ?? "Productos";
        services.AddSingleton<IProductosRepository>(sp => new DynamoDbProductosRepository(ddb, productosTable));

         var clientesTable = Environment.GetEnvironmentVariable("CLIENTES_TABLE") ?? "Clientes";
         services.AddSingleton<IClientesRepository>(sp => new DynamoDbClientesRepository(ddb, clientesTable));

        var ventasTable = Environment.GetEnvironmentVariable("VENTAS_TABLE") ?? "Ventas";
        services.AddSingleton<IVentaRepository>(sp => new DynamoDbVentaRepository(ddb, ventasTable));



        return services.BuildServiceProvider();
    }
}