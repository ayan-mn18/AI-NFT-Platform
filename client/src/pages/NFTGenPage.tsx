import { useState, useEffect } from "react"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { ChatArea } from "@/components/chat/ChatArea"
import type { Message, ChatSession } from "@/types/chat"
import { useAuth } from "@/context/AuthContext"
import { Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { chatService } from "@/services/chat.service"
import { toast } from "sonner"

export default function NFTGenPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Fetch chats on mount
  useEffect(() => {
    loadChats()
  }, [])

  // Fetch messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadChatHistory(currentSessionId)
    } else {
      setMessages([])
    }
  }, [currentSessionId])

  const loadChats = async () => {
    try {
      const fetchedSessions = await chatService.getChats()
      setSessions(fetchedSessions)

      // If we have sessions but no current session selected, select the most recent one
      if (fetchedSessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(fetchedSessions[0].id)
      }
    } catch (error) {
      toast.error("Failed to load chat history")
    }
  }

  const loadChatHistory = async (chatId: string) => {
    setIsLoadingHistory(true)
    try {
      const history = await chatService.getChatHistory(chatId)
      setMessages(history)
    } catch (error) {
      toast.error("Failed to load messages")
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) {
      console.warn('No current session ID, cannot send message')
      toast.error("Please select a chat or create a new one")
      return
    }

    // Optimistic update
    const tempId = Date.now().toString()
    const newMessage: Message = {
      id: tempId,
      role: 'user',
      content,
      timestamp: new Date()
    }

    // Create placeholder for AI response
    const aiPlaceholderId = (Date.now() + 1).toString()
    const aiPlaceholder: Message = {
      id: aiPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage, aiPlaceholder])
    setIsThinking(true)

    console.log('Sending message to chat:', currentSessionId)

    try {
      await chatService.sendMessageStream(
        currentSessionId,
        content,
        (chunk) => {
          console.log('Received chunk batch, length:', chunk.length)
          setIsThinking(false)
          setIsStreaming(false)
          // Update only the last message (AI response placeholder)
          setMessages(prev => {
            const updated = [...prev]
            const lastIndex = updated.length - 1
            if (updated[lastIndex].id === aiPlaceholderId) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + chunk
              }
            }
            return updated
          })
        },
        (metadata) => {
          console.log('Stream completed, tokens used:', metadata.tokens_used)
          setIsStreaming(false)
          setIsThinking(false)
          setMessages(prev => prev.map(msg =>
            msg.id === aiPlaceholderId
              ? { ...msg, id: metadata.message_id, tokensUsed: metadata.tokens_used }
              : msg
          ))
          // Refresh chat list to update timestamps/previews if needed
          loadChats()
        },
        (error) => {
          console.error('Stream error:', error)
          setIsThinking(false)
          setIsStreaming(false)
          const errorMessage = error instanceof Error ? error.message : (error?.message || "Failed to generate response")
          toast.error(errorMessage)
          // Remove the placeholder if it's empty or show error state
          setMessages(prev => prev.filter(msg => msg.id !== aiPlaceholderId || msg.content.length > 0))
        }
      )
    } catch (err) {
      console.error('Unexpected error in handleSendMessage:', err)
      setIsThinking(false)
      setIsStreaming(false)
      toast.error("An unexpected error occurred")
      setMessages(prev => prev.filter(msg => msg.id !== aiPlaceholderId))
    }
  }

  const handleNewChat = async () => {
    try {
      const newSession = await chatService.createChat("New Conversation")
      setSessions(prev => [newSession, ...prev])
      setCurrentSessionId(newSession.id)
      setMessages([]) // Start with empty messages or a welcome message
      toast.success("New chat created")
    } catch (error: any) {
      if (error.response?.data?.code === 'MAX_CHATS_EXCEEDED') {
        toast.error("Maximum chat limit reached. Please delete an old chat.")
      } else {
        toast.error("Failed to create new chat")
      }
    }
  }

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await chatService.deleteChat(id)
      setSessions(prev => prev.filter(s => s.id !== id))

      if (currentSessionId === id) {
        // If we deleted the current chat, switch to the next available one or clear
        const remainingSessions = sessions.filter(s => s.id !== id)
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id)
        } else {
          setCurrentSessionId('')
          setMessages([])
        }
      }
      toast.success("Chat deleted")
    } catch (error) {
      toast.error("Failed to delete chat")
    }
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        className="hidden md:flex"
        user={user}
        onLogout={() => {
          logout()
          navigate('/login')
        }}
      />
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-white/10 bg-neutral-900/50 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">AuraMint</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Mobile Menu Trigger could go here */}
          </div>
        </header>

        {/* Chat Area */}
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          isThinking={isThinking || isLoadingHistory}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  )
}