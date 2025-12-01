"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

interface Product {
  id: string           // IdProducto en el backend
  nombre: string       // Nombre
  descripcion: string  // Descripcion
  costo: number        // Costo
  precioVenta: number  // PrecioVenta
  stock: number        // Stock
  estado: number       // Estado (1 activo, 0 inactivo)
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [formData, setFormData] = useState<{
    nombre: string
    descripcion: string
    costo: string
    precioVenta: string
    stock: string
  }>({
    nombre: "",
    descripcion: "",
    costo: "",
    precioVenta: "",
    stock: "",
  })

  // 🔁 Cargar productos desde Lambda
  const fetchProductos = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // puedes omitir el body; el route ya asume GetAll
        body: JSON.stringify({
          Action: "Productos.GetAll",
          Payload: {},
        }),
      })

      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`)
      }

      const data = await res.json()

      const mapped: Product[] = (data.prds || [])
        .filter((p: any) => p.Nombre && p.Estado === 1)
        .map((p: any) => ({
          id: p.IdProducto ?? "",
          nombre: p.Nombre ?? "",
          descripcion: p.Descripcion ?? "",
          costo: Number(p.Costo ?? 0),
          precioVenta: Number(p.PrecioVenta ?? 0),
          stock: Number(p.Stock ?? 0),
          estado: Number(p.Estado ?? 0),
        }))

      setProductos(mapped)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductos()
  }, [])

  // 🧹 Reset formulario
  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      costo: "",
      precioVenta: "",
      stock: "",
    })
    setEditingProduct(null)
  }

  function generarIdProducto() {
  const numero = Math.floor(Math.random() * 999) + 1
  return `P${String(numero).padStart(3, "0")}` // P001, P045, P320
}

const handleSubmitProduct = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!formData.nombre || !formData.costo || !formData.precioVenta) return

  const isEditing = !!editingProduct

  // 👇 Objeto exactamente como lo espera tu backend
  const producto = {
    IdProducto: isEditing ? editingProduct!.id : generarIdProducto(),
    Nombre: formData.nombre,
    Descripcion: formData.descripcion,
    Costo: Number.parseFloat(formData.costo),
    PrecioVenta: Number.parseFloat(formData.precioVenta),
    Stock: Number.parseInt(formData.stock || "0"),
    Estado: 1,
  }

  try {
    setLoading(true)
    setError(null)

    // 👇 IMPORTANTE: aquí solo mandas el producto
    const res = await fetch("/api/productos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(producto),
    })

    const data = await res.json()
    console.log("RESPUESTA SAVE:", data)

    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Error HTTP al guardar: ${res.status}`)
    }

    await fetchProductos()
    setIsOpen(false)
    setEditingProduct(null)
    setFormData({
      nombre: "",
      descripcion: "",
      costo: "",
      precioVenta: "",
      stock: "",
    })
  } catch (err: any) {
    console.error(err)
    setError(err.message || "Error al guardar producto")
  } finally {
    setLoading(false)
  }
}



  // ✏️ Click en editar
  const handleEditClick = (producto: Product) => {
    setEditingProduct(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      costo: producto.costo.toString(),
      precioVenta: producto.precioVenta.toString(),
      stock: producto.stock.toString(),
    })
    setIsOpen(true)
  }

  // 🗑 (Opcional) Eliminar / desactivar – solo dejo el esqueleto
  const handleDeleteClick = async (producto: Product) => {
    // Aquí puedes usar Productos.Delete o Productos.ChangeStatus, etc.
    // Ejemplo base:
    /*
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Action: "Productos.Delete",
          Payload: { IdProducto: producto.id },
        }),
      })

      if (!res.ok) throw new Error(`Error HTTP al eliminar: ${res.status}`)
      const data = await res.json()
      if (data.ok === false) throw new Error(data.error || "Error en Lambda")

      await fetchProductos()
    } catch (err: any) {
      setError(err.message || "Error al eliminar producto")
    } finally {
      setLoading(false)
    }
    */
  }

  const isEditing = !!editingProduct

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestión de Productos</h1>
              <p className="text-muted-foreground mt-2">
                Administra tu catálogo de productos e inventario
              </p>
            </div>
            <Button
              onClick={() => {
                if (!isEditing) resetForm()
                setIsOpen(!isOpen)
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </Button>
          </div>

          {isOpen && (
            <Card className="p-6 mb-8">
              <form onSubmit={handleSubmitProduct} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">
                    {isEditing ? "Editar Producto" : "Nuevo Producto"}
                  </h2>
                  {isEditing && (
                    <span className="text-xs text-muted-foreground">
                      ID: {editingProduct?.id}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre del Producto</label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Cargador Samsung 25W Original"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Descripción</label>
                    <Input
                      value={formData.descripcion}
                      onChange={(e) =>
                        setFormData({ ...formData, descripcion: e.target.value })
                      }
                      placeholder="Descripción breve"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Costo ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.costo}
                      onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Precio de Venta ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.precioVenta}
                      onChange={(e) =>
                        setFormData({ ...formData, precioVenta: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Stock</label>
                    <Input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setIsOpen(false)
                    }}
                    className="bg-muted text-muted-foreground hover:bg-muted/90"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-accent hover:bg-accent/90">
                    {isEditing ? "Guardar Cambios" : "Guardar Producto"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Mensajes de carga / error */}
          {loading && (
            <Card className="p-6 mb-4">
              <p className="text-muted-foreground">Procesando...</p>
            </Card>
          )}

          {error && (
            <Card className="p-6 mb-4 border-destructive/40">
              <p className="text-destructive text-sm">Error: {error}</p>
            </Card>
          )}

          <div className="grid gap-4">
            {!loading && productos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No hay productos registrados. Verifica tu Lambda o comienza agregando uno.
                </p>
              </Card>
            ) : (
              productos.map((producto) => (
                <Card
                  key={producto.id}
                  className="p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">
                        {producto.nombre}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {producto.descripcion || "Sin descripción"}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Costo</span>
                          <p className="font-semibold text-foreground">
                            ${producto.costo.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Precio Venta</span>
                          <p className="font-semibold text-foreground">
                            ${producto.precioVenta.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ganancia</span>
                          <p className="font-semibold text-accent">
                            {(producto.precioVenta - producto.costo).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stock</span>
                          <p className="font-semibold text-foreground">
                            {producto.stock} unidades
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        ID: {producto.id} · Estado:{" "}
                        {producto.estado === 1 ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        className="bg-primary/20 hover:bg-primary/30 text-primary"
                        onClick={() => handleEditClick(producto)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-destructive/20 hover:bg-destructive/30 text-destructive"
                        onClick={() => handleDeleteClick(producto)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  )
}
