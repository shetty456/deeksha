export interface ConversationTurn {
  speaker: "interviewer" | "candidate"
  text: string
}

export interface InterviewContext {
  category: string
  difficulty: string
  question: string
  history: ConversationTurn[]
}

export interface InterviewModel {
  generateResponse(context: InterviewContext): AsyncIterable<string>
}
