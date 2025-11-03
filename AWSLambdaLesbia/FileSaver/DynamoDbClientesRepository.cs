using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Entities;
using Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Infraestructure
{
    public class DynamoDbClientesRepository : IClientesRepository
    {
        private readonly IDynamoDBContext _ctx;

        [Obsolete]
        public DynamoDbClientesRepository(IAmazonDynamoDB client, string tableName)
        {
            _ctx = new DynamoDBContext(client, new DynamoDBContextConfig
            {
                ConsistentRead = false,
                Conversion = DynamoDBEntryConversion.V2
            });
        }
        public Task DeleteCliente(string id, CancellationToken ct = default)
        {
           var cliente = _ctx.LoadAsync<ClientesDbd>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct).Result;
           if (cliente == null)
            {
                throw new ArgumentNullException("No se encontró el cliente");
            }
            cliente.Estado = 0;
            return _ctx.SaveAsync(cliente, ct);
        }

        public async Task<List<Clientes>> GetAllClientes(CancellationToken ct = default)
        {
            var clnts = new List<Clientes>();
            var search = _ctx.ScanAsync<Clientes>(new List<ScanCondition>());
            do
            {
                var page = await search.GetNextSetAsync(ct);
                clnts.AddRange(page);
            } while (!search.IsDone);
            return clnts;
        }

        public Task<Clientes?> GetbyIdCliente(string id, CancellationToken ct = default)
        => _ctx.LoadAsync<ClientesDbd>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct);

        public Task SaveCliente(Clientes cliente, CancellationToken ct = default)
        => _ctx.SaveAsync(ClientesDbd.FromDomain(cliente), ct);
    }
    [DynamoDBTable("Clientes")]
    public sealed class ClientesDbd
    {
        [DynamoDBHashKey] string? IdCliente { get; set; } = default;
        string? Nombre { get; set; }
        string? Direccion { get; set; }
        string? Telefono { get; set; }
        string? FechaRegistro { get; set; }
        int Estado { get; set; }

        public static ClientesDbd FromDomain(Clientes c) => new()
        {
            IdCliente = c.IdCliente,
            Nombre = c.Nombre,
            Direccion = c.Direccion,
            Telefono = c.Telefono,
            FechaRegistro = c.FechaRegistro,
            Estado = c.Estado
        };
        public Clientes ToDomain() => new()
        {
            IdCliente = IdCliente!,
            Nombre = Nombre,
            Direccion = Direccion,
            Telefono = Telefono,
            FechaRegistro = FechaRegistro,
            Estado = Estado
        };
    }
}
