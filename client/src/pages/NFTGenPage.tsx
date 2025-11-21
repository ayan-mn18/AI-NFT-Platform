import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sparkles, Send, Plus, MessageSquare, Settings, User, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  date: string
}

export default function NFTGenPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Aura, your AI NFT assistant. Describe the artwork you'd like to create today.",
      timestamp: new Date()
    }
  ])

  const [history] = useState<ChatSession[]>([
    { id: '1', title: 'Cyberpunk Cityscape', date: 'Today' },
    { id: '2', title: 'Abstract Fluid Art', date: 'Yesterday' },
    { id: '3', title: 'Pixel Art Character', date: '2 days ago' },
  ])

  const handleSend = () => {
    if (!input.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm generating a concept for "${input}"... This would look amazing as a high-contrast digital painting.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 bg-neutral-900/50 flex-col hidden md:flex">
        <div className="p-4 flex items-center gap-2 border-b border-white/5">
          <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 cursor-pointer" onClick={() => navigate('/')}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight cursor-pointer" onClick={() => navigate('/')}>AuraMint</span>
        </div>

        <div className="p-4">
          <Button className="w-full justify-start gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white" variant="outline">
            <Plus className="w-4 h-4" />
            New Generation
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4">
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Recent History</div>
            <div className="space-y-1">
              {history.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  className="w-full justify-start text-neutral-400 hover:text-white hover:bg-white/5 h-auto py-3 px-3"
                >
                  <MessageSquare className="w-4 h-4 mr-3 shrink-0" />
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="truncate w-full text-sm">{chat.title}</span>
                    <span className="text-xs text-neutral-600">{chat.date}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/5 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-2 text-neutral-400 hover:text-white cursor-pointer">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-neutral-400 hover:text-white cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Mobile Header */}
        <header className="md:hidden p-4 border-b border-white/10 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-2" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">AuraMint</span>
          </div>
          <Button variant="ghost" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-8 h-8 border border-white/10">
                  {msg.role === 'assistant' ? (
                    <div className="w-full h-full bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <AvatarFallback className="bg-neutral-800 text-neutral-400">U</AvatarFallback>
                  )}
                </Avatar>

                <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 border border-white/10 text-neutral-200'
                      }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-neutral-600 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-white/5 bg-neutral-950/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Describe your NFT idea..."
                className="bg-neutral-900/50 border-white/10 focus-visible:ring-purple-500/50 min-h-[50px] pr-12 text-base"
              />
              <Button
                size="icon"
                className="absolute right-1.5 top-1.5 h-9 w-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-neutral-600">
                AI can make mistakes. Review generated NFTs before minting.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
