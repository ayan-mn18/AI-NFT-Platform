import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Sparkles, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"

// Simple Label component if not exists in shadcn default install (it usually does but let's be safe or use standard)
const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-200">
    {children}
  </label>
)

export default function RegisterPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    user_type: "buyer" // Default to buyer (Collector)
  })
  const [otp, setOtp] = useState("")

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setStep('verify')
      // In real app, we would call POST /api/auth/register here
    }, 1500)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      navigate('/nft-gen')
      // In real app, we would call POST /api/auth/verify-email here
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-8 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400">
          AuraMint
        </span>
      </div>

      <Card className="w-full max-w-md bg-neutral-900/50 border-white/10 backdrop-blur-xl relative z-10 shadow-2xl shadow-black/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            {step === 'register' ? 'Create an account' : 'Verify your email'}
          </CardTitle>
          <CardDescription className="text-center text-neutral-400">
            {step === 'register'
              ? 'Enter your details to start minting'
              : `We sent a code to ${formData.email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <FormLabel htmlFor="full_name">Full Name</FormLabel>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="email">Email</FormLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="password">Password</FormLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-[10px] text-neutral-500">
                  Must contain 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
                </p>
              </div>

              <div className="space-y-2">
                <FormLabel>I am a...</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`cursor-pointer rounded-lg border p-4 flex flex-col items-center gap-2 transition-all ${formData.user_type === 'buyer' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-neutral-950/30 border-white/10 text-neutral-400 hover:bg-white/5'}`}
                    onClick={() => setFormData({ ...formData, user_type: 'buyer' })}
                  >
                    <span className="font-medium">Collector</span>
                  </div>
                  <div
                    className={`cursor-pointer rounded-lg border p-4 flex flex-col items-center gap-2 transition-all ${formData.user_type === 'merchant' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-neutral-950/30 border-white/10 text-neutral-400 hover:bg-white/5'}`}
                    onClick={() => setFormData({ ...formData, user_type: 'merchant' })}
                  >
                    <span className="font-medium">Creator</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-6"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {isLoading ? 'Creating account...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2 flex flex-col items-center">
                <FormLabel htmlFor="otp">Verification Code</FormLabel>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="bg-neutral-950/50 border-white/10 text-white" />
                    <InputOTPSlot index={1} className="bg-neutral-950/50 border-white/10 text-white" />
                    <InputOTPSlot index={2} className="bg-neutral-950/50 border-white/10 text-white" />
                    <InputOTPSlot index={3} className="bg-neutral-950/50 border-white/10 text-white" />
                    <InputOTPSlot index={4} className="bg-neutral-950/50 border-white/10 text-white" />
                    <InputOTPSlot index={5} className="bg-neutral-950/50 border-white/10 text-white" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-6"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-neutral-400 hover:text-white"
                onClick={() => setStep('register')}
                type="button"
              >
                Back to Register
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/5 pt-6">
          <div className="text-sm text-neutral-400">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
