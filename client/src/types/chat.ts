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

// Backend API Types
export interface ApiChat {
  chat_id: string
  user_id: string
  title: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiMessage {
  message_id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, any>
  tokens_consumed: number
  created_at: string
}

export interface ChatListResponse {
  status: string
  message: string
  data: {
    chats: ApiChat[]
    total: number
    active: number
  }
}

export interface ChatHistoryResponse {
  status: string
  message: string
  data: {
    chat_id: string
    title: string
    messages: ApiMessage[]
    total_messages: number
  }
}

export interface CreateChatResponse {
  status: string
  message: string
  data: ApiChat
}
