import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, LogIn } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/context/AuthContext"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

const FormLabel = ({ children, htmlFor }: { children: React.ReactNode, htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-200">
    {children}
  </label>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      await login({ email: data.email, password: data.password })
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
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
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
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-neutral-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel htmlFor="email">Email</FormLabel>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel htmlFor="password">Password</FormLabel>
                <Link to="#" className="text-xs text-purple-400 hover:text-purple-300">Forgot password?</Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-neutral-950/50 border-white/10 focus-visible:ring-purple-500/50 text-white placeholder:text-neutral-600"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-6 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/5 pt-6">
          <div className="text-sm text-neutral-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
