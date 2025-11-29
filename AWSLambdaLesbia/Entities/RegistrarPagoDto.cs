using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class RegistrarPagoPrestamoDTO
    {
        public string IdPrestamo { get; set; } = default!;
        public DateTime FechaPago { get; set; }
        public decimal Monto { get; set; }
    }
}
