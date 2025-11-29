using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Interfaces
{
    public interface IPrestamosRepository
    {
        Task<Prestamos> GetbyIdPrestamo(string id, CancellationToken ct = default);
        Task SavePrestamo(Prestamos prestamos, CancellationToken ct = default);
        Task DeletePrestamo(string id, CancellationToken ct = default);
        Task<List<Prestamos>> GetAllPrestamos(CancellationToken ct = default);
    }
}
