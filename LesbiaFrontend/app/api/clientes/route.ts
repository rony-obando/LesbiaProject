import { NextRequest, NextResponse } from "next/server"

// 👇 URL REAL de tu Lambda de clientes (similar a la de ventas pero la de clientes)
const CLIENTES_URL = "https://nmdgkptwlgejugy5vqhgmwmglu0lslrb.lambda-url.us-east-2.on.aws/"

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    // Por ahora solo usamos Clientes.Save
    const action = (body.action as string) || "Clientes.Save"
    const payload = body.payload

    // 👇 Esto es lo que verá tu Lambda:
    // { "Action": "Clientes.Save", "Payload": { ... } }
    const lambdaBody: any = { Action: action }
    if (payload) {
      lambdaBody.Payload = payload
    }

    console.log("Enviando a Lambda Clientes:", JSON.stringify(lambdaBody))

    const res = await fetch(CLIENTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lambdaBody),
    })

    const text = await res.text()

    if (!res.ok) {
      console.error("Error Lambda Clientes:", res.status, text)
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
    console.error("Error en /api/clientes:", err)
    return NextResponse.json(
      { ok: false, message: err.message || "Error interno en /api/clientes" },
      { status: 500 },
    )
  }
}
