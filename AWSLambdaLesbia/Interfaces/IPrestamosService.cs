using Entities;

public interface IPrestamosService
{
    Task CrearPrestamoConCuotasAsync(Prestamos prestamo, IEnumerable<CuotaPrestamo> cuotas);
    Task RegistrarPagoAsync(PagosPrestamo pago);
    Task RegistrarAmpliacionAsync(RegistrarAmpliacionDTO dto);
    Task<ResumenPDto> ObtenerPrestamoAsync(string prestamoId);
    Task<List<ResumenPDto>> ObtenerPrestamosConResumenAsync();
}