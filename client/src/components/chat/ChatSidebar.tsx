import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Plus, MessageSquare, Trash2, Sparkles, Settings, User, LogOut, Zap } from "lucide-react"
import type { ChatSession } from "@/types/chat"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId?: string
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteChat: (id: string, e: React.MouseEvent) => void
  className?: string
  user?: { email: string } | null
  onLogout?: () => void
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteChat,
  className,
  user,
  onLogout
}: ChatSidebarProps) {
  const navigate = useNavigate()

  // Mock token usage - replace with real data later
  const tokensUsed = 1250
  const tokenLimit = 5000
  const usagePercentage = (tokensUsed / tokenLimit) * 100

  return (
    <aside className={cn("w-80 border-r border-white/10 bg-neutral-900/50 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b border-white/5">
        <div
          className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white cursor-pointer" onClick={() => navigate('/')}>
          AuraMint
        </span>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0 transition-all shadow-lg shadow-purple-900/20"
        >
          <Plus className="w-4 h-4" />
          New Generation
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 pb-4">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider px-2">
            Recent History
          </div>

          {sessions.length === 0 ? (
            <div className="text-sm text-neutral-600 text-center py-8 italic">
              No history yet
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="group relative flex items-center"
                >
                  <Button
                    variant="ghost"
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      "w-full justify-start h-auto py-3 px-3 transition-all rounded-xl",
                      currentSessionId === session.id
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <MessageSquare className={cn(
                      "w-4 h-4 mr-3 shrink-0",
                      currentSessionId === session.id ? "text-purple-400" : "text-neutral-500"
                    )} />
                    <div className="flex flex-col items-start overflow-hidden w-full">
                      <span className="truncate w-[180px] text-sm text-left font-medium">
                        {session.title || "Untitled Chat"}
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => onDeleteChat(session.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Section */}
      <div className="p-4 border-t border-white/5 bg-neutral-900/80 space-y-4">
        {/* Token Usage */}
        <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              Tokens Used
            </span>
            <span className="text-white font-medium">{tokensUsed} / {tokenLimit}</span>
          </div>
          <Progress value={usagePercentage} className="h-1.5 bg-neutral-800" />
          <p className="text-[10px] text-neutral-500">
            Resets in 14 days
          </p>
        </div>

        {/* User Actions */}
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-2 text-neutral-400 hover:text-white hover:bg-white/5 h-9 rounded-lg">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-neutral-400 hover:text-white hover:bg-white/5 h-9 rounded-lg"
            onClick={() => navigate('/profile')}
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 rounded-lg"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* User Info */}
        {user && (
          <div className="pt-2 border-t border-white/5 flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-bold border border-purple-500/20">
              {user.email[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-medium text-white truncate w-40">
                {user.email}
              </span>
              <span className="text-[10px] text-neutral-500">
                Free Plan
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
