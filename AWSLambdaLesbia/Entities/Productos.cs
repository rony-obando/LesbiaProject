using System.Data.SqlTypes;

public sealed class Productos
{
    public string IdProducto { get; set; }
    public string? Nombre { get; set; }
    public string? Descripcion {  get; set; }
    public decimal Costo { get; set; }
    public decimal PrecioVenta { get; set; }
    public int Stock {  get; set; }
    public int Estado { get; set; }

}