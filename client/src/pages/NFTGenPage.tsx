import { useState } from "react"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { ChatArea } from "@/components/chat/ChatArea"
import type { Message, ChatSession } from "@/types/chat"
import { useAuth } from "@/context/AuthContext"
import { Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function NFTGenPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>('1')

  // Mock Data - To be replaced with API calls
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Cyberpunk Cityscape', updatedAt: new Date() },
    { id: '2', title: 'Abstract Fluid Art', updatedAt: new Date(Date.now() - 86400000) },
    { id: '3', title: 'Pixel Art Character', updatedAt: new Date(Date.now() - 172800000) },
  ])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Aura, your AI NFT assistant. Describe the artwork you'd like to create today.",
      timestamp: new Date()
    }
  ])

  const handleSendMessage = (content: string) => {
    // Optimistic update
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    setIsThinking(true)

    // Simulate API delay and streaming
    setTimeout(() => {
      setIsThinking(false)
      setIsStreaming(true)

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've analyzed your request for "${content}". Here is a concept that matches your vision:

### **Neon Horizon: Cyberpunk Dreams**

This artwork captures the essence of a futuristic metropolis at twilight.

**Key Elements:**
*   **Color Palette:** Deep indigos, electric pinks, and cyan highlights.
*   **Composition:** Low-angle perspective looking up at towering skyscrapers.
*   **Atmosphere:** Heavy rain reflecting neon signs on the wet pavement.

**Suggested Style:**
> "A high-fidelity digital painting with ray-traced reflections and volumetric fog."

I'm now generating the high-resolution preview for you... 🎨`,
        timestamp: new Date(),
        tokensUsed: 150
      }
      setMessages(prev => [...prev, aiResponse])

      // Stop streaming after a delay to simulate text generation
      setTimeout(() => setIsStreaming(false), 2000)
    }, 2000)
  }

  const handleNewChat = () => {
    const newId = Date.now().toString()
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      updatedAt: new Date()
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newId)
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: "Hello! I'm Aura. Start a new creative journey by describing your idea.",
      timestamp: new Date()
    }])
  }

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) {
      setCurrentSessionId('')
      setMessages([])
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
          isThinking={isThinking}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  )
}