using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class Clientes
    {
        public string? IdCliente { get; set; } = default;
        public string? Nombre { get; set; }
        public string? Direccion { get; set; }
        public string? Telefono { get; set; }
        public string? FechaRegistro { get; set; }
        public int Estado { get; set; }
    }

}
