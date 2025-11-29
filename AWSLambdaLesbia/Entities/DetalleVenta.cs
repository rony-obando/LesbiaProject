using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.DynamoDBv2.DataModel;

namespace Entities
{
    [DynamoDBTable("DetalleVenta")]
    public class DetalleVenta
    {
        public string IdDetalleVenta { get; set; } = default;
        public string IdVenta { get; set; }
        public string IdProducto { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal SubTotal { get; set; }
    }
}
