import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Groq from "groq-sdk"
import { INTERVIEWER_SYSTEM_PROMPT, buildInterviewerUserPrompt } from "@/lib/interview/prompts"
import type { InterviewContext } from "@/lib/llm/types"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let context: InterviewContext
  try {
    context = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const apiKey = process.env.LLM_API_KEY
  const model  = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile"

  if (!apiKey) {
    return NextResponse.json({ error: "LLM not configured" }, { status: 500 })
  }

  const groq = new Groq({ apiKey })

  let stream: Awaited<ReturnType<typeof groq.chat.completions.create>>
  try {
    stream = await groq.chat.completions.create({
      model,
      stream: true,
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: "system", content: INTERVIEWER_SYSTEM_PROMPT },
        { role: "user",   content: buildInterviewerUserPrompt(context) },
      ],
    })
  } catch (err) {
    console.error("[respond] Groq error:", err)
    return NextResponse.json({ error: "LLM request failed" }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        console.error("[respond] Stream error:", err)
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
