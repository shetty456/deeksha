import type { ConversationTurn, InterviewContext } from "@/lib/llm/types"

export interface Question {
  id: string
  question: string
  category: string
  difficulty: string
}

export interface InterviewConfig {
  interviewId: string
  question: Question
  category: string
  difficulty: string
  durationSeconds: number
}

export type InterviewState =
  | "idle"
  | "intro"
  | "listening"
  | "processing"
  | "responding"
  | "completed"
  | "error"

export class InterviewEngine {
  private config: InterviewConfig | null = null
  private history: ConversationTurn[] = []
  private turnSequence = 0

  state: InterviewState = "idle"

  start(config: InterviewConfig): void {
    this.config = config
    this.state = "intro"
    this.history = []
    this.turnSequence = 0
  }

  get interviewId(): string {
    return this.config?.interviewId ?? ""
  }

  get currentQuestion(): Question | null {
    return this.config?.question ?? null
  }

  get conversationHistory(): ConversationTurn[] {
    return [...this.history]
  }

  get nextSequence(): number {
    return ++this.turnSequence
  }

  addInterviewerTurn(text: string): void {
    this.history.push({ speaker: "interviewer", text })
  }

  addCandidateTurn(text: string): void {
    this.history.push({ speaker: "candidate", text })
  }

  shouldContinue(): boolean {
    return this.state !== "completed"
  }

  getContext(): InterviewContext {
    if (!this.config) throw new Error("Engine not started")

    // Only send last 10 turns to keep context lean
    const recentHistory = this.history.slice(-10)

    return {
      category: this.config.category,
      difficulty: this.config.difficulty,
      question: this.config.question.question,
      history: recentHistory,
    }
  }

  end(): void {
    this.state = "completed"
  }
}
