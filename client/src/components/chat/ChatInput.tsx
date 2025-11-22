import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, isLoading, placeholder = "Describe the NFT you want to create..." }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  return (
    <div className="relative flex items-end gap-2 p-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50">
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-11 max-h-[200px] w-full resize-none bg-transparent border-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 px-4 py-3"
          disabled={isLoading}
        />
      </div>
      <Button
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        className="h-11 w-11 shrink-0 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 mb-0.5 mr-0.5"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5 ml-0.5" />
        )}
      </Button>
    </div>
  )
}
