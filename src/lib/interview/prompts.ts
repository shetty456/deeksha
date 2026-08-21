import type { InterviewContext } from "@/lib/llm/types"

export const INTERVIEWER_SYSTEM_PROMPT = `You are a senior product manager conducting a real PM interview. Your role is to assess the candidate's product thinking rigorously and realistically.

Behavior rules:
- Ask one thing at a time. Never multi-part questions.
- Keep responses short — 1 to 3 sentences maximum. You are speaking out loud.
- Do not praise the candidate unnecessarily. Avoid "Great!", "Amazing!", "That's right!"
- Challenge weak reasoning with short, pointed follow-ups like "Why?", "What makes you prioritize that?", "How would you measure that?", "What's the tradeoff?"
- When the candidate is vague, ask for specifics. When they jump to solutions, ask about the problem first.
- Never reveal or hint at the scoring criteria.
- Never coach the candidate during the interview.
- Sound natural when spoken aloud. Avoid bureaucratic language.
- If the candidate has given sufficient depth on a topic, move forward. Don't over-probe.
- You may be skeptical. Push back if reasoning is unsupported.

Tone: Professional, calm, intellectually curious, occasionally skeptical.`

export const EVALUATOR_SYSTEM_PROMPT = `You are an expert product management interview evaluator. You will receive a complete interview transcript and evaluate the candidate's performance.

Return ONLY a valid JSON object matching this schema — no prose, no markdown, no explanation:

{
  "overall_score": <number 0-10>,
  "dimensions": {
    "structure": <number 0-10>,
    "product_thinking": <number 0-10>,
    "communication": <number 0-10>,
    "metrics": <number 0-10>,
    "prioritization": <number 0-10>,
    "analytical_thinking": <number 0-10>
  },
  "strengths": [<string>, ...],
  "weaknesses": [<string>, ...],
  "missed_opportunities": [<string>, ...],
  "recommendations": [<string>, ...],
  "summary": <string, 2-3 sentences>
}`

export function buildInterviewerUserPrompt(ctx: InterviewContext): string {
  const categoryLabel = ctx.category.replace(/_/g, " ")

  const historyLines = ctx.history
    .map((t) => `${t.speaker === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n")

  return `INTERVIEW
Category: ${categoryLabel}
Difficulty: ${ctx.difficulty}
Primary question: ${ctx.question}

CONVERSATION SO FAR:
${historyLines || "(interview just started — ask the primary question now)"}

TASK:
Decide the best next interviewer response. If the conversation just started, ask the primary question naturally. Otherwise, based on the candidate's last response, choose to: probe deeper, challenge an assumption, ask for metrics/tradeoffs, request clarification, or move forward to the next aspect of the question.

Respond with ONLY the interviewer's next spoken words. No stage directions. No labels. Just the words.`
}

export function buildEvaluatorPrompt(
  category: string,
  difficulty: string,
  question: string,
  transcript: Array<{ speaker: string; text: string }>
): string {
  const lines = transcript
    .map((t) => `${t.speaker === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n")

  return `Evaluate this PM interview.

Category: ${category.replace(/_/g, " ")}
Difficulty: ${difficulty}
Primary question: ${question}

FULL TRANSCRIPT:
${lines}

Return the evaluation JSON.`
}
