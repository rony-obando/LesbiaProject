using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class AmpliacionesPrestamo
    {
        public string IdAmpliacion { get; set; } = default!;
        public string IdPrestamo { get; set; } = default!;
        public DateTime FechaAmpliacion { get; set; }
        public decimal MontoAdicional { get; set; }
    }
}
