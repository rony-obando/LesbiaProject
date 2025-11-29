using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public  class PagosVenta
    {
        public string IdPago { get; set; } = default!;
        public string IdVenta { get; set; } = default!;
        public DateTime FechaPago { get; set; }
        public decimal Monto { get; set; }
        public PagosVenta() { }

        public PagosVenta(PagosVenta other)
        {
            IdPago = other.IdPago;
            IdVenta = other.IdVenta;
            FechaPago = other.FechaPago;
            Monto = other.Monto;

        }
    }
}
