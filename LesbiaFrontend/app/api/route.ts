import { NextResponse } from "next/server"

const LAMBDA_URL =
  "https://nhkydwczu5ipw7ijm6kprl2rau0baoyr.lambda-url.us-east-2.on.aws/"

export async function POST() {
  try {
    const res = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Action: "Productos.GetAll",
      }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: `Error HTTP Lambda: ${res.status}` },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { ok: false, message: "Error llamando a Lambda" },
      { status: 500 },
    )
  }
}
