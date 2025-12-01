"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, ShoppingCart, DollarSign, BarChart3, Home } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/productos", label: "Productos", icon: Package },
    { href: "/ventas", label: "Ventas", icon: ShoppingCart },
    { href: "/prestamos", label: "Préstamos", icon: DollarSign },
    { href: "/reportes", label: "Reportes", icon: BarChart3 },
  ]

  return (
    <nav className="bg-primary text-primary-foreground border-b border-sidebar-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-lg">
            Sistema de Ventas
          </Link>
          <div className="hidden sm:flex gap-1">
            {links.map((link) => {
              const IconComponent = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-primary-foreground/10"
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden lg:inline">{link.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
