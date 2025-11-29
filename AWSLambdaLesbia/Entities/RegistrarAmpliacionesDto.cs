using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Entities
{
    public class RegistrarAmpliacionDTO
    {
        public string IdPrestamo { get; set; } = default!;
        public DateTime FechaAmpliacion { get; set; }
        public decimal MontoAdicional { get; set; }

        public int NuevasCuotas { get; set; }

        // Si no los mandas, puedes usar los del préstamo original
        public decimal? TasaInteres { get; set; }
        public string? FrecuenciaPago { get; set; }  // "Mensual", "Quincenal", "Semanal"
    }

}
