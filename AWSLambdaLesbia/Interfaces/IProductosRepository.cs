using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Interfaces
{
    public interface IProductosRepository
    {
        Task<Productos> GetbyIdProducto(string id, CancellationToken ct = default);
        Task SaveProducto(Productos productos, CancellationToken ct = default);
        Task DeleteProducto(string id, CancellationToken ct = default);
        Task<List<Productos>> GetAllProducts(CancellationToken ct = default);
    }
}
