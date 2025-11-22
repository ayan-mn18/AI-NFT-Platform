import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, isLoading, placeholder = "Message Aura..." }: ChatInputProps) {
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
    <div className="relative flex items-end gap-2 p-2 bg-neutral-800/50 rounded-3xl border border-white/5 focus-within:border-white/10 focus-within:bg-neutral-800 transition-all duration-200">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-11 max-h-[200px] w-full resize-none bg-transparent border-0 text-white placeholder:text-neutral-400 focus-visible:ring-0 px-4 py-3 font-medium text-base"
        disabled={isLoading}
      />

      <Button
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        className="h-10 w-10 shrink-0 rounded-full bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed mb-1 mr-1 transition-all duration-200"
        size="icon"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </Button>
    </div>
  )
}
