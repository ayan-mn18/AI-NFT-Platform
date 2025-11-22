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
    <div className="flex flex-col flex-1 h-full bg-linear-to-b from-neutral-950 via-neutral-950 to-neutral-900 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-0 relative z-10" ref={scrollRef}>
        <div className="max-w-3xl mx-auto w-full space-y-6 py-8 px-4 pb-32">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                <Sparkles className="w-8 h-8 text-white/80" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-white">Start Creating</h3>
                <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                  Describe the NFT you want to generate, and Aura will help you bring it to life.
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
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-neutral-950 via-neutral-950 to-transparent z-20">
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput onSend={onSendMessage} isLoading={isStreaming || isThinking} />
          <p className="text-xs text-center text-neutral-500 mt-2">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}
