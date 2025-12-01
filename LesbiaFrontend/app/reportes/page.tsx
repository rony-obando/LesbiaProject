"use client"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function ReportesPage() {
  const datosVentas = [
    { mes: "Enero", ventas: 4000, ingresos: 2400 },
    { mes: "Febrero", ventas: 3000, ingresos: 1398 },
    { mes: "Marzo", ventas: 2000, ingresos: 9800 },
    { mes: "Abril", ventas: 2780, ingresos: 3908 },
    { mes: "Mayo", ventas: 1890, ingresos: 4800 },
    { mes: "Junio", ventas: 2390, ingresos: 3800 },
  ]

  const datosPrestamos = [
    { estado: "Activos", valor: 5, fill: "#3b82f6" },
    { estado: "Pagados", valor: 8, fill: "#10b981" },
    { estado: "Vencidos", valor: 2, fill: "#ef4444" },
  ]

  const resumenMetricas = [
    {
      titulo: "Total Ventas",
      valor: "$15,060.00",
      cambio: "+12.5%",
      positivo: true,
    },
    {
      titulo: "Préstamos Activos",
      valor: "$5,000.00",
      cambio: "+3.2%",
      positivo: true,
    },
    {
      titulo: "Cuentas por Cobrar",
      valor: "$2,450.00",
      cambio: "-2.1%",
      positivo: false,
    },
    {
      titulo: "Ganancia Neta",
      valor: "$3,500.00",
      cambio: "+8.7%",
      positivo: true,
    },
  ]

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reportes y Análisis</h1>
            <p className="text-muted-foreground mt-2">Consulta el desempeño de tu negocio</p>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
            {resumenMetricas.map((metrica, idx) => (
              <Card key={idx} className="p-6">
                <p className="text-sm text-muted-foreground">{metrica.titulo}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{metrica.valor}</p>
                <p className={`text-sm mt-2 ${metrica.positivo ? "text-accent" : "text-destructive"}`}>
                  {metrica.cambio} vs mes anterior
                </p>
              </Card>
            ))}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Ventas e Ingresos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datosVentas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ventas" fill="var(--color-chart-1)" />
                  <Bar dataKey="ingresos" fill="var(--color-chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Estado de Préstamos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={datosPrestamos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ nombre, valor }) => `${nombre}: ${valor}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="valor"
                  >
                    {datosPrestamos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Tabla de últimas transacciones */}
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Últimas Transacciones</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 font-semibold">Fecha</th>
                    <th className="text-left py-3 font-semibold">Tipo</th>
                    <th className="text-left py-3 font-semibold">Cliente</th>
                    <th className="text-right py-3 font-semibold">Monto</th>
                    <th className="text-left py-3 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      fecha: "2025-11-21",
                      tipo: "Venta",
                      cliente: "María López",
                      monto: "$320.50",
                      estado: "Completada",
                    },
                    {
                      fecha: "2025-11-20",
                      tipo: "Venta",
                      cliente: "Juan García",
                      monto: "$450.00",
                      estado: "Completada",
                    },
                    {
                      fecha: "2025-11-19",
                      tipo: "Préstamo",
                      cliente: "Carlos Mendez",
                      monto: "$1,000.00",
                      estado: "Activo",
                    },
                  ].map((trans, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3">{trans.fecha}</td>
                      <td className="py-3">{trans.tipo}</td>
                      <td className="py-3">{trans.cliente}</td>
                      <td className="text-right py-3 font-semibold">{trans.monto}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {trans.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}
