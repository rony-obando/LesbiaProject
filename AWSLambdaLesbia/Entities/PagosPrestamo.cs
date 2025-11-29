using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class PagosPrestamo
    {
        public string IdPagoPrestamo { get; set; } = default!;
        public string IdPrestamo { get; set; } = default!;
        public DateTime FechaPago { get; set; }
        public decimal Monto { get; set; }
    }
}
