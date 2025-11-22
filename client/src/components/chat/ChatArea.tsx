import { useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./MessageBubble"
import { ChatInput } from "./ChatInput"
import type { Message } from "@/types/chat"
import { Sparkles } from "lucide-react"

interface ChatAreaProps {
  messages: Message[]
  isStreaming: boolean
  isThinking?: boolean
  onSendMessage: (content: string) => void
}

export function ChatArea({ messages, isStreaming, isThinking, onSendMessage }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isStreaming, isThinking])

  return (
    <div className="flex flex-col flex-1 h-full bg-neutral-950 relative">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6 py-6 pb-32">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-50">
              <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center border border-white/10">
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Start Creating</h3>
                <p className="text-sm text-neutral-400 max-w-xs mx-auto mt-2">
                  Describe the NFT you want to generate, and Aura will help you visualize it.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={msg.role === 'assistant' && isStreaming && msg.id === messages[messages.length - 1].id}
                />
              ))}

              {isThinking && (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="absolute bottom-6 left-0 right-0 px-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSend={onSendMessage} isLoading={isStreaming || isThinking} />
        </div>
      </div>
    </div>
  )
}
