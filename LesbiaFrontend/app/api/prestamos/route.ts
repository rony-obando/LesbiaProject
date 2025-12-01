// app/api/prestamos/route.ts
import { NextRequest, NextResponse } from "next/server"

const LAMBDA_URL =
  "https://2jnrrllkhzjcxisftnm37h4h5u0mgjdw.lambda-url.us-east-2.on.aws/" // 👈 pon aquí la URL de la lambda de préstamos

// 🔹 GUARDAR PRÉSTAMO (Prestamos.Save)
export async function POST(req: NextRequest) {
  try {
    // payload = { Prestamo: {...}, Cuotas: [...] } que manda el frontend
    const payload = await req.json()

    const res = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Prestamos.Save",
        Payload: payload,
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error("ERROR /api/prestamos POST:", err)
    return NextResponse.json(
      { ok: false, error: err.message ?? "ERROR" },
      { status: 500 },
    )
  }
}

// 🔹 LISTAR PRÉSTAMOS (Prestamos.GetAll ó Prestamos.GetAllResumen)
export async function GET() {
  try {
    const res = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Prestamos.GetAll", // 👈 usa el action que te devuelve { ok, prs }
        Payload: {},
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error("ERROR /api/prestamos GET:", err)
    return NextResponse.json(
      { ok: false, error: err.message ?? "ERROR" },
      { status: 500 },
    )
  }
}
