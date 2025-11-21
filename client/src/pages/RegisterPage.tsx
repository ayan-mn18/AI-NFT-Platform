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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/context/AuthContext"

// Zod Schemas
const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  user_type: z.enum(["buyer", "merchant"]),
})

const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
})

type RegisterFormValues = z.infer<typeof registerSchema>
type VerifyFormValues = z.infer<typeof verifySchema>

const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-200">
    {children}
  </label>
)

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, verifyEmail } = useAuth()
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Register Form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      user_type: "buyer",
    },
  })

  // Verify Form
  const verifyForm = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      otp: "",
    },
  })

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        user_type: data.user_type,
        full_name: data.full_name,
      })
      setRegisteredEmail(data.email)
      setStep('verify')
    } catch (error) {
      // Error is handled in AuthContext (toast)
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const onVerifySubmit = async (data: VerifyFormValues) => {
    setIsLoading(true)
    try {
      await verifyEmail({
        email: registeredEmail,
        otp: data.otp,
      })
      navigate('/nft-gen')
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
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
        <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400 font-heading">
          AuraMint
        </span>
      </div>

      <Card className="w-full max-w-md bg-neutral-900/50 border-white/10 backdrop-blur-xl relative z-10 shadow-2xl shadow-black/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white font-heading">
            {step === 'register' ? 'Create an account' : 'Verify your email'}
          </CardTitle>
          <CardDescription className="text-center text-neutral-400">
            {step === 'register'
              ? 'Enter your details to start minting'
              : `We sent a code to ${registeredEmail}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'register' ? (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="space-y-2">
                <FormLabel htmlFor="full_name">Full Name</FormLabel>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                  {...registerForm.register("full_name")}
                />
                {registerForm.formState.errors.full_name && (
                  <p className="text-xs text-red-400">{registerForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="email">Email</FormLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-red-400">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="password">Password</FormLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password ? (
                  <p className="text-xs text-red-400">{registerForm.formState.errors.password.message}</p>
                ) : (
                  <p className="text-[10px] text-neutral-500">
                    Must contain 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <FormLabel>I am a...</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`cursor-pointer rounded-lg border p-4 flex flex-col items-center gap-2 transition-all ${registerForm.watch("user_type") === 'buyer' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-neutral-950/30 border-white/10 text-neutral-400 hover:bg-white/5'}`}
                    onClick={() => registerForm.setValue("user_type", "buyer")}
                  >
                    <span className="font-medium">Collector</span>
                  </div>
                  <div
                    className={`cursor-pointer rounded-lg border p-4 flex flex-col items-center gap-2 transition-all ${registerForm.watch("user_type") === 'merchant' ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-neutral-950/30 border-white/10 text-neutral-400 hover:bg-white/5'}`}
                    onClick={() => registerForm.setValue("user_type", "merchant")}
                  >
                    <span className="font-medium">Creator</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-6 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                {isLoading ? 'Creating account...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
              <div className="space-y-2 flex flex-col items-center">
                <FormLabel htmlFor="otp">Verification Code</FormLabel>
                <InputOTP
                  maxLength={6}
                  value={verifyForm.watch("otp")}
                  onChange={(value) => verifyForm.setValue("otp", value)}
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
                {verifyForm.formState.errors.otp && (
                  <p className="text-xs text-red-400">{verifyForm.formState.errors.otp.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-6 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-neutral-400 hover:text-white cursor-pointer"
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
