export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const PINATA_JWT = process.env.PINATA_JWT
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "Server misconfiguration: PINATA_JWT env var not set" }, { status: 500 })
  }

  try {
    const form = await request.formData()
    const file = form.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file field provided" }, { status: 400 })
    }

    const pinataForm = new FormData()
    pinataForm.append("file", file, file.name)

    // optional: forward pinata options if provided via fields
    const pinataMetadata = form.get("pinataMetadata")
    if (pinataMetadata) {
      pinataForm.append("pinataMetadata", pinataMetadata as string)
    }

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataForm as any,
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Pinata error: ${text}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 })
  }
} 