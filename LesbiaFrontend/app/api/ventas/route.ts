import { NextRequest, NextResponse } from "next/server"

// 👇 URL REAL de tu Lambda de ventas
const VENTAS_URL = "https://atdodtlsuktlxspapk2hcvsj3i0ooain.lambda-url.us-east-2.on.aws/"

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const action = (body.action as string) || "Ventas.Save"
    const payload = body.payload

    // 👇 Esto es lo que verá tu Lambda:
    // { "Action": "Ventas.GetAll" }  o  { "Action": "Ventas.Save", "Payload": { ... } }
    const lambdaBody: any = { Action: action }
    if (payload) {
      lambdaBody.Payload = payload
    }

    // Opcional para debug:
    console.log("Enviando a Lambda Ventas:", JSON.stringify(lambdaBody))

    const res = await fetch(VENTAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lambdaBody),
    })

    const text = await res.text()

    if (!res.ok) {
      console.error("Error Lambda Ventas:", res.status, text)
      return NextResponse.json(
        { ok: false, status: res.status, body: text },
        { status: res.status },
      )
    }

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    console.error("Error en /api/ventas:", err)
    return NextResponse.json(
      { ok: false, message: err.message || "Error interno en /api/ventas" },
      { status: 500 },
    )
  }
}