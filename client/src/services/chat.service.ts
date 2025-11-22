import api from '@/lib/axios';
import type { 
  ChatSession, 
  Message, 
  ChatListResponse, 
  ChatHistoryResponse, 
  CreateChatResponse,
  ApiChat,
  ApiMessage
} from '@/types/chat';

// Map backend types to frontend types
const mapChatSession = (apiChat: ApiChat): ChatSession => ({
  id: apiChat.chat_id,
  title: apiChat.title || 'Untitled Chat',
  updatedAt: new Date(apiChat.updated_at || apiChat.created_at)
});

const mapMessage = (apiMessage: ApiMessage): Message => ({
  id: apiMessage.message_id,
  role: apiMessage.role,
  content: apiMessage.content,
  timestamp: new Date(apiMessage.created_at),
  tokensUsed: apiMessage.tokens_consumed
});

export const chatService = {
  // Get all chats
  getChats: async (limit = 20, offset = 0): Promise<ChatSession[]> => {
    try {
      const response = await api.get<ChatListResponse>(`/chat?limit=${limit}&offset=${offset}`);
      return response.data.data.chats.map(mapChatSession);
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  },

  // Create a new chat
  createChat: async (title?: string): Promise<ChatSession> => {
    try {
      const response = await api.post<CreateChatResponse>('/chat', { title });
      return mapChatSession(response.data.data);
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  },

  // Get chat history
  getChatHistory: async (chatId: string, limit = 50, offset = 0): Promise<Message[]> => {
    try {
      const response = await api.get<ChatHistoryResponse>(`/chat/${chatId}?limit=${limit}&offset=${offset}`);
      // Sort messages by timestamp if needed, though backend usually returns them in order
      return response.data.data.messages.map(mapMessage);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  },

  // Delete a chat
  deleteChat: async (chatId: string): Promise<void> => {
    try {
      await api.delete(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  },

  // Send message with SSE streaming
  sendMessageStream: async (
    chatId: string, 
    content: string, 
    onChunk: (chunk: string) => void, 
    onComplete: (metadata: { tokens_used: number, message_id: string }) => void,
    onError: (error: any) => void
  ): Promise<void> => {
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      console.log('Initiating SSE stream to:', `${baseURL}/chat/${chatId}/message`)
      
      const response = await fetch(`${baseURL}/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
        credentials: 'include', // Important for cookies
      });

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error response:', errorData)
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let chunkBuffer = '' // Buffer chunks for batching
      let lastFlushTime = Date.now()
      const BATCH_DELAY = 16 // ~60fps, flush at least this often
      const BATCH_SIZE = 500 // Characters to batch before flushing

      const flushChunks = () => {
        if (chunkBuffer) {
          onChunk(chunkBuffer)
          chunkBuffer = ''
          lastFlushTime = Date.now()
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Stream reading complete')
          // Flush any remaining buffered chunks
          flushChunks()
          break
        }
        
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep the last incomplete chunk
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            try {
              // Try to parse as JSON (for metadata or error)
              const parsed = JSON.parse(data)
              
              if (parsed.error) {
                console.error('Error from stream:', parsed)
                flushChunks()
                onError(parsed)
                return
              }
              
              if (parsed.done && parsed.tokens_used !== undefined) {
                console.log('Stream complete with metadata:', parsed)
                flushChunks()
                onComplete(parsed)
                return
              }
              
              // If it parses but isn't metadata, treat as content (edge case)
              console.log('Parsed data as JSON but not metadata, treating as chunk')
              chunkBuffer += data
            } catch (e) {
              // Not JSON, so it's a text chunk
              if (data.trim()) {
                chunkBuffer += data
              }
            }
            
            // Flush chunks if buffer is large enough or enough time has passed
            const timeSinceLastFlush = Date.now() - lastFlushTime
            if (chunkBuffer.length >= BATCH_SIZE || timeSinceLastFlush >= BATCH_DELAY) {
              flushChunks()
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      onError(error)
    }
  }
};
