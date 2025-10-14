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

        public Task<Venta?> GetByIdAsync(string id, CancellationToken ct = default)
            => _ctx.LoadAsync<VentaDdb>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct);

        public Task SaveAsync(Venta venta, CancellationToken ct = default)
            => _ctx.SaveAsync(VentaDdb.FromDomain(venta), ct);

        public Task DeleteAsync(string id, CancellationToken ct = default)
            => _ctx.DeleteAsync<VentaDdb>(id, ct);
    }

    
    [DynamoDBTable("Ventas")]
    public sealed class VentaDdb
    {
        [DynamoDBHashKey] public string IdVenta { get; set; } = default!;
        public string ClienteId { get; set; } = default!;
        public DateTime Fecha { get; set; }
        public decimal Total { get; set; }
        public List<LineaVenta> Lineas { get; set; } = new();

        public static VentaDdb FromDomain(Venta v) => new()
        {
            IdVenta = v.IdVenta,
            ClienteId = v.ClienteId,
            Fecha = v.Fecha,
            Total = v.Total,
            Lineas = v.Lineas
        };
        public Venta ToDomain() => new()
        {
            IdVenta = IdVenta,
            ClienteId = ClienteId,
            Fecha = Fecha,
            Total = Total,
            Lineas = Lineas
        };
    }
}