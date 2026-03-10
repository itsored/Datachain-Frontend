import { NextResponse } from "next/server"

export const runtime = "nodejs"

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs"

export async function GET(_: Request, { params }: { params: { cid: string } }) {
  const cid = params.cid?.trim()
  if (!cid) {
    return NextResponse.json({ error: "CID is required" }, { status: 400 })
  }

  try {
    const res = await fetch(`${DEFAULT_GATEWAY}/${encodeURIComponent(cid)}`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Gateway error: ${text}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch IPFS metadata" }, { status: 500 })
  }
}
