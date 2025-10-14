using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.Core;
using Entities;
using Infraestructure;
using Interfaces;
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

// Permite que la Lambda reciba/mande JSON directamente (sin API Gateway)
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace AWSLambdaLesbia
{
    public class Function
    {
        private readonly IVentaRepository _repo;

        public Function()
        {
            // Cliente DynamoDB con credenciales/rol del entorno
            var region = Environment.GetEnvironmentVariable("AWS_REGION")
                         ?? "us-east-2";

            var ddb = new AmazonDynamoDBClient(
                Amazon.RegionEndpoint.GetBySystemName(region));

            // Si tu repo necesita nombre de tabla configurable:
            var tableName = Environment.GetEnvironmentVariable("VENTAS_TABLE")
                            ?? "Ventas";

            _repo = new DynamoDbVentaRepository(ddb, tableName);
        }

        /// <summary>
        /// Handler que recibe JSON con la Venta directamente.
        /// Ej: { "id": "", "fecha": "2025-10-10T12:34:56Z", "clienteId":"C1", "total": 123.45, "lineas":[...]}
        /// </summary>
        public async Task<Resultado> FunctionHandler(JsonElement input, ILambdaContext context)
        {
            if (input.TryGetProperty("body", out var bodyElement) && bodyElement.ValueKind == JsonValueKind.String)
            {
                var bodyString = bodyElement.GetString();

                var venta = JsonSerializer.Deserialize<Venta>(bodyString);

                venta.IdVenta ??= Guid.NewGuid().ToString("N");

                // (Opcional) Validaciones básicas de dominio
                if (string.IsNullOrWhiteSpace(venta.ClienteId))
                    throw new ArgumentException("ClienteId es requerido.");

                if (venta.Fecha == default)
                    venta.Fecha = DateTime.UtcNow;

                await _repo.SaveAsync(venta, CancellationToken.None);

                return new Resultado
                {
                    Id = venta.IdVenta,
                    Mensaje = "Venta guardada correctamente"
                };
            }
            else
            {
                throw new ArgumentException("No se encontró la propiedad 'body'");
            }


        }

        public sealed class Resultado
        {
            public string Id { get; set; } = default!;
            public string Mensaje { get; set; } = default!;
        }
    }
}