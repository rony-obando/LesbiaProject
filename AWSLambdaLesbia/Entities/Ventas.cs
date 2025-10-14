using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class Venta
    {
        public string IdVenta { get; set; } = default!;
        public DateTime Fecha { get; set; }
        public string ClienteId { get; set; } = default!;
        public decimal Total { get; set; }
        public List<LineaVenta> Lineas { get; set; } = new();
    }

    public sealed class LineaVenta
    {
        public string ProductoId { get; set; } = default!;
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
    }
}
