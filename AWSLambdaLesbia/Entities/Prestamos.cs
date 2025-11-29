using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class Prestamos
    {
        public string IdPrestamo { get; set; } = default;
        public string IdCliente { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Capital { get; set; }
        public decimal TasaInteres {  get; set; }
        public string FrecuenciaPago { get; set; }
        public string Estado {  get; set; }
    }
}
