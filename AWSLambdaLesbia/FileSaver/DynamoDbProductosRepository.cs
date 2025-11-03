using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Entities;
using Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infraestructure
{
    public sealed class DynamoDbProductosRepository : IProductosRepository
    {
        private readonly IDynamoDBContext _ctx;

        [Obsolete]
        public DynamoDbProductosRepository(IAmazonDynamoDB client, string tableName)
        {
            _ctx = new DynamoDBContext(client, new DynamoDBContextConfig
            {
                ConsistentRead = false,
                Conversion = DynamoDBEntryConversion.V2
            });
        }
        public Task DeleteProducto(string id, CancellationToken ct = default)
        {
            var prd = _ctx.LoadAsync<ProductosDdb>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct).Result;
            if (prd == null)
            {
                throw new ArgumentNullException("No se encontró el producto");
            }
            prd.Estado = 0;
            return _ctx.SaveAsync(prd, ct);
        }

        public async Task<List<Productos>> GetAllProducts(CancellationToken ct = default)
        {
            var productos = new List<Productos>();
            var search = _ctx.ScanAsync<Productos>(new List<ScanCondition>());

            do
            {
                var page = await search.GetNextSetAsync(ct);
                productos.AddRange(page);
            } while (!search.IsDone);
            return productos;
        }

        public Task<Productos?> GetbyIdProducto(string id, CancellationToken ct = default)
            => _ctx.LoadAsync<ProductosDdb>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct);

        public Task SaveProducto(Productos productos, CancellationToken ct = default)
        => _ctx.SaveAsync(ProductosDdb.FromDomain(productos), ct);
    }
    [DynamoDBTable("Productos")]
    public sealed class ProductosDdb
    {
        [DynamoDBHashKey] public string? IdProducto { get; set; } = default!;
        public string? Nombre { get; set; }
        public string? Descripcion { get; set; }
        public decimal Costo { get; set; }
        public decimal PrecioVenta { get; set; }
        public int Stock { get; set; }
        public int Estado { get; set; }
        public static ProductosDdb FromDomain(Productos p) => new()
        {
            IdProducto = p.IdProducto,
            Nombre = p.Nombre,
            Descripcion = p.Descripcion,
            Costo = p.Costo,
            Stock = p.Stock,
            Estado = p.Estado,
            PrecioVenta = p.PrecioVenta,
        };
        public Productos ToDomain() => new()
        {
            IdProducto = IdProducto!,
            Nombre = Nombre,
            Descripcion = Descripcion,
            Costo = Costo,
            Stock = Stock,
            Estado = Estado,
            PrecioVenta = PrecioVenta,
        };
    }
}
