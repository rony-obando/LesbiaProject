using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class ResumenPDto
    {
        public string IdPrestamo { get; set; } = default!;
        public string IdCliente { get; set; } = default!;
        public decimal Capital { get; set; }
        public string Estado { get; set; } = default!;

        public int TotalCuotas { get; set; }
        public int CuotasPagadas { get; set; }
        public decimal SaldoPendiente { get; set; }

        public List<CuotaPrestamo> Cuotas { get; set; } = new();
    }
}
