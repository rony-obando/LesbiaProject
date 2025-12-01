"use client"

import type React from "react"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

const VENTAS_URL = "https://atdodtlsuktlxspapk2hcvsj3i0ooain.lambda-url.us-east-2.on.aws/" // 👈 CAMBIA ESTO

type EstadoVenta = "Completada" | "Pendiente" | "Cancelada"

interface Sale {
  id: string               // id para la UI
  idVentaBackend: string   // ⬅ IdVenta real de DynamoDB
  cliente: string
  fecha: string
  total: number
  estado: EstadoVenta
  items: number
  saldoPendiente: number
}

interface Product {
  idProducto: string
  nombre: string
  precioVenta: number
}

interface VentaItem {
  idProducto: string
  nombreProducto: string
  cantidad: number
  precioUnitario: number
}
interface Cuota {
  IdCuota: string
  FechaVencimiento: string
  MontoCuota: number
  Estado: string
}

interface Pago {
  IdPago: string
  FechaPago: string
  Monto: number
}

interface MovimientoExtra {
  IdMovimiento: string
  IdProducto: string
  TipoMovimiento: "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO"
  Cantidad: number
  FechaMovimiento: string
  Referencia: string
}


// Formulario de la venta
type ClienteModo = "DEFAULT" | "EXISTING" | "NEW"

interface VentaFormData {
  clienteModo: ClienteModo
  clienteId: string
  clienteNombre: string
  clienteDireccion: string
  clienteTelefono: string
  metodoPago: "CONTADO" | "CREDITO"
  observaciones: string
  
}


export default function VentasPage() {
  const [ventas, setVentas] = useState<Sale[]>([])
  const [isOpen, setIsOpen] = useState(false)


  const DEFAULT_CLIENT_ID = "CL001"          // 👈 cambia si tu cliente genérico es otro
  const DEFAULT_CLIENT_NAME = "Cliente generico" // Nombre genérico para ventas al contado
  const generateClientId = () => {
    // Ejemplo: CL-AB1234 basado en timestamp
    const suffix = Date.now().toString(36).toUpperCase().slice(-6)
    return `CL-${suffix}`
  }
  const [formData, setFormData] = useState<VentaFormData>({
    clienteId: DEFAULT_CLIENT_ID,
    clienteNombre: DEFAULT_CLIENT_NAME,
    clienteDireccion: "",
    clienteTelefono: "",
    metodoPago: "CONTADO",
    observaciones: "",
    clienteModo: "DEFAULT",
  })
  interface Cliente {
    id: string
    nombre: string
  }

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [errorClientes, setErrorClientes] = useState<string | null>(null)

  // Productos para seleccionar en la venta
  const [productos, setProductos] = useState<Product[]>([])
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [errorProductos, setErrorProductos] = useState<string | null>(null)

  // Item que se está agregando
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [cantidad, setCantidad] = useState<number>(1)
  const [precioUnitario, setPrecioUnitario] = useState<number>(0)

  // Items finales de la venta
  const [items, setItems] = useState<VentaItem[]>([])

  // 🔹 Total calculado de la venta
  const totalVenta = items.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0)

  const [incluirPagos, setIncluirPagos] = useState(false)
  const [incluirMovimientosExtra, setIncluirMovimientosExtra] = useState(false)

  const [numeroCuotas, setNumeroCuotas] = useState(1)
  const [montoPagoInicial, setMontoPagoInicial] = useState<string>("")

  const [pagoModalOpen, setPagoModalOpen] = useState(false)
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Sale | null>(null)
  const [montoPagoCuotas, setMontoPagoCuotas] = useState<string>("")
  const [loadingPagoCuotas, setLoadingPagoCuotas] = useState(false)

  const fechaIso = new Date().toISOString()


  // ================== CARGAR PRODUCTOS DESDE LAMBDA ==================
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true)
        setErrorProductos(null)

        const res = await fetch("/api", {
          method: "POST",
        })

        if (!res.ok) {
          const text = await res.text()
          console.error("Error productos:", res.status, text)
          throw new Error(`Error HTTP productos: ${res.status}`)
        }

        const data = await res.json()

        /* const mapped: Product[] = (data.prds || []).map((p: any) => ({
           idProducto: p.IdProducto ?? "",
           nombre: p.Nombre ?? p.IdProducto ?? "",
           precioVenta: Number(p.PrecioVenta ?? 0),
         }))*/
        const mapped: Product[] = (data.prds || [])
          .filter((p: any) => p.Nombre && p.Estado === 1) // opcional
          .map((p: any) => ({
            idProducto: p.IdProducto ?? "",
            nombre: p.Nombre ?? "",
            precioVenta: Number(p.PrecioVenta ?? 0),
          }))

        setProductos(mapped)
      } catch (err: any) {
        console.error(err)
        setErrorProductos(err.message || "Error al cargar productos")
      } finally {
        setLoadingProductos(false)
      }
    }

    fetchProductos()
  }, [])
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoadingClientes(true)
        setErrorClientes(null)

        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "Clientes.GetAll",
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          console.error("Error /api/clientes GetAll:", res.status, text)
          setErrorClientes(`Error HTTP: ${res.status}`)
          return
        }

        const data = await res.json()
        console.log("Clientes.GetAll respuesta:", data)

        // 👇 ADAPTA este mapeo a lo que devuelva tu Lambda
        // Supongamos que te devuelve algo tipo:
        // { clts: [ { IdCliente, Nombre, ... }, ... ], ok: true }
        const mapped: Cliente[] = (data.clientes || []).map((c: any) => ({
          id: c.IdCliente,
          nombre: c.Nombre,
        }))

        setClientes(mapped)
      } catch (err: any) {
        console.error("Error cargando Clientes.GetAll:", err)
        setErrorClientes(err.message || "Error al cargar clientes")
      } finally {
        setLoadingClientes(false)
      }
    }

    fetchClientes()
  }, [])

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const res = await fetch("/api/ventas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "Ventas.GetAll",
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          console.error("Error /api/ventas GetAll:", res.status, text)
          return
        }

        const data = await res.json()
        console.log("Ventas.GetAll respuesta:", data)

        const mapped: Sale[] = (data.vnts || []).map((v: any, idx: number) => ({
          id: v.Venta?.IdVenta ?? String(idx + 1),
          idVentaBackend: v.Venta?.IdVenta ?? "",
          cliente: v.ClienteNombre ?? v.Venta?.ClienteId ?? "SN",
          fecha: (v.Venta?.Fecha || "").split("T")[0],
          total: Number(v.Venta?.Total ?? 0),
          estado:
            v.Venta?.Estado === "ABIERTA"
              ? "Pendiente"
              : v.Venta?.Estado === "CANCELADA"
                ? "Cancelada"
                : "Completada",
          items: Number(v.CantidadItems ?? 0),
          // 👇 si quieres, agrega un campo extra para el saldo:
          saldoPendiente: Number(v.SaldoPendiente ?? 0),
        }));


        setVentas(mapped)
      } catch (err) {
        console.error("Error cargando Ventas.GetAll:", err)
      }
    }

    fetchVentas()
  }, [])


  // Cuando el usuario selecciona un producto, prellenamos el precio
  useEffect(() => {
    const prod = productos.find((p) => p.idProducto === selectedProductId)
    if (prod) {
      setPrecioUnitario(prod.precioVenta)
    }
  }, [selectedProductId, productos])

  // ================== MANEJO DE ITEMS ==================
  const handleAddItem = () => {
    if (!selectedProductId || cantidad <= 0 || precioUnitario <= 0) return

    const prod = productos.find((p) => p.idProducto === selectedProductId)
    if (!prod) return

    const existente = items.find((i) => i.idProducto === selectedProductId)
    if (existente) {
      setItems((prev) =>
        prev.map((i) =>
          i.idProducto === selectedProductId
            ? { ...i, cantidad: i.cantidad + cantidad, precioUnitario }
            : i,
        ),
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          idProducto: prod.idProducto,
          nombreProducto: prod.nombre,
          cantidad,
          precioUnitario,
        },
      ])
    }

    setCantidad(1)
    // dejamos el último precioUnitario por si quiere agregar igual
  }
  const handleSaveClient = async () => {
    if (!formData.clienteId || !formData.clienteNombre) {
      alert("Debe ingresar Id de cliente y nombre para guardarlo.")
      return
    }
    const clientPayload = {
      IdCliente: formData.clienteId,      // 👈 el que generamos
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

      if (!res.ok) {
        const text = await res.text()
        console.error("Error /api/clientes Save:", res.status, text)
        throw new Error(`Error HTTP /api/clientes: ${res.status}`)
      }

      const data = await res.json()
      console.log("Clientes.Save respuesta:", data)
      const backendId = (data.IdVenta as string) ?? ""
      const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)
      const nuevaVenta: Sale = {
        id: backendId || crypto.randomUUID(),
        idVentaBackend: backendId,
        cliente: formData.clienteNombre || formData.clienteId,
        fecha: fechaIso.split("T")[0],
        total: totalVenta,
        estado:
          formData.metodoPago === "CREDITO"
            ? "Pendiente"
            : "Completada",
        items: totalItems,
        saldoPendiente: formData.metodoPago === "CREDITO"
      ? totalVenta
      : 0,
      }

      setVentas((prev) => [...prev, nuevaVenta])
      alert("Cliente guardado correctamente.")
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Error al guardar el cliente")
    }
  }

  const handleOpenPagoCuotas = (venta: Sale) => {
    if (!venta.idVentaBackend) {
      alert("Esta venta no tiene IdVenta válido.")
      return
    }
    setVentaSeleccionada(venta)
    setMontoPagoCuotas("")
    setPagoModalOpen(true)
  }

  const handleSubmitPagoCuotas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ventaSeleccionada?.idVentaBackend) {
      alert("Venta inválida.")
      return
    }

    const monto = Number(montoPagoCuotas)
    if (!monto || monto <= 0) {
      alert("Ingresa un monto válido.")
      return
    }

    try {
      setLoadingPagoCuotas(true)

      // Llamar a Ventas.PagoCuotas
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "Ventas.PagoCuotas",
          payload: {
            IdVenta: ventaSeleccionada.idVentaBackend,
            Monto: monto,
          },
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Error PagoCuotas:", res.status, text)
        throw new Error(`Error HTTP /api/ventas: ${res.status}`)
      }

      const data = await res.json()
      console.log("PagoCuotas OK:", data)
      alert("Pago de cuotas registrado correctamente.")

      // Refrescar lista de ventas
      const resVentas = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "Ventas.GetAll" }),
      })

      if (resVentas.ok) {
        const dataV = await resVentas.json()
        const mapped: Sale[] = (dataV.vnts || []).map((v: any, idx: number) => ({
          id: v.Venta?.IdVenta ?? String(idx + 1),
          idVentaBackend: v.Venta?.IdVenta ?? "",
          cliente: v.ClienteNombre ?? v.Venta?.ClienteId ?? "SN",
          fecha: (v.Venta?.Fecha || "").split("T")[0],
          total: Number(v.Venta?.Total ?? 0),
          estado:
            v.Venta?.Estado === "ABIERTA"
              ? "Pendiente"
              : v.Venta?.Estado === "CANCELADA"
                ? "Cancelada"
                : "Completada",
          items: Number(v.CantidadItems ?? 0),
          saldoPendiente: Number(v.SaldoPendiente ?? 0),
        }))
        setVentas(mapped)
      }

      setPagoModalOpen(false)
      setVentaSeleccionada(null)
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Error al registrar el pago de cuotas")
    } finally {
      setLoadingPagoCuotas(false)
    }
  }



  const handleRemoveItem = (idProducto: string) => {
    setItems((prev) => prev.filter((i) => i.idProducto !== idProducto))
  }

  // ================== REGISTRAR VENTA (LLAMAR LAMBDA) ==================
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.clienteId || items.length === 0) {
      alert("Debes seleccionar un cliente y al menos un producto.")
      return
    }



    // ================== ITEMS ==================
    const itemsPayload = items.map((i) => ({
      IdProducto: i.idProducto,
      Cantidad: i.cantidad,
      PrecioUnitario: i.precioUnitario,
    }))

    // ================== CUOTAS (caso 2 y 5) ==================
    let cuotas: Cuota[] = []
    if (formData.metodoPago === "CREDITO" && numeroCuotas > 0) {
      const montoPorCuota = Number((totalVenta / numeroCuotas).toFixed(2))

      cuotas = Array.from({ length: numeroCuotas }).map((_, idx) => ({
        IdCuota: `C-${Date.now()}-${idx + 1}`,
        // aquí podrías sumar meses según idx, por ahora todo misma fecha
        FechaVencimiento: fechaIso,
        MontoCuota: montoPorCuota,
        Estado: "PENDIENTE",
      }))
    }


    // ================== PAGOS (caso 3 y 5) ==================
    let pagos: Pago[] = []
    if (incluirPagos) {
      const inicial = Number(montoPagoInicial || "0")

      if (inicial > 0 && inicial < totalVenta) {
        const resto = Number((totalVenta - inicial).toFixed(2))

        pagos = [
          {
            IdPago: `PG-${Date.now()}`,
            FechaPago: fechaIso,
            Monto: inicial,
          },
          {
            IdPago: `PG-${Date.now() + 1}`,
            FechaPago: fechaIso,
            Monto: resto,
          },
        ]
      } else {
        // si no pusiste nada coherente, mandamos un solo pago por el total
        pagos = [
          {
            IdPago: `PG-${Date.now()}`,
            FechaPago: fechaIso,
            Monto: totalVenta,
          },
        ]
      }
    }


    // ================== MOVIMIENTOS EXTRA (caso 4 y 5) ==================
    let movimientosExtra: MovimientoExtra[] = []
    if (incluirMovimientosExtra && items.length > 0) {
      const itemBase = items[0] // tomamos el primer producto como referencia
      movimientosExtra = [
        {
          IdMovimiento: `MV-${Date.now()}`,
          IdProducto: itemBase.idProducto,
          TipoMovimiento: "AJUSTE_POSITIVO",
          Cantidad: 1,
          FechaMovimiento: fechaIso,
          Referencia: "AJUSTE AUTOMÁTICO DESDE UI",
        },
      ]
    }

    // ================== ARMAMOS EL PAYLOAD FINAL ==================
    const payload: any = {
      ClienteId: formData.clienteId,
      Fecha: fechaIso,
      Observaciones: formData.observaciones || "Venta registrada desde app React",
      Items: itemsPayload,
    }

    if (cuotas.length > 0) {
      payload.Cuotas = cuotas
    }

    if (pagos.length > 0) {
      payload.Pagos = pagos
    }

    if (movimientosExtra.length > 0) {
      payload.MovimientosExtra = movimientosExtra
    }

    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload, // tu route /api/ventas luego lo envuelve con Action: "Ventas.Save"
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Error /api/ventas:", res.status, text)
        throw new Error(`Error HTTP /api/ventas: ${res.status}`)
      }

      const data = await res.json()
      console.log("Respuesta /api/ventas:", data)

      // cálculo local para la UI
      const totalItems = items.reduce((sum, i) => sum + i.cantidad, 0)
      const nuevaVenta: Sale = {
        id: crypto.randomUUID(),
        idVentaBackend: crypto.randomUUID(),
        cliente: formData.clienteNombre || formData.clienteId,
        fecha: fechaIso.split("T")[0],
        total: totalVenta,
        estado:
          formData.metodoPago === "CREDITO"
            ? "Pendiente"
            : "Completada",
        items: totalItems,
        saldoPendiente: formData.metodoPago === "CREDITO"
          ? totalVenta
          : 0,
      }

      setVentas((prev) => [...prev, nuevaVenta])

      // Limpiar
      setFormData({
        clienteId: "",
        clienteNombre: "",
        clienteDireccion: "",
        clienteTelefono: "",
        metodoPago: "CONTADO",
        observaciones: "",
        clienteModo: "DEFAULT",
      })
      setItems([])
      setSelectedProductId("")
      setCantidad(1)
      setPrecioUnitario(0)
      setIncluirPagos(false)
      setIncluirMovimientosExtra(false)
      setIsOpen(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Error al registrar la venta")
    }
  }


  const getStatusColor = (status: EstadoVenta) => {
    switch (status) {
      case "Completada":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "Pendiente":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "Cancelada":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      default:
        return ""
    }
  }

  // ================== RENDER ==================
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Registro de Ventas</h1>
              <p className="text-muted-foreground mt-2">Gestiona todas tus ventas en un solo lugar</p>
            </div>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground flex gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Venta
            </Button>
          </div>

          {isOpen && (
            <Card className="p-6 mb-8 space-y-6">
              <form onSubmit={handleAddSale} className="space-y-6">
                {/* Datos del cliente y venta */}
                {/* Datos del cliente y venta */}
                <div className="space-y-4">
                  {/* Selector de modo de cliente */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value="DEFAULT"
                        checked={formData.clienteModo === "DEFAULT"}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            clienteModo: "DEFAULT",
                            clienteId: DEFAULT_CLIENT_ID,
                            clienteNombre: DEFAULT_CLIENT_NAME,
                            clienteDireccion: "",
                            clienteTelefono: "",
                          }))
                        }
                      />
                      Cliente genérico ({DEFAULT_CLIENT_ID} - {DEFAULT_CLIENT_NAME})
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value="EXISTING"
                        checked={formData.clienteModo === "EXISTING"}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            clienteModo: "EXISTING",
                            clienteId: "",
                            clienteNombre: "",
                            clienteDireccion: "",
                            clienteTelefono: "",
                          }))
                        }
                      />
                      Cliente existente
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value="NEW"
                        checked={formData.clienteModo === "NEW"}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            clienteModo: "NEW",
                            clienteId: generateClientId(), // 👉 se genera automáticamente
                            clienteNombre: "",
                            clienteDireccion: "",
                            clienteTelefono: "",
                          }))
                        }
                      />
                      Cliente nuevo
                    </label>
                  </div>

                  {/* Si es EXISTING, mostrar combo de clientes */}
                  {formData.clienteModo === "EXISTING" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Seleccionar cliente</label>
                      {loadingClientes && <p className="text-xs text-muted-foreground">Cargando clientes...</p>}
                      {errorClientes && <p className="text-xs text-destructive">{errorClientes}</p>}
                      <select
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                        value={formData.clienteId}
                        onChange={(e) => {
                          const id = e.target.value
                          const cli = clientes.find((c) => c.id === id)
                          setFormData((prev) => ({
                            ...prev,
                            clienteId: id,
                            clienteNombre: cli?.nombre || "",
                          }))
                        }}
                      >
                        <option value="">-- Selecciona un cliente --</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id} - {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Campos del cliente (ID solo lectura, nombre/datos según modo) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">ID de Cliente</label>
                      <Input value={formData.clienteId} disabled />
                      <p className="text-xs text-muted-foreground mt-1">
                        El ID se genera automáticamente o viene del cliente seleccionado.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nombre del Cliente</label>
                      <Input
                        value={formData.clienteNombre}
                        disabled={formData.clienteModo === "DEFAULT" || formData.clienteModo === "EXISTING"}
                        onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
                        placeholder="Ej: Juan García"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Dirección</label>
                      <Input
                        value={formData.clienteDireccion}
                        disabled={formData.clienteModo !== "NEW"}
                        onChange={(e) => setFormData({ ...formData, clienteDireccion: e.target.value })}
                        placeholder="Ej: Managua, Nicaragua"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Teléfono</label>
                      <Input
                        value={formData.clienteTelefono}
                        disabled={formData.clienteModo !== "NEW"}
                        onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
                        placeholder="Ej: 8888-8888"
                      />
                    </div>
                  </div>

                  {/* Botón para guardar cliente solo si es NEW */}
                  {formData.clienteModo === "NEW" && (
                    <div className="flex justify-end">
                      <Button type="button" className="bg-primary/90 hover:bg-primary" onClick={handleSaveClient}>
                        Guardar cliente
                      </Button>
                    </div>
                  )}

                  {/* Método de pago / observaciones, igual que antes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Método de Pago</label>
                      <select
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                        value={formData.metodoPago}
                        onChange={(e) =>
                          setFormData({ ...formData, metodoPago: e.target.value as "CONTADO" | "CREDITO" })
                        }
                      >
                        <option value="CONTADO">CONTADO</option>
                        <option value="CREDITO">CRÉDITO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Observaciones</label>
                      <Input
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        placeholder="Ej: Venta a crédito"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={incluirPagos}
                        onChange={(e) => setIncluirPagos(e.target.checked)}
                      />
                      Incluir <b>Pagos</b> en la venta (para probar Ventas con pagos)
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={incluirMovimientosExtra}
                        onChange={(e) => setIncluirMovimientosExtra(e.target.checked)}
                      />
                      Incluir <b>Movimientos extra</b> de inventario
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={incluirPagos}
                        onChange={(e) => setIncluirPagos(e.target.checked)}
                      />
                      Incluir <b>Pagos</b> en la venta
                    </label>

                    {incluirPagos && (
                      <div className="ml-6">
                        <label className="block text-xs mb-1">Monto del pago inicial ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={montoPagoInicial}
                          onChange={(e) => setMontoPagoInicial(e.target.value)}
                          placeholder="Ej: 100"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-sm mt-2">
                      <input
                        type="checkbox"
                        checked={formData.metodoPago === "CREDITO"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            metodoPago: e.target.checked ? "CREDITO" : "CONTADO",
                          })
                        }
                      />
                      Generar cuotas (modo CRÉDITO)
                    </label>

                    {formData.metodoPago === "CREDITO" && (
                      <div className="ml-6">
                        <label className="block text-xs mb-1">Número de cuotas</label>
                        <Input
                          type="number"
                          min={1}
                          value={numeroCuotas}
                          onChange={(e) => setNumeroCuotas(Number(e.target.value) || 1)}
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Selector de productos */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">Items de la venta</h2>

                  {loadingProductos && (
                    <p className="text-sm text-muted-foreground">Cargando productos...</p>
                  )}
                  {errorProductos && (
                    <p className="text-sm text-destructive">Error cargando productos: {errorProductos}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Producto</label>
                      <select
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                      >
                        <option value="">-- Selecciona un producto --</option>
                        {productos.map((p) => (
                          <option key={p.idProducto} value={p.idProducto}>
                            {p.idProducto} - {p.nombre} (${p.precioVenta})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cantidad</label>
                      <Input
                        type="number"
                        min={1}
                        value={cantidad}
                        onChange={(e) => setCantidad(Number(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Precio Unitario ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioUnitario}
                        onChange={(e) => setPrecioUnitario(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={handleAddItem} className="bg-primary/90 hover:bg-primary">
                      Agregar producto
                    </Button>
                  </div>

                  {/* Tabla de items */}
                  {items.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                            <th className="px-3 py-2 text-right">Precio</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((i) => (
                            <tr key={i.idProducto} className="border-t">
                              <td className="px-3 py-2">
                                {i.idProducto} - {i.nombreProducto}
                              </td>
                              <td className="px-3 py-2 text-right">{i.cantidad}</td>
                              <td className="px-3 py-2 text-right">${i.precioUnitario.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">
                                ${(i.cantidad * i.precioUnitario).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRemoveItem(i.idProducto)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay productos agregados a la venta.</p>
                  )}

                  <div className="flex justify-end mt-2">
                    <p className="text-lg font-semibold">
                      Total: <span>${totalVenta.toFixed(2)}</span>
                    </p>
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
                    Registrar Venta
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Lista de ventas registradas */}
          <div className="space-y-4">
            {ventas.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No hay ventas registradas aún.</p>
              </Card>
            ) : (
              ventas.map((venta) => (
                <Card key={venta.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{venta.cliente}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Venta #{venta.id} • {venta.fecha}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(venta.estado)}`}>
                          {venta.estado}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Items</span>
                          <p className="font-semibold text-foreground">{venta.items}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total</span>
                          <p className="font-semibold text-foreground text-lg">${venta.total.toFixed(2)}</p>
                        </div>
                        {venta.saldoPendiente > 0 && (
                          <div>
                            <span className="text-muted-foreground">Saldo pendiente</span>
                            <p className="font-semibold text-red-600 text-lg">
                              ${venta.saldoPendiente.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">

                      <div className="flex gap-2 ml-4">
                        <Button size="sm" className="bg-primary/20 hover:bg-primary/30 text-primary">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" className="bg-destructive/20 hover:bg-destructive/30 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        {venta.estado === "Pendiente" && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600"
                            onClick={() => handleOpenPagoCuotas(venta)}
                          >
                            Pagar cuotas
                          </Button>
                        )}
                      </div>

                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
        {pagoModalOpen && ventaSeleccionada && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <Card className="w-full max-w-md p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Pagar cuotas - Venta {ventaSeleccionada.idVentaBackend}
              </h2>
              <p className="text-sm text-muted-foreground">
                Cliente: {ventaSeleccionada.cliente} • Total: ${ventaSeleccionada.total.toFixed(2)}
              </p>

              <form onSubmit={handleSubmitPagoCuotas} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Monto a pagar ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={montoPagoCuotas}
                    onChange={(e) => setMontoPagoCuotas(e.target.value)}
                    placeholder="Ej: 100"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPagoModalOpen(false)
                      setVentaSeleccionada(null)
                    }}
                    disabled={loadingPagoCuotas}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loadingPagoCuotas}>
                    {loadingPagoCuotas ? "Procesando..." : "Registrar pago"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </main>
    </>
  )
}