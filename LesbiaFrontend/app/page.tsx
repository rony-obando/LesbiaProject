"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, DollarSign, BarChart3 } from "lucide-react"

export default function Dashboard() {
  const modules = [
    {
      title: "Gestión de Productos",
      description: "Administra tu catálogo de productos y stock",
      icon: Package,
      href: "/productos",
      color: "from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800",
      buttonColor: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      title: "Registrar Ventas",
      description: "Crea y gestiona nuevas ventas de clientes",
      icon: ShoppingCart,
      href: "/ventas",
      color: "from-green-50 to-green-100 dark:from-green-900 dark:to-green-800",
      buttonColor: "bg-green-600 hover:bg-green-700 text-white",
    },
    {
      title: "Gestión de Préstamos",
      description: "Administra préstamos y seguimiento de pagos",
      icon: DollarSign,
      href: "/prestamos",
      color: "from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800",
      buttonColor: "bg-purple-600 hover:bg-purple-700 text-white",
    },
    {
      title: "Historial y Reportes",
      description: "Consulta historial de ventas y análisis de datos",
      icon: BarChart3,
      href: "/reportes",
      color: "from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800",
      buttonColor: "bg-orange-600 hover:bg-orange-700 text-white",
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-balance">Sistema de Ventas y Préstamos</h1>
          <p className="text-primary-foreground/80 mt-2">Gestión integral para vendedores</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {modules.map((module) => {
            const IconComponent = module.icon
            return (
              <Card key={module.href} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`bg-gradient-to-br ${module.color} p-6 h-32 flex items-center justify-center`}>
                  <IconComponent className="w-16 h-16 opacity-30" />
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">{module.title}</h2>
                  <p className="text-muted-foreground mb-6 text-sm">{module.description}</p>
                  <Link href={module.href}>
                    <Button className={`w-full ${module.buttonColor}`}>Acceder</Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-card border border-border rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Bienvenido al Sistema</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Esta plataforma te permite gestionar de manera eficiente todos los aspectos de tu negocio:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-accent font-bold">•</span>
              <span>Mantén un registro completo de tus productos e inventario</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">•</span>
              <span>Registra ventas rápidamente con detalles de cliente y productos</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">•</span>
              <span>Administra préstamos a clientes y realiza seguimiento de pagos</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">•</span>
              <span>Consulta reportes y análisis de tu actividad comercial</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
