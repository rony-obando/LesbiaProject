using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Interfaces
{
    public interface IClientesRepository
    {
        Task<Clientes?> GetbyIdCliente(string id, CancellationToken ct = default);
        Task SaveCliente(Clientes cliente, CancellationToken ct = default);
        Task DeleteCliente(string id, CancellationToken ct = default);
        Task<List<Clientes>> GetAllClientes(CancellationToken ct = default);
    }
}
