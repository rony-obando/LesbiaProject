using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class ResumenPrestamoDto
    {
        public string PrestamoId { get; set; } = default!;
        public List<CuotaPrestamo> Cuotas { get; set; } = new();
        public List<PagosPrestamo> Pagos { get; set; } = new();
        public List<AmpliacionesPrestamo> Ampliaciones { get; set; } = new();
    }
}
