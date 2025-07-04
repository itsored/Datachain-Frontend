import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const PINATA_JWT = process.env.PINATA_JWT
  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: "Server misconfiguration: PINATA_JWT env var not set" },
      { status: 500 },
    )
  }

  try {
    const body = await request.json()

    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(body),
    })

    if (!pinataRes.ok) {
      const text = await pinataRes.text()
      return NextResponse.json({ error: `Pinata error: ${text}` }, { status: 500 })
    }

    const data = await pinataRes.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 })
  }
} 