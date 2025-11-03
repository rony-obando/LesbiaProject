using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class Ventas
    {
        public string IdVenta { get; set; } = default!;
        public DateTime Fecha { get; set; }
        public string ClienteId { get; set; } = default!;
        public decimal Total { get; set; }
        public string TpoVenta { get; set; }
        public string Estado { get; set; }
    }

}
