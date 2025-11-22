import { cn } from "@/lib/utils"
import { Sparkles, Copy, Check, Flag } from "lucide-react"
import type { Message } from "@/types/chat"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useState } from "react"
import { toast } from "sonner"

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast.success("Copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy")
    }
  }

  const handleReport = () => {
    toast.success("Response reported")
  }

  return (
    <div className={cn(
      "group flex w-full gap-4 py-2 relative",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1 border border-white/10">
          <Sparkles className="w-4 h-4 text-white/80" />
        </div>
      )}

      <div className={cn(
        "max-w-[85%] space-y-1 overflow-hidden flex flex-col",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "text-base leading-relaxed font-sans px-5 py-3.5",
          isUser
            ? "bg-neutral-800 text-white rounded-3xl rounded-tr-sm"
            : "text-neutral-200 pl-0"
        )}>
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-invert prose-neutral max-w-none 
              prose-p:leading-7 prose-p:my-3
              prose-headings:font-semibold prose-headings:text-white prose-headings:mt-6 prose-headings:mb-3
              prose-ul:my-3 prose-li:my-1
              prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-sm
              prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-white/10 prose-pre:p-4 prose-pre:rounded-xl
              prose-strong:text-white
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 align-middle bg-white animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>

        {!isUser && !isStreaming && (
          <div className="flex items-center gap-1 pl-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleCopy}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Copy response"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleReport}
              className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              title="Report response"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
