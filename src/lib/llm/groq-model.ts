import Groq from "groq-sdk"
import type { InterviewModel, InterviewContext } from "./types"
import { INTERVIEWER_SYSTEM_PROMPT, buildInterviewerUserPrompt } from "@/lib/interview/prompts"

export class GroqInterviewModel implements InterviewModel {
  private client: Groq
  private model: string

  constructor() {
    this.client = new Groq({ apiKey: process.env.LLM_API_KEY })
    this.model = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile"
  }

  async *generateResponse(context: InterviewContext): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: INTERVIEWER_SYSTEM_PROMPT },
        { role: "user", content: buildInterviewerUserPrompt(context) },
      ],
      stream: true,
      max_tokens: 200,
      temperature: 0.7,
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) yield text
    }
  }
}
