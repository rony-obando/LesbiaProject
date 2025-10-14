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
        Task<Venta?> GetByIdAsync(string id, CancellationToken ct = default);
        Task SaveAsync(Venta venta, CancellationToken ct = default);
        Task DeleteAsync(string id, CancellationToken ct = default);
    }
}
