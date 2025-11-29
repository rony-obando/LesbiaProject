using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Entities;
using Interfaces;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Infraestructure
{
    public sealed class DynamoDbPrestamosRepository : IPrestamosRepository
    {
        private readonly IDynamoDBContext _ctx;

        [Obsolete]
        public DynamoDbPrestamosRepository(IAmazonDynamoDB client, string tableName)
        {
            _ctx = new DynamoDBContext(client, new DynamoDBContextConfig
            {
                ConsistentRead = false,
                Conversion = DynamoDBEntryConversion.V2
            });
        }
        public Task DeletePrestamo(string id, CancellationToken ct = default)
        {
            _ctx.DeleteAsync<PrestamoDb>(id);
            var pr = _ctx.LoadAsync<PrestamoDb>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct).Result;
            if (pr == null)
            {
                throw new ArgumentNullException("No se encontró el prestamo");
            }
            pr.Estado = "Cancelado";
            return _ctx.SaveAsync(pr, ct);
        }


        public async Task<List<Prestamos>> GetAllPrestamos(CancellationToken ct = default)
        {
            var prestamos = new List<Prestamos>();
            var search = _ctx.ScanAsync<Prestamos>(new List<ScanCondition>());

            do
            {
                var page = await search.GetNextSetAsync(ct);
                prestamos.AddRange(page);
            } while (!search.IsDone);
            return prestamos;
        }

        public Task<Prestamos?> GetbyIdPrestamo(string id, CancellationToken ct = default)
        => _ctx.LoadAsync<PrestamoDb>(id, ct).ContinueWith(t => t.Result?.ToDomain(), ct);

        public Task SavePrestamo(Prestamos prestamos, CancellationToken ct = default)
         => _ctx.SaveAsync(PrestamoDb.FromDomain(prestamos), ct);
    }
    [DynamoDBTable("Prestamos")]
    public sealed class PrestamoDb
    {
        [DynamoDBHashKey] public string IdPrestamo { get; set; } = default;
        public string IdCliente { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Capital { get; set; }
        public decimal TasaInteres { get; set; }
        public string FrecuenciaPago { get; set; }
        public string Estado { get; set; }
        public static PrestamoDb FromDomain(Prestamos p) => new()
        {
            IdPrestamo = p.IdPrestamo,
            IdCliente = p.IdCliente,
            Fecha = p.Fecha,
            Capital = p.Capital,
            TasaInteres = p.TasaInteres,
            Estado = p.Estado,
        };
        public Prestamos ToDomain() => new()
        {
            IdPrestamo = IdPrestamo,
            IdCliente = IdCliente,
            Fecha = Fecha,
            Capital = Capital,
            TasaInteres = TasaInteres,
            Estado = Estado,
        };

    } 
}
