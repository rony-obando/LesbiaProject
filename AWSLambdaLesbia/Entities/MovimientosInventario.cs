using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class MovimientosInventario
    {
        public string IdMovimiento { get; set; } = default!;
        public string IdProducto { get; set; } = default!;
        public string TipoMovimiento { get; set; }
        public int Cantidad { get; set; }
        public DateTime FechaMovimiento { get; set; }
        public string Referencia {  get; set; }

    }
}
