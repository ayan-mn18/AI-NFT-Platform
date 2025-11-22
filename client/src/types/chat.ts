export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokensUsed?: number
}

export interface ChatSession {
  id: string
  title: string
  updatedAt: Date
}
