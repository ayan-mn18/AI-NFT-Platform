import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { userService } from "@/services/user.service"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, LogOut, Mail, Shield, Calendar, ArrowLeft, Sparkles, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/types/auth"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { logout, user: contextUser } = useAuth()
  const [user, setUser] = useState<User | null>(contextUser)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userService.getProfile()
        setUser(response.data)
      } catch (error) {
        console.error("Failed to fetch profile", error)
        toast.error("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("User ID copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-neutral-400">Could not load user profile.</p>
        <Button onClick={() => navigate('/')} variant="outline">Go Home</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-6 md:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Button
            variant="ghost"
            className="text-neutral-400 hover:text-white gap-2 pl-0 hover:bg-transparent transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-2" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 cursor-pointer">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-purple-600 to-indigo-600 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-1000"></div>
              <Avatar className="w-32 h-32 border-4 border-neutral-950 relative">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                <AvatarFallback className="bg-neutral-900 text-4xl text-neutral-400">
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-bold font-heading tracking-tight">{user.full_name || 'Anonymous User'}</h1>
              <div className="flex items-center justify-center gap-2 text-neutral-400">
                <span className={`inline-block w-2 h-2 rounded-full ${user.email_verified ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'}`}></span>
                <span className="text-sm font-medium">{user.user_type === 'merchant' ? 'Creator' : 'Collector'}</span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid gap-4 md:grid-cols-2 mt-8">
            <div className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.07]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:text-purple-300 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-sm text-neutral-400 font-medium">Email</span>
              </div>
              <p className="text-neutral-200 font-medium pl-11 truncate">{user.email}</p>
            </div>

            <div className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.07]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:text-blue-300 transition-colors">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-sm text-neutral-400 font-medium">Status</span>
              </div>
              <p className="text-neutral-200 font-medium pl-11 flex items-center gap-2">
                {user.email_verified ? 'Verified Account' : 'Pending Verification'}
              </p>
            </div>

            <div className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.07] relative cursor-pointer" onClick={() => copyToClipboard(user.user_id)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 group-hover:text-pink-300 transition-colors">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-sm text-neutral-400 font-medium">User ID</span>
                {copied ? <Check className="w-3 h-3 text-green-500 ml-auto" /> : <Copy className="w-3 h-3 text-neutral-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <p className="text-neutral-200 font-mono text-sm pl-11 truncate opacity-80">{user.user_id}</p>
            </div>

            <div className="group p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.07]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:text-orange-300 transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-sm text-neutral-400 font-medium">Joined</span>
              </div>
              <p className="text-neutral-200 font-medium pl-11">
                {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center pt-8">
            <Button
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 gap-2 px-6"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
