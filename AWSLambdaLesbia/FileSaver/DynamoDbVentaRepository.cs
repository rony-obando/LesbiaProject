using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Entities;
using Interfaces;

namespace Infraestructure
{
    public sealed class DynamoDbVentaRepository : IVentaRepository
    {
        private readonly IDynamoDBContext _ctx;

        [Obsolete]
        public DynamoDbVentaRepository(IAmazonDynamoDB client, string tableName)
        {
            _ctx = new DynamoDBContext(client, new DynamoDBContextConfig
            {
                ConsistentRead = false,
                Conversion = DynamoDBEntryConversion.V2
            });
        }

        public Task<Ventas?> GetByIdAsync(string id, CancellationToken ct = default)
            => _ctx.LoadAsync<VentaDdb>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct);

        public Task SaveAsync(Ventas venta, CancellationToken ct = default)
            => _ctx.SaveAsync(VentaDdb.FromDomain(venta), ct);

        public Task DeleteAsync(string id, CancellationToken ct = default)
            => _ctx.DeleteAsync<VentaDdb>(id, ct);

        public async Task<List<Ventas>> GetAllVentas(CancellationToken ct = default)
        {
            var ventas = new List<Ventas>();
            var search = _ctx.ScanAsync<Ventas>(new List<ScanCondition>());

            do
            {
                var page = await search.GetNextSetAsync(ct);
                ventas.AddRange(page);
            } while (!search.IsDone);
            return ventas;
        }
    }


    [DynamoDBTable("Ventas")]
    public sealed class VentaDdb
    {
        [DynamoDBHashKey] public string IdVenta { get; set; } = default!;
        public string ClienteId { get; set; } = default!;
        public DateTime Fecha { get; set; }
        public decimal Total { get; set; }
        public required string TpoVenta { get; set; }
        public required string Estado { get; set; }

        public static VentaDdb FromDomain(Ventas v) => new()
        {
            IdVenta = v.IdVenta,
            ClienteId = v.ClienteId,
            Fecha = v.Fecha,
            Total = v.Total,
            TpoVenta = v.TpoVenta,
            Estado = v.Estado,
        };
        public Ventas ToDomain() => new()
        {
            IdVenta = IdVenta,
            ClienteId = ClienteId,
            Fecha = Fecha,
            Total = Total,
            TpoVenta = TpoVenta,
            Estado = Estado,
        };
    }
}