using Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Interfaces
{
    public interface IVentaService
    {
        Task RegistrarAsync(Ventas venta, IReadOnlyList<DetalleVenta> detalles, IReadOnlyList<Cuotas>? cuotas = null, IReadOnlyList<PagosVenta>? pagos = null, IReadOnlyList<MovimientosInventario>? movsExtra = null);
        Task AnularAsync(string idVenta, string? motivo);
        Task ActualizarCabeceraAsync(Ventas venta);
        Task ReemplazarDetallesAsync(string idVenta, IReadOnlyList<DetalleVenta> nuevosDetalles);
        Task<(Ventas venta, List<DetalleVenta> detalles)?> ObtenerAsync(string idVenta);
        Task<List<object>> ObtenerVentasAsync();
        Task RegistrarPagoCuotasAsync(string idVenta, decimal montoPago);
    }
}
