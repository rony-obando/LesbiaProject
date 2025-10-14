using System;
using System.Threading.Tasks;
using Amazon;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;

namespace DynamoDBTest
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("Probando conexión con DynamoDB...");

            // Cambia estos valores por los tuyos
            string tableName = "Productos"; // Nombre exacto de la tabla en AWS
            string region = "us-east-2";          // Región donde está tu tabla

            // Crear cliente DynamoDB
            var client = new AmazonDynamoDBClient(RegionEndpoint.GetBySystemName(region));

            try
            {
                // Obtener referencia de la tabla
                Table table = (Table)Table.LoadTable(client, tableName);

                // Crear un documento de prueba
                var item = new Document();
                item["Id"] = Guid.NewGuid().ToString(); // Clave primaria
                item["Nombre"] = "Prueba conexión";
                item["Fecha"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

                // Guardar en DynamoDB
                await table.PutItemAsync(item);

                Console.WriteLine("✅ Conexión exitosa. El ítem se guardó correctamente.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Error al conectar o guardar en DynamoDB:");
                Console.WriteLine(ex.Message);
            }

            Console.WriteLine("Presiona una tecla para salir...");
            Console.ReadKey();
        }
    }
}
