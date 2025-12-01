import { NextRequest, NextResponse } from "next/server"

const LAMBDA_URL =
  "https://2jnrrllkhzjcxisftnm37h4h5u0mgjdw.lambda-url.us-east-2.on.aws/" // la misma de préstamos

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() // { PrestamoId, Monto, FechaPago }

    const res = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Prestamos.RegisterPayment",
        Payload: payload,
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error("ERROR /api/prestamos/pago:", err)
    return NextResponse.json(
      { ok: false, error: err.message ?? "ERROR" },
      { status: 500 },
    )
  }
}
