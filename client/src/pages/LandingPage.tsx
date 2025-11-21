import { Button } from "@/components/ui/button"
import { Sparkles, Wallet, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"

const AnimatedNumber = ({
  value,
  start = 0,
  duration = 2000,
  suffix = "",
  decimals = 0
}: {
  value: number,
  start?: number,
  duration?: number,
  suffix?: string,
  decimals?: number
}) => {
  const [displayValue, setDisplayValue] = useState(start)
  const startTimeRef = useRef<number | null>(null)
  const requestRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time
      const progress = Math.min((time - startTimeRef.current) / duration, 1)

      // Easing function (easeOutQuart)
      const easeOut = 1 - Math.pow(1 - progress, 4)

      const current = start + (value - start) * easeOut
      setDisplayValue(current)

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate)
      }
    }

    requestRef.current = requestAnimationFrame(animate)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [value, start, duration])

  return (
    <span>
      {displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-purple-500/30 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      {/* Navbar (Minimal) */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400 font-heading">
            AuraMint
          </span>
        </div>
        {isAuthenticated ? (
          <Button
            variant="ghost"
            className="text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer gap-2"
            onClick={() => navigate('/profile')}
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            onClick={() => navigate('/register')}
          >
            Login / Sign Up
          </Button>
        )}
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span className="font-medium">AI-Powered Generation Live</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight font-heading">
            <span className="bg-clip-text text-transparent bg-linear-to-b from-white via-white to-neutral-500">
              Mint the Future of
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-purple-500 to-indigo-500">
              Digital Art
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            AuraMint is the premier AI-powered platform for Web3 enthusiasts.
            Generate, mint, and trade unique digital assets with zero gas fees.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-14 rounded-full text-lg shadow-lg shadow-purple-500/25 transition-all hover:scale-105 cursor-pointer"
              onClick={() => navigate('/nft-gen')}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Generating
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white px-8 h-14 rounded-full text-lg backdrop-blur-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Wallet className="mr-2 h-5 w-5" />
              View Gallery
            </Button>
          </div>

          {/* Stats / Social Proof */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-3 gap-8 text-center border-t border-white/5 mt-12">
            <div>
              <div className="text-2xl font-bold text-white">
                <AnimatedNumber value={10000} suffix="+" />
              </div>
              <div className="text-sm text-neutral-500">NFTs Minted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                <AnimatedNumber value={5000} suffix="+" />
              </div>
              <div className="text-sm text-neutral-500">Artists</div>
            </div>
            <div className="hidden md:block">
              <div className="text-2xl font-bold text-white">
                <AnimatedNumber start={100} value={0} decimals={2} suffix=" ETH" />
              </div>
              <div className="text-sm text-neutral-500">Gas Fees</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
