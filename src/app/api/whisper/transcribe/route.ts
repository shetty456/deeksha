import { NextRequest, NextResponse } from "next/server"

const WHISPER_SERVER = "http://127.0.0.1:8765/transcribe"

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.arrayBuffer()
  if (!body.byteLength) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(WHISPER_SERVER, {
      method: "POST",
      headers: { "Content-Type": "audio/webm", "Content-Length": String(body.byteLength) },
      body,
    })
  } catch {
    return NextResponse.json(
      { error: "Whisper server unreachable — run: npm run dev:whisper" },
      { status: 503 },
    )
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
