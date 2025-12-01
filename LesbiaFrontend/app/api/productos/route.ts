// app/api/productos/route.ts
import { NextRequest, NextResponse } from "next/server"

const LAMBDA_URL =
  "https://nhkydwczu5ipw7ijm6kprl2rau0baoyr.lambda-url.us-east-2.on.aws/"

export async function POST(req: NextRequest) {
  try {
    const producto = await req.json()

    const res = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Productos.Save",
        Payload: producto, // 👈 aquí sí va el objeto
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error("ERROR /api/productos:", err)
    return NextResponse.json(
      { ok: false, error: err.message ?? "ERROR" },
      { status: 500 },
    )
  }
}
