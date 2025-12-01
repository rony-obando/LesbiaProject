"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, DollarSign, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

interface Loan {
  id: string
  clienteId: string
  monto: number
  cuotas: number
  cuotasPagadas: number
  saldo: number
  estado: "Activo" | "Pagado" | "Vencido"
}

interface Cliente {
  IdCliente: string
  Nombre: string
  Direccion?: string
  Telefono?: string
}

function generateClientId() {
  const num = Math.floor(Math.random() * 1000) // 0–999
  return `CL${num.toString().padStart(3, "0")}`
}

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Loan[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedClienteId, setSelectedClienteId] = useState("")
  const [useExistingClient, setUseExistingClient] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentLoan, setPaymentLoan] = useState<Loan | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")


  const [formData, setFormData] = useState({
    clienteNombre: "",
    clienteDireccion: "",
    clienteTelefono: "",
    monto: "",
    cuotas: "5",
    tasaInteres: "24",        // 👈 nuevo
    frecuenciaPago: "Mensual" // 👈 nuevo
  })

  const capital = parseFloat(formData.monto || "0") || 0
  const tasa = parseFloat(formData.tasaInteres || "0") || 0
  const nCuotas = parseInt(formData.cuotas || "0") || 0

  const interesTotal = nCuotas > 0 ? capital * (tasa / 100) : 0
  const totalAPagar = capital + interesTotal
  const montoCuotaPreview = nCuotas > 0 ? totalAPagar / nCuotas : 0

  const monto = Number.parseFloat(formData.monto)
  const numCuotas = Number.parseInt(formData.cuotas) || 5

  const montoCuota = Number((totalAPagar / numCuotas).toFixed(2))






  // 🔹 Cargar préstamos desde backend
  const loadPrestamos = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/prestamos")
      const data = await res.json()

      if (!res.ok || data.ok === false) {
        console.error("Error al cargar préstamos:", data.error)
        return
      }

      const lista: Loan[] = (data.prs || []).map((p: any) => ({
        id: p.IdPrestamo,
        clienteId: p.IdCliente,
        monto: p.Capital,
        cuotas: p.TotalCuotas,
        cuotasPagadas: p.CuotasPagadas,
        saldo: p.SaldoPendiente,
        estado: p.Estado as "Activo" | "Pagado" | "Vencido",
      }))

      setPrestamos(lista)
    } catch (err) {
      console.error("Error loadPrestamos:", err)
    } finally {
      setLoading(false)
    }
  }

  // 🔹 Cargar clientes existentes
  const loadClientes = async () => {
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "Clientes.GetAll",
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setClientes(data.clientes ?? [])
    } catch (err) {
      console.error("Error cargando clientes", err)
    }
  }

  useEffect(() => {
    loadPrestamos()
    loadClientes()
  }, [])

  // 🔹 Guardar cliente nuevo (igual que en ventas)
  const handleSaveClient = async () => {
    if (!formData.clienteNombre) {
      alert("Debe ingresar el nombre del cliente.")
      return
    }

    const newId = generateClientId()

    const clientPayload = {
      IdCliente: newId,
      Nombre: formData.clienteNombre,
      Direccion: formData.clienteDireccion,
      Telefono: formData.clienteTelefono,
      FechaRegistro: new Date().toISOString(),
      Estado: 1,
    }

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "Clientes.Save",
          payload: clientPayload,
        }),
      })

      const raw = await res.text()
      let data: any
      try {
        data = JSON.parse(raw)
      } catch {
        console.error("Respuesta no JSON de /api/clientes:", raw)
        throw new Error(raw)
      }

      if (!res.ok || data.ok === false) {
        console.error("Error /api/clientes Save:", res.status, data)
        throw new Error(data.error || `Error HTTP /api/clientes: ${res.status}`)
      }

      setClientes((prev) => [...prev, clientPayload])
      setSelectedClienteId(newId)
      alert("Cliente guardado correctamente.")
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Error al guardar el cliente")
    }
  }
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentLoan) return

    const monto = Number(paymentAmount)
    if (Number.isNaN(monto) || monto <= 0) {
      alert("Monto inválido.")
      return
    }

    try {
      const res = await fetch("/api/prestamos/pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          IdPrestamo: paymentLoan.id,
          Monto: monto,
          FechaPago: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error("Error /api/prestamos/pago:", text)
        alert("Error al registrar el pago. Revise el monto o intente de nuevo.")
        return
      }
      const raw = await res.text()
      let data: any
      try {
        data = JSON.parse(raw)
      } catch {
        console.error("Respuesta no JSON /api/prestamos/pago:", raw)
        throw new Error(raw)
      }

      if (!res.ok || data.ok === false) {
        console.error("Error registrar pago:", data)
        throw new Error(data.error || `Error HTTP /api/prestamos/pago: ${res.status}`)
      }

      // refrescar lista
      await loadPrestamos()
      setIsPaymentOpen(false)
      setPaymentLoan(null)
      setPaymentAmount("")
      alert("Pago registrado correctamente.")
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Error al registrar el pago")
    }
  }
  const frecuencia = formData.frecuenciaPago // "Mensual" | ...
  const IdPrestamo = `P-${Date.now()}`

  function addByFrecuencia(date: Date, meses: number, frecuencia: string) {
    const d = new Date(date)

    if (frecuencia === "Semanal") {
      d.setDate(d.getDate() + 7 * meses)
    } else if (frecuencia === "Quincenal") {
      d.setDate(d.getDate() + 15 * meses)
    } else {
      // Mensual (por defecto)
      d.setMonth(d.getMonth() + meses)
    }

    return d
  }





  // 🔹 Crear préstamo (Prestamos.Save)
  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.monto || !formData.cuotas) {
      alert("Debe ingresar monto y número de cuotas.")
      return
    }

    let clienteIdUsar = ""
    let clienteNombreUsar = ""

    if (useExistingClient) {
      if (!selectedClienteId) {
        alert("Debe seleccionar un cliente existente.")
        return
      }
      const cliente = clientes.find((c) => c.IdCliente === selectedClienteId)
      if (!cliente) {
        alert("Cliente no encontrado.")
        return
      }
      clienteIdUsar = cliente.IdCliente
      clienteNombreUsar = cliente.Nombre
    } else {
      if (!formData.clienteNombre) {
        alert("Debe ingresar el nombre del nuevo cliente.")
        return
      }

      const newId = generateClientId()

      const clientPayload = {
        IdCliente: newId,
        Nombre: formData.clienteNombre,
        Direccion: formData.clienteDireccion,
        Telefono: formData.clienteTelefono,
        FechaRegistro: new Date().toISOString(),
        Estado: 1,
      }

      try {
        const resCliente = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Clientes.Save",
            payload: clientPayload,
          }),
        })

        const rawCliente = await resCliente.text()
        let dataCliente: any
        try {
          dataCliente = JSON.parse(rawCliente)
        } catch {
          console.error("Respuesta no JSON de /api/clientes:", rawCliente)
          throw new Error(rawCliente)
        }

        if (!resCliente.ok || dataCliente.ok === false) {
          console.error("Error /api/clientes Save:", resCliente.status, dataCliente)
          throw new Error(dataCliente.error || `Error HTTP /api/clientes: ${resCliente.status}`)
        }

        setClientes((prev) => [...prev, clientPayload])
        clienteIdUsar = newId
        clienteNombreUsar = formData.clienteNombre
      } catch (err: any) {
        console.error(err)
        alert(err.message || "Error al guardar el cliente")
        return
      }
    }

    const monto = Number.parseFloat(formData.monto)
    const numCuotas = Number.parseInt(formData.cuotas) || 5
    const now = new Date()
    const IdPrestamo = `P-${Date.now()}`
    const interesTotal = monto * (tasa / 100)
    const totalAPagar = monto + interesTotal
    const montoCuota = Number((totalAPagar / numCuotas).toFixed(2))

    // genera las cuotas usando now
    const cuotasArray = Array.from({ length: numCuotas }, (_, i) => {
      const venc = addByFrecuencia(now, i + 1, frecuencia)
      return {
        IdCuotaPrestamo: `${IdPrestamo}-${i + 1}`,
        IdPrestamo: IdPrestamo,
        FechaVencimiento: venc.toISOString(),
        MontoCuota: montoCuota,
        Estado: "Pendiente",
      }
    })



    const payload = {
      Prestamo: {
        IdPrestamo: IdPrestamo,
        IdCliente: clienteIdUsar,
        Fecha: now.toISOString(),
        Capital: monto,
        TasaInteres: tasa,
        FrecuenciaPago: frecuencia,
        Estado: "Activo",
      },
      Cuotas: cuotasArray,
    }

    try {
      const resPrestamo = await fetch("/api/prestamos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const raw = await resPrestamo.text()
      let dataPrestamo: any
      try {
        dataPrestamo = JSON.parse(raw)
      } catch {
        console.error("Respuesta no JSON de /api/prestamos:", raw)
        throw new Error(raw)
      }

      if (!resPrestamo.ok || dataPrestamo.ok === false) {
        console.error("Error al guardar préstamo:", dataPrestamo)
        throw new Error(dataPrestamo.error || `Error HTTP /api/prestamos: ${resPrestamo.status}`)
      }

      // refrescar lista desde backend
      await loadPrestamos()

      // limpiar form
      setFormData({
        clienteNombre: "",
        clienteDireccion: "",
        clienteTelefono: "",
        monto: "",
        cuotas: "5",
        tasaInteres: "24",        // 👈 nuevo
        frecuenciaPago: "Mensual" // 👈 nuevo
      })
      setSelectedClienteId("")
      setIsOpen(false)
      alert("Préstamo creado correctamente.")
    } catch (err: any) {
      console.error("Error al guardar préstamo", err)
      alert(err.message || "Error al guardar el préstamo")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Activo":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "Pagado":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "Vencido":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      default:
        return ""
    }
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestión de Préstamos</h1>
              <p className="text-muted-foreground mt-2">Administra préstamos a clientes y seguimiento de pagos</p>
            </div>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Préstamo
            </Button>
          </div>
          {isPaymentOpen && paymentLoan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <Card className="w-full max-w-md p-6 space-y-4">
                <h2 className="text-xl font-bold">Registrar pago</h2>
                <p className="text-sm text-muted-foreground">
                  Préstamo {paymentLoan.id} • Cliente {paymentLoan.clienteId}
                </p>
                <p className="text-sm">
                  Saldo actual:{" "}
                  <span className="font-semibold">
                    ${paymentLoan.saldo.toFixed(2)}
                  </span>
                </p>
                <form onSubmit={handleRegisterPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Monto a pagar</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      * Por ahora el sistema solo acepta montos que cubran cuotas completas.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsPaymentOpen(false)
                        setPaymentLoan(null)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-accent hover:bg-accent/90">
                      Registrar pago
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
          {isOpen && (
            <Card className="p-6 mb-8 space-y-4">
              {/* Checkbox para alternar modo cliente */}
              <div className="flex items-center gap-2">
                <input
                  id="useExisting"
                  type="checkbox"
                  checked={useExistingClient}
                  onChange={(e) => setUseExistingClient(e.target.checked)}
                />
                <label htmlFor="useExisting" className="text-sm">
                  Usar cliente existente (desmarcar para crear uno nuevo)
                </label>
              </div>

              {useExistingClient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cliente existente</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 bg-background"
                      value={selectedClienteId}
                      onChange={(e) => setSelectedClienteId(e.target.value)}
                    >
                      <option value="">-- Seleccionar cliente --</option>
                      {clientes.map((c) => (
                        <option key={c.IdCliente} value={c.IdCliente}>
                          {c.IdCliente} - {c.Nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!useExistingClient && (
                <div className="space-y-3">
                  <p className="font-semibold">Nuevo cliente (ID se genera automáticamente, ej. CL000)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nombre</label>
                      <Input
                        value={formData.clienteNombre}
                        onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
                        placeholder="Nombre del cliente"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Dirección</label>
                      <Input
                        value={formData.clienteDireccion}
                        onChange={(e) => setFormData({ ...formData, clienteDireccion: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Teléfono</label>
                      <Input
                        value={formData.clienteTelefono}
                        onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={handleSaveClient}>
                      Guardar cliente
                    </Button>
                  </div>
                </div>
              )}


              {/* Datos del préstamo */}
              {/* Datos del préstamo */}
              <form onSubmit={handleAddLoan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Monto del Préstamo ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Número de Cuotas</label>
                    <Input
                      type="number"
                      value={formData.cuotas}
                      onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
                      placeholder="5"
                      min="1"
                    />
                  </div>

                  {/* 👇 NUEVO: Tasa de interés */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Tasa de interés (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.tasaInteres}
                      onChange={(e) => setFormData({ ...formData, tasaInteres: e.target.value })}
                      placeholder="24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Frecuencia de pago</label>
                    <select
                      className="w-full border rounded-md px-3 py-2 bg-background"
                      value={formData.frecuenciaPago}
                      onChange={(e) => setFormData({ ...formData, frecuenciaPago: e.target.value })}
                    >
                      <option value="Mensual">Mensual</option>
                      <option value="Quincenal">Quincenal</option>
                      <option value="Semanal">Semanal</option>
                    </select>
                  </div>
                </div>

                {/* Resumen de interés / total / cuota */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Interés total</span>
                    <p className="font-semibold">${interesTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total a pagar</span>
                    <p className="font-semibold">${totalAPagar.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cuota estimada</span>
                    <p className="font-semibold">${montoCuotaPreview.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="bg-muted text-muted-foreground hover:bg-muted/90"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-accent hover:bg-accent/90">
                    Crear Préstamo
                  </Button>
                </div>
              </form>

            </Card>
          )}

          {/* Lista de préstamos */}
          {/* Lista de préstamos */}
          <div className="space-y-4">
            {loading && prestamos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Cargando préstamos...</p>
              </Card>
            ) : prestamos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No hay préstamos registrados aún.</p>
              </Card>
            ) : (
              prestamos.map((prestamo) => {
                // 🔍 Buscar el cliente por IdCliente
                const cliente = clientes.find((c) => c.IdCliente === prestamo.clienteId)

                return (
                  <Card key={prestamo.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            {/* Nombre del cliente o fallback al Id */}
                            <h3 className="text-lg font-bold text-foreground">
                              {cliente ? cliente.Nombre : `Cliente ${prestamo.clienteId}`}
                            </h3>

                            {/* Id del préstamo + fecha */}
                            <p className="text-sm text-muted-foreground mt-1">
                              Préstamo {prestamo.id} •{" "}

                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                              prestamo.estado,
                            )}`}
                          >
                            {prestamo.estado}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Monto</span>
                            <p className="font-semibold text-foreground text-lg">
                              ${prestamo.monto.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cuotas</span>
                            <p className="font-semibold text-foreground">
                              {prestamo.cuotasPagadas}/{prestamo.cuotas}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Saldo</span>
                            <p className="font-semibold text-foreground">
                              ${prestamo.saldo.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          className="bg-accent/20 hover:bg-accent/30 text-accent"
                          onClick={() => {
                            setPaymentLoan(prestamo)
                            setPaymentAmount("")
                            setIsPaymentOpen(true)
                          }}
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-destructive/20 hover:bg-destructive/30 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

        </div>
      </main>
    </>
  )
}
