import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import Groq from "groq-sdk"
import { EvaluationSchema } from "@/lib/evaluation/schema"
import { EVALUATOR_SYSTEM_PROMPT, buildEvaluatorPrompt } from "@/lib/interview/prompts"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { interview_id } = await req.json()

  if (!interview_id) {
    return NextResponse.json({ error: "Missing interview_id" }, { status: 400 })
  }

  // Verify ownership
  const { data: interview } = await supabase
    .from("interviews")
    .select("id, category, difficulty")
    .eq("id", interview_id)
    .eq("user_id", user.id)
    .single()

  if (!interview) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Fetch transcript
  const { data: turns } = await supabase
    .from("conversation_turns")
    .select("speaker, text, sequence")
    .eq("interview_id", interview_id)
    .order("sequence", { ascending: true })

  if (!turns || turns.length === 0) {
    return NextResponse.json({ error: "No transcript found" }, { status: 422 })
  }

  // Fetch the primary question
  const { data: iqRow } = await supabase
    .from("interview_questions")
    .select("question_id, questions(question)")
    .eq("interview_id", interview_id)
    .order("sequence", { ascending: true })
    .limit(1)
    .single()

  const questionsData = iqRow?.questions
  const primaryQuestion =
    (Array.isArray(questionsData) ? (questionsData[0] as { question: string } | undefined)?.question : (questionsData as { question: string } | null | undefined)?.question)
    ?? "Product Management question"

  const groq = new Groq({ apiKey: process.env.LLM_API_KEY })
  const model = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile"

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: EVALUATOR_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildEvaluatorPrompt(
          interview.category,
          interview.difficulty,
          primaryQuestion,
          turns
        ),
      },
    ],
    max_tokens: 1500,
    temperature: 0.3,
  })

  const raw = completion.choices[0]?.message?.content ?? ""

  let parsed
  try {
    // Strip markdown code fences if present
    const json = raw.replace(/```(?:json)?\n?/g, "").trim()
    parsed = EvaluationSchema.parse(JSON.parse(json))
  } catch {
    console.error("Evaluation parse error:", raw)
    return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 })
  }

  const serviceClient = await createServiceClient()

  await serviceClient.from("evaluations").upsert({
    interview_id,
    overall_score: parsed.overall_score,
    communication_score: parsed.dimensions.communication,
    structure_score: parsed.dimensions.structure,
    product_thinking_score: parsed.dimensions.product_thinking,
    analytical_thinking_score: parsed.dimensions.analytical_thinking,
    prioritization_score: parsed.dimensions.prioritization,
    metrics_score: parsed.dimensions.metrics,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    missed_opportunities: parsed.missed_opportunities,
    recommendations: parsed.recommendations,
    summary: parsed.summary,
    raw_response: parsed,
  })

  // Update interview overall score
  await serviceClient
    .from("interviews")
    .update({ overall_score: parsed.overall_score, status: "completed" })
    .eq("id", interview_id)

  return NextResponse.json({ evaluation: parsed })
}
