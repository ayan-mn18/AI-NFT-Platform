import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Sparkles, User, Copy, Flag, Check } from "lucide-react"
import type { Message } from "@/types/chat"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn(
      "group flex w-full gap-4 p-6 rounded-2xl transition-all duration-200 relative",
      isUser
        ? "bg-neutral-900/50 border border-white/5"
        : "bg-neutral-900/30 border border-white/5 hover:bg-neutral-900/50 hover:border-white/10"
    )}>
      <Avatar className={cn(
        "w-8 h-8 border shrink-0",
        isUser ? "border-white/10 bg-neutral-800" : "border-purple-500/20 bg-purple-500/10"
      )}>
        {isUser ? (
          <AvatarFallback className="bg-neutral-800 text-white">
            <User className="w-4 h-4" />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage src="/aura-avatar.png" />
            <AvatarFallback className="bg-purple-600 text-white">
              <Sparkles className="w-4 h-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white font-sans">
              {isUser ? "You" : "Aura"}
            </span>
            <span className="text-xs text-neutral-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Action Buttons - Only for AI responses */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-400 hover:text-white hover:bg-white/10"
                onClick={handleCopy}
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                title="Report issue"
              >
                <Flag className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className={cn(
          "text-sm leading-relaxed font-sans",
          isUser ? "text-neutral-200" : "text-neutral-100"
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none 
              prose-headings:font-semibold prose-headings:text-white prose-headings:mt-4 prose-headings:mb-2
              prose-p:text-neutral-200 prose-p:leading-relaxed prose-p:my-2
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:my-2 prose-li:my-0.5
              prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-white/10 prose-pre:p-4 prose-pre:rounded-lg
              prose-blockquote:border-l-purple-500 prose-blockquote:bg-purple-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-neutral-300 prose-blockquote:not-italic
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom renderer for code blocks if needed, but prose handles most
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-purple-500 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {!isUser && message.tokensUsed && (
          <div className="pt-2 flex items-center gap-2">
            <div className="text-[10px] text-neutral-500 bg-neutral-950/50 px-2 py-1 rounded-md border border-white/5 font-mono">
              {message.tokensUsed} tokens
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
