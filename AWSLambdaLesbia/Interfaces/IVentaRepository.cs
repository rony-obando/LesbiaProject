using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Interfaces
{
    public interface IVentaRepository
    {
        Task<Ventas?> GetByIdAsync(string id, CancellationToken ct = default);
        Task SaveAsync(Ventas venta, CancellationToken ct = default);
        Task DeleteAsync(string id, CancellationToken ct = default);
        Task<List<Ventas>> GetAllVentas(CancellationToken ct = default);
    }
}
