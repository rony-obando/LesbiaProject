using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class CuotaPrestamo
    {
        public string IdCuotaPrestamo { get; set; } = default!;
        public string IdPrestamo {  set; get; } = default!;
        public DateTime FechaVencimiento { get; set; }
        public decimal MontoCuota { set; get; }
        public string Estado { set; get; }
    }
}
