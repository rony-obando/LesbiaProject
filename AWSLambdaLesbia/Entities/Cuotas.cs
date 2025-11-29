using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public sealed class Cuotas
    {
        public string IdCuotas { get; set; } = default!;
        public string IdVenta {  get; set; } = default!;
        public DateTime FechaVencimiento { get; set; }
        public decimal MontoCuota { get; set; }
        public string Estado {  get; set; }
        public Cuotas() { }

        public Cuotas(Cuotas other)
        {
            IdCuotas = other.IdCuotas;
            IdVenta = other.IdVenta;
            MontoCuota = other.MontoCuota;
            Estado = other.Estado;
            FechaVencimiento = other.FechaVencimiento;
        }
    }
}
