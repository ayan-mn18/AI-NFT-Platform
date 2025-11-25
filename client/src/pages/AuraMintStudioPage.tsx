import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowLeft, Zap, Image as ImageIcon, Settings2, Crown, Download, Share2, RefreshCw, Send, ChevronDown, Check, Loader2, Upload, X, ImagePlus, Wand2, Maximize2, ChevronLeft, ChevronRight, User, Calendar } from "lucide-react"
import { toast } from "sonner"
import { imageGenerationService, createBase64Reference, createUrlReference, getUserImages, type ReferenceImage as ApiReferenceImage, type ImageWithMetadata } from "@/services/imageGeneration.service"
import { chatService } from "@/services/chat.service"

// Types
interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: Date
  model: string
  resolution: string
  isReference?: boolean
}

// Reference image can be from file upload (base64) or from a URL (already generated)
interface ReferenceImage {
  id: string
  file?: File // Present when uploaded from local
  url?: string // Present when using an already generated image
  preview: string
  type: 'file' | 'url' // Track the source type
}

interface ImageSettings {
  numberOfImages: number
  resolution: string
  model: string
  style: string
}

// User image history grouped by date
interface ImageHistoryByDate {
  [date: string]: ImageWithMetadata[]
}

// Model options
const MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Fast & efficient", icon: Zap },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "High quality", icon: Crown },
]

const RESOLUTIONS = [
  { id: "1024x1024", label: "1:1", description: "Square" },
  { id: "1024x1792", label: "9:16", description: "Portrait" },
  { id: "1792x1024", label: "16:9", description: "Landscape" },
]

const STYLES = [
  { id: "none", label: "None" },
  { id: "anime", label: "Anime" },
  { id: "digital-art", label: "Digital Art" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "3d-render", label: "3D Render" },
  { id: "watercolor", label: "Watercolor" },
  { id: "oil-painting", label: "Oil Painting" },
  { id: "pixel-art", label: "Pixel Art" },
]

export default function AuraMintStudioPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Settings state
  const [settings, setSettings] = useState<ImageSettings>({
    numberOfImages: 1,
    resolution: "1024x1024",
    model: "gemini-2.5-flash",
    style: "none",
  })

  // Generation state
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [viewingGenerating, setViewingGenerating] = useState(false) // Track if user wants to see the generating state

  // User image history grouped by date
  const [imageHistory, setImageHistory] = useState<ImageHistoryByDate>({})
  const [totalImageCount, setTotalImageCount] = useState(0)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  // Fullscreen modal state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null)

  // Mobile settings sheet state
  const [showMobileSettings, setShowMobileSettings] = useState(false)
  const [showMobileCredits, setShowMobileCredits] = useState(false)

  // Reference images for image-to-image
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const [generationMode, setGenerationMode] = useState<"text-to-image" | "image-to-image">("text-to-image")

  // Credits & rate limiting
  const [credits, setCredits] = useState(97)
  const [dailyGenerations, setDailyGenerations] = useState(3)
  const [maxDailyGenerations] = useState(50)

  // Dropdown states
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showResolutionDropdown, setShowResolutionDropdown] = useState(false)
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)

  // Chat session for image generation
  const [chatId, setChatId] = useState<string | null>(null)

  // Open fullscreen modal
  const openFullscreen = (image: GeneratedImage) => {
    setFullscreenImage(image)
    setIsFullscreen(true)
  }

  // Get all images combined (current session + history)
  const getAllImages = useCallback(() => {
    return [
      ...generatedImages,
      ...Object.entries(imageHistory)
        .sort(([dateA], [dateB]) => {
          const [dayA, monthA, yearA] = dateA.split('/').map(Number)
          const [dayB, monthB, yearB] = dateB.split('/').map(Number)
          const dA = new Date(yearA, monthA - 1, dayA)
          const dB = new Date(yearB, monthB - 1, dayB)
          return dB.getTime() - dA.getTime()
        })
        .flatMap(([, images]) =>
          images.map(img => ({
            id: img.imageId,
            url: img.imageUrl,
            prompt: img.prompt,
            timestamp: new Date(img.timestamp),
            model: 'gemini',
            resolution: '1024x1024',
          }))
        ),
    ]
  }, [generatedImages, imageHistory])

  // Navigate in fullscreen
  const navigateFullscreen = (direction: 'prev' | 'next') => {
    if (!fullscreenImage) return
    const allImages = getAllImages()
    const currentIndex = allImages.findIndex(img => img.id === fullscreenImage.id)
    if (currentIndex === -1) return

    let newIndex: number
    if (direction === 'prev') {
      newIndex = currentIndex <= 0 ? allImages.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex >= allImages.length - 1 ? 0 : currentIndex + 1
    }
    setFullscreenImage(allImages[newIndex])
  }

  // Update mode based on reference images
  useEffect(() => {
    setGenerationMode(referenceImages.length > 0 ? "image-to-image" : "text-to-image")
  }, [referenceImages])

  // Reusable function to fetch image history
  const refreshImageHistory = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingHistory(true)
      const response = await getUserImages()
      if (response.data) {
        setImageHistory(response.data)
        setTotalImageCount(response.totalImages || 0)
      }
    } catch (error) {
      console.error("Failed to fetch image history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [user])

  // Fetch user image history on mount
  useEffect(() => {
    refreshImageHistory()
  }, [refreshImageHistory])

  // Keyboard navigation for images and fullscreen
  useEffect(() => {
    const handleKeyNavigation = (e: KeyboardEvent) => {
      // Handle fullscreen modal
      if (isFullscreen) {
        if (e.key === "Escape") {
          setIsFullscreen(false)
          return
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          navigateFullscreen('prev')
          return
        }
        if (e.key === "ArrowRight") {
          e.preventDefault()
          navigateFullscreen('next')
          return
        }
        return
      }

      // Don't navigate if user is typing in the input
      if (document.activeElement === inputRef.current) return

      // Get all images (current session + history)
      const allImages = getAllImages()

      if (allImages.length === 0) return

      const currentIndex = selectedImage
        ? allImages.findIndex(img => img.id === selectedImage.id)
        : -1

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        const newIndex = currentIndex <= 0 ? allImages.length - 1 : currentIndex - 1
        setSelectedImage(allImages[newIndex])
        setViewingGenerating(false)
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        const newIndex = currentIndex >= allImages.length - 1 ? 0 : currentIndex + 1
        setSelectedImage(allImages[newIndex])
        setViewingGenerating(false)
      }
    }

    window.addEventListener("keydown", handleKeyNavigation)
    return () => window.removeEventListener("keydown", handleKeyNavigation)
  }, [selectedImage, isFullscreen, fullscreenImage, getAllImages])

  useEffect(() => {
    const initChat = async () => {
      try {
        const chats = await chatService.getChats()
        const imageChat = chats.find(c => c.title === "AuraMint Studio")
        if (imageChat) {
          setChatId(imageChat.id)
        } else {
          const newChat = await chatService.createChat("AuraMint Studio")
          setChatId(newChat.id)
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error)
      }
    }
    initChat()
  }, [])

  // File handling
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type === "image/jpeg" || file.type === "image/png"
      if (!isValid) {
        toast.error(`${file.name} is not a valid image. Only JPEG and PNG are allowed.`)
      }
      return isValid
    })

    if (referenceImages.length + validFiles.length > 4) {
      toast.error("Maximum 4 reference images allowed")
      return
    }

    const newReferenceImages: ReferenceImage[] = validFiles.map(file => ({
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      type: 'file' as const,
    }))

    setReferenceImages(prev => [...prev, ...newReferenceImages])
  }, [referenceImages.length])

  const removeReferenceImage = (id: string) => {
    setReferenceImages(prev => {
      const img = prev.find(i => i.id === id)
      // Only revoke object URL for file-based references
      if (img && img.type === 'file') URL.revokeObjectURL(img.preview)
      return prev.filter(i => i.id !== id)
    })
  }

  const clearAllReferenceImages = () => {
    referenceImages.forEach(img => {
      // Only revoke object URL for file-based references
      if (img.type === 'file') URL.revokeObjectURL(img.preview)
    })
    setReferenceImages([])
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    if (dailyGenerations >= maxDailyGenerations) {
      toast.error("Daily generation limit reached")
      return
    }

    if (credits < settings.numberOfImages) {
      toast.error("Not enough credits")
      return
    }

    setIsGenerating(true)
    setViewingGenerating(true) // Show the loading state

    try {
      let enhancedPrompt = prompt
      if (settings.style !== "none") {
        enhancedPrompt = `${prompt}, in ${settings.style.replace("-", " ")} style`
      }

      // Build reference image payload if exists
      let referenceImagePayload: ApiReferenceImage | undefined
      if (referenceImages.length > 0) {
        const refImage = referenceImages[0]
        if (refImage.type === 'file' && refImage.file) {
          // Convert file to base64 for upload
          const base64Data = await fileToBase64(refImage.file)
          referenceImagePayload = createBase64Reference(base64Data)
        } else if (refImage.type === 'url' && refImage.url) {
          // Use URL directly (S3 or external)
          referenceImagePayload = createUrlReference(refImage.url)
        }
      }

      // Ensure we have a chat ID
      // if (!chatId) {
      //   toast.error("Chat session not initialized. Please wait and try again.")
      //   setIsGenerating(false)
      //   return
      // }

      for (let i = 0; i < settings.numberOfImages; i++) {
        const result = await imageGenerationService.generateImage({
          prompt: enhancedPrompt,
          chatId: chatId || "0a089cf6-44cb-4189-9dd1-07da83d06508",
          referenceImage: referenceImagePayload,
        })

        const newImage: GeneratedImage = {
          id: result.imageId,
          url: result.imageUrl,
          prompt: prompt,
          timestamp: new Date(),
          model: settings.model,
          resolution: settings.resolution,
        }

        setGeneratedImages(prev => [newImage, ...prev])
        setSelectedImage(newImage)
        setCredits(prev => prev - 1)
        setDailyGenerations(prev => prev + 1)
      }

      toast.success(`Generated ${settings.numberOfImages} image(s)!`)
      setPrompt("")

      // Refresh history to include the new image
      refreshImageHistory()
    } catch (error: any) {
      console.error("Generation failed:", error)
      toast.error(error.response?.data?.error || error.message || "Failed to generate image")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handleDownload = async (image: GeneratedImage) => {
    try {
      // Generate a random filename with timestamp
      const randomId = Math.random().toString(36).substring(2, 10)
      const timestamp = Date.now()
      const filename = `auramint-${timestamp}-${randomId}.png`

      // For S3 URLs or any external URLs, we need to fetch through our approach
      const response = await fetch(image.url, {
        mode: 'cors',
        credentials: 'omit', // Don't send cookies to S3
      })

      if (!response.ok) {
        throw new Error('Failed to fetch image')
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
      toast.success("Image downloaded!")
    } catch (error) {
      console.error('Download error:', error)
      // Fallback: open in new tab if direct download fails
      window.open(image.url, '_blank')
      toast.info("Opening image in new tab - right click to save")
    }
  }

  const handleShare = async (image: GeneratedImage) => {
    try {
      await navigator.clipboard.writeText(image.url)
      toast.success("Image URL copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  const handleRegenerate = () => {
    if (selectedImage) {
      setPrompt(selectedImage.prompt)
      inputRef.current?.focus()
    }
  }

  const handleUseAsReference = (image: GeneratedImage) => {
    // Use the image URL directly as reference (more efficient for S3 images)
    const newRef: ReferenceImage = {
      id: `ref-${Date.now()}`,
      url: image.url,
      preview: image.url,
      type: 'url' as const,
    }
    setReferenceImages(prev => [...prev.slice(0, 3), newRef])
    toast.success("Image added as reference")
  }

  const selectedModel = MODELS.find(m => m.id === settings.model) || MODELS[0]
  const selectedResolution = RESOLUTIONS.find(r => r.id === settings.resolution) || RESOLUTIONS[0]
  const selectedStyle = STYLES.find(s => s.id === settings.style) || STYLES[0]

  return (
    <div className="flex h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px]" />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Left Panel - Settings (Hidden on mobile) */}
      <aside className="hidden lg:flex w-72 border-r border-white/10 bg-neutral-900/50 backdrop-blur-sm flex-col shrink-0 relative z-10">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-md flex items-center justify-center">
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Studio</span>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Generation Mode Indicator */}
            <div className="p-3 rounded-xl border border-white/10 bg-neutral-800/30">
              <div className="flex items-center gap-2 mb-2">
                {generationMode === "text-to-image" ? (
                  <Sparkles className="w-4 h-4 text-purple-400" />
                ) : (
                  <ImagePlus className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-300">
                  {generationMode === "text-to-image" ? "Text to Image" : "Image to Image"}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {generationMode === "text-to-image"
                  ? "Generate images from your text description"
                  : "Edit or create variations using reference images"}
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                Model
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-800/50 hover:bg-neutral-800 border border-white/10 rounded-xl text-sm transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <selectedModel.icon className="w-4 h-4 text-purple-400" />
                    <span>{selectedModel.name}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showModelDropdown ? "rotate-180" : ""}`} />
                </button>
                {showModelDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                    {MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSettings(s => ({ ...s, model: model.id }))
                          setShowModelDropdown(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${settings.model === model.id ? "bg-purple-500/10" : ""}`}
                      >
                        <model.icon className={`w-4 h-4 ${settings.model === model.id ? "text-purple-400" : "text-neutral-400"}`} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-neutral-500">{model.description}</div>
                        </div>
                        {settings.model === model.id && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Resolution
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowResolutionDropdown(!showResolutionDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-800/50 hover:bg-neutral-800 border border-white/10 rounded-xl text-sm transition-colors"
                >
                  <span>{selectedResolution.label} ({selectedResolution.description})</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showResolutionDropdown ? "rotate-180" : ""}`} />
                </button>
                {showResolutionDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                    {RESOLUTIONS.map(res => (
                      <button
                        key={res.id}
                        onClick={() => {
                          setSettings(s => ({ ...s, resolution: res.id }))
                          setShowResolutionDropdown(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${settings.resolution === res.id ? "bg-purple-500/10" : ""}`}
                      >
                        <span>{res.label} ({res.description})</span>
                        {settings.resolution === res.id && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Style
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-800/50 hover:bg-neutral-800 border border-white/10 rounded-xl text-sm transition-colors"
                >
                  <span>{selectedStyle.label}</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showStyleDropdown ? "rotate-180" : ""}`} />
                </button>
                {showStyleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 max-h-48 overflow-y-auto">
                    {STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSettings(s => ({ ...s, style: style.id }))
                          setShowStyleDropdown(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-white/5 transition-colors ${settings.style === style.id ? "bg-purple-500/10" : ""}`}
                      >
                        <span>{style.label}</span>
                        {settings.style === style.id && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Number of Images */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Number of Images
              </label>
              <div className="flex gap-2">
                {[1, 2, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setSettings(s => ({ ...s, numberOfImages: num }))}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border ${settings.numberOfImages === num
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                      : "bg-neutral-800/50 border-white/10 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Settings Footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-neutral-500 text-center">
            Press Enter to generate
          </p>
        </div>
      </aside>

      {/* Main Content - Chat & Image Display */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="h-14 border-b border-white/10 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {/* Back button on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400 font-heading">
              <span className="hidden sm:inline">AuraMint Studio</span>
              <span className="sm:hidden">Studio</span>
            </span>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Mode Toggle - hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 rounded-full border border-white/10">
              <span className={`text-xs font-medium ${generationMode === "text-to-image" ? "text-purple-400" : "text-neutral-500"}`}>
                Text
              </span>
              <div className="w-px h-3 bg-white/20" />
              <span className={`text-xs font-medium ${generationMode === "image-to-image" ? "text-blue-400" : "text-neutral-500"}`}>
                Image
              </span>
            </div>

            {/* Mobile Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={() => setShowMobileSettings(true)}
            >
              <Settings2 className="w-5 h-5" />
            </Button>

            {/* Mobile Credits Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-neutral-400 hover:text-white hover:bg-white/5"
              onClick={() => setShowMobileCredits(true)}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Image Display / Generation Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-48">
              {generatedImages.length === 0 && Object.keys(imageHistory).length === 0 && !isLoadingHistory ? (
                /* Empty State - only show when no current session images AND no history */
                <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg">
                    <ImageIcon className="w-10 h-10 text-white/60" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-white">Create Amazing NFT Art</h3>
                    <p className="text-neutral-400 max-w-md mx-auto leading-relaxed">
                      Describe your vision and let AI bring it to life. Upload reference images for image-to-image generation.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {["Cosmic dragon", "Neon cityscape", "Abstract portrait", "Fantasy landscape"].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setPrompt(suggestion)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-neutral-300 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Generated Images Grid */
                <div className="space-y-6">
                  {/* Selected Image Preview or Loading State */}
                  {isGenerating && viewingGenerating ? (
                    /* Cool Loading Animation */
                    <div className="space-y-4">
                      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50 aspect-square">
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 bg-linear-to-br from-purple-900/40 via-neutral-900 to-blue-900/40 animate-pulse" />

                        {/* Animated circles */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            {/* Outer ring */}
                            <div className="absolute inset-0 w-32 h-32 border-4 border-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                            {/* Middle ring */}
                            <div className="absolute inset-2 w-28 h-28 border-4 border-indigo-500/30 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                            {/* Inner spinning ring */}
                            <div className="w-32 h-32 border-4 border-transparent border-t-purple-500 border-r-indigo-500 rounded-full animate-spin" style={{ animationDuration: '1s' }} />
                            {/* Center icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 bg-linear-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                                <Sparkles className="w-8 h-8 text-white animate-pulse" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Floating particles */}
                        <div className="absolute inset-0 overflow-hidden">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 bg-purple-400/60 rounded-full animate-bounce"
                              style={{
                                left: `${15 + i * 15}%`,
                                top: `${20 + (i % 3) * 25}%`,
                                animationDelay: `${i * 0.2}s`,
                                animationDuration: `${1 + i * 0.3}s`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Bottom text */}
                        <div className="absolute bottom-6 left-0 right-0 text-center">
                          <p className="text-sm font-medium text-white/80 mb-1">Generating your masterpiece...</p>
                          <p className="text-xs text-neutral-400">This may take a few seconds</p>
                        </div>
                      </div>
                    </div>
                  ) : selectedImage ? (
                    <div className="space-y-4">
                      <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50">
                        <img
                          src={selectedImage.url}
                          alt={selectedImage.prompt}
                          className="w-full aspect-square object-cover cursor-pointer"
                          onClick={() => openFullscreen(selectedImage)}
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                            onClick={() => openFullscreen(selectedImage)}
                            title="Fullscreen"
                          >
                            <Maximize2 className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                            onClick={() => handleDownload(selectedImage)}
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                            onClick={() => handleShare(selectedImage)}
                            title="Copy URL"
                          >
                            <Share2 className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                            onClick={handleRegenerate}
                            title="Regenerate"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                            onClick={() => handleUseAsReference(selectedImage)}
                            title="Use as Reference"
                          >
                            <ImagePlus className="w-5 h-5" />
                          </Button>
                        </div>
                        {/* Navigation hint */}
                        {(generatedImages.length + Object.values(imageHistory).flat().length) > 1 && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            Use ← → arrow keys to navigate
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 px-1">
                        <span className="text-white/80">Prompt:</span> {selectedImage.prompt}
                      </p>
                    </div>
                  ) : null}

                  {/* Image Grid */}
                  {(generatedImages.length > 1 || isGenerating) && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-3">
                        {isGenerating ? "Generating..." : "This Session"}
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        {/* Generating placeholder tile */}
                        {isGenerating && (
                          <button
                            onClick={() => setViewingGenerating(true)}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${viewingGenerating
                              ? "border-purple-500 ring-2 ring-purple-500/30"
                              : "border-white/10 hover:border-white/30"
                              }`}
                          >
                            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                              <div className="relative">
                                <div className="w-8 h-8 border-2 border-transparent border-t-purple-500 border-r-indigo-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Sparkles className="w-3 h-3 text-purple-400" />
                                </div>
                              </div>
                            </div>
                          </button>
                        )}
                        {generatedImages.map((img, idx) => (
                          <button
                            key={`${img.id}-${idx}`}
                            onClick={() => {
                              setSelectedImage(img)
                              setViewingGenerating(false)
                            }}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage?.id === img.id && !viewingGenerating
                              ? "border-purple-500 ring-2 ring-purple-500/30"
                              : "border-white/10 hover:border-white/30"
                              }`}
                          >
                            <img
                              src={img.url}
                              alt={img.prompt}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Generations History - Grouped by Date */}
                  {(Object.keys(imageHistory).length > 0 || isLoadingHistory) && (
                    <div className="mt-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-neutral-400">
                          Previous Generations
                        </h4>
                        {totalImageCount > 0 && (
                          <span className="text-xs text-neutral-500">
                            {totalImageCount} total images
                          </span>
                        )}
                      </div>

                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                          <span className="ml-2 text-sm text-neutral-400">Loading history...</span>
                        </div>
                      ) : (
                        Object.entries(imageHistory)
                          .sort(([dateA], [dateB]) => {
                            // Parse DD/MM/YYYY format and sort descending (newest first)
                            const [dayA, monthA, yearA] = dateA.split('/').map(Number)
                            const [dayB, monthB, yearB] = dateB.split('/').map(Number)
                            const dA = new Date(yearA, monthA - 1, dayA)
                            const dB = new Date(yearB, monthB - 1, dayB)
                            return dB.getTime() - dA.getTime()
                          })
                          .map(([date, images]) => (
                            <div key={date} className="space-y-3">
                              <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{date}</span>
                                <span className="text-neutral-600">•</span>
                                <span>{images.length} {images.length === 1 ? 'image' : 'images'}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-3">
                                {images.map((img, idx) => (
                                  <button
                                    key={`${img.imageId}-${idx}`}
                                    onClick={() => {
                                      setSelectedImage({
                                        id: img.imageId,
                                        url: img.imageUrl,
                                        prompt: img.prompt,
                                        timestamp: new Date(img.timestamp),
                                        model: 'gemini',
                                        resolution: '1024x1024',
                                      })
                                      setViewingGenerating(false)
                                    }}
                                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage?.id === img.imageId && !viewingGenerating
                                      ? "border-purple-500 ring-2 ring-purple-500/30"
                                      : "border-white/10 hover:border-white/30"
                                      }`}
                                  >
                                    <img
                                      src={img.imageUrl}
                                      alt={img.prompt}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input Area with Image Upload */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-neutral-950 via-neutral-950/95 to-transparent z-20">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Reference Images Preview */}
            {referenceImages.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-xl">
                <div className="flex gap-2 flex-1 overflow-x-auto py-1">
                  {referenceImages.map(img => (
                    <div key={img.id} className="relative group shrink-0">
                      <img
                        src={img.preview}
                        alt="Reference"
                        className="w-16 h-16 rounded-lg object-cover border border-white/10"
                      />
                      <button
                        onClick={() => removeReferenceImage(img.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={clearAllReferenceImages}
                  className="text-xs text-neutral-400 hover:text-white px-2 py-1 hover:bg-white/5 rounded transition-colors shrink-0"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Drop Zone / Upload Area */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative transition-transform duration-200 ease-out ${isDragging ? "scale-[1.02]" : "scale-100"}`}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-purple-500/10 border-2 border-dashed border-purple-500/50 rounded-2xl flex items-center justify-center z-30 backdrop-blur-sm">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-purple-300">Drop images here</p>
                    <p className="text-xs text-neutral-400 mt-1">JPEG or PNG only</p>
                  </div>
                </div>
              )}

              <div className="relative flex items-center gap-3 bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
                {/* Upload Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-20 w-20 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload reference images"
                >
                  <Upload className="w-5 h-5" />
                </Button>

                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    referenceImages.length > 0
                      ? "Describe how to edit or transform the image..."
                      : "Describe the NFT you want to create..."
                  }
                  rows={1}
                  disabled={isGenerating}
                  className="flex-1 bg-transparent text-white placeholder:text-neutral-500 resize-none py-3 text-sm focus:outline-none min-h-12 max-h-32 leading-normal scrollbar-none"
                  style={{ overflowY: 'auto' }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = "auto"
                    target.style.height = Math.min(target.scrollHeight, 128) + "px"
                  }}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="h-12 w-12 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-neutral-500 hidden sm:block">
              {referenceImages.length > 0 ? (
                <span className="text-blue-400">Image-to-Image mode</span>
              ) : (
                "Drop images or click upload for image-to-image"
              )}
              {" • "}Enter to generate • Shift+Enter for new line
            </p>
          </div>
        </div>
      </main >

      {/* Right Panel - Credits & Rate Limiting (Hidden on mobile) */}
      <aside className="hidden lg:flex w-64 border-l border-white/10 bg-neutral-900/50 backdrop-blur-sm flex-col shrink-0 relative z-10">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center px-4 gap-2" >
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold text-sm">Usage & Credits</span>
        </div >

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {/* Credits Display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Credits</span>
                <span className="text-xs text-purple-400">{credits} remaining</span>
              </div>
              <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-linear-to-r from-purple-600 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${credits}%` }}
                />
              </div>
              <Button
                variant="outline"
                className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
              >
                <Crown className="w-4 h-4 mr-2" />
                Get More Credits
              </Button>
            </div>

            {/* Daily Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Daily Limit</span>
                <span className="text-xs text-neutral-400">{dailyGenerations}/{maxDailyGenerations}</span>
              </div>
              <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-600 to-cyan-600 rounded-full transition-all"
                  style={{ width: `${(dailyGenerations / maxDailyGenerations) * 100}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500">
                Resets at midnight UTC
              </p>
            </div>

            {/* Rate Limit Info */}
            <div className="p-4 bg-neutral-800/50 rounded-xl border border-white/5 space-y-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Rate Limits
              </h4>
              <div className="space-y-2 text-xs text-neutral-400">
                <div className="flex justify-between">
                  <span>Per minute:</span>
                  <span className="text-white">10 generations</span>
                </div>
                <div className="flex justify-between">
                  <span>Per hour:</span>
                  <span className="text-white">100 generations</span>
                </div>
                <div className="flex justify-between">
                  <span>Per day:</span>
                  <span className="text-white">{maxDailyGenerations} generations</span>
                </div>
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 bg-neutral-800/50 rounded-xl border border-white/5 space-y-2">
                <h4 className="text-sm font-medium text-white">Account</h4>
                <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                <p className="text-xs text-neutral-500">Free Plan</p>
              </div>
            )}

            {/* Generation Stats */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Session Stats</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-800/50 rounded-xl border border-white/5 text-center">
                  <div className="text-lg font-bold text-white">{generatedImages.length}</div>
                  <div className="text-xs text-neutral-500">Generated</div>
                </div>
                <div className="p-3 bg-neutral-800/50 rounded-xl border border-white/5 text-center">
                  <div className="text-lg font-bold text-white">{referenceImages.length}</div>
                  <div className="text-xs text-neutral-500">References</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Button
            variant="ghost"
            className="w-full text-neutral-400 hover:text-white hover:bg-white/5"
            onClick={() => navigate("/profile")}
          >
            Manage Subscription
          </Button>
        </div>
      </aside >

      {/* Fullscreen Modal */}
      {isFullscreen && fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation arrows */}
          {(generatedImages.length + Object.values(imageHistory).flat().length) > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigateFullscreen('prev')
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigateFullscreen('next')
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image container */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.prompt}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
            />

            {/* Image info and actions */}
            <div className="flex flex-col items-center gap-4 max-w-2xl">
              <p className="text-sm text-neutral-300 text-center line-clamp-2">
                {fullscreenImage.prompt}
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white gap-2"
                  onClick={() => handleDownload(fullscreenImage)}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white gap-2"
                  onClick={() => handleShare(fullscreenImage)}
                >
                  <Share2 className="w-4 h-4" />
                  Copy URL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white gap-2"
                  onClick={() => {
                    handleUseAsReference(fullscreenImage)
                    setIsFullscreen(false)
                  }}
                >
                  <ImagePlus className="w-4 h-4" />
                  Use as Reference
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white gap-2"
                  onClick={() => {
                    setPrompt(fullscreenImage.prompt)
                    setIsFullscreen(false)
                    inputRef.current?.focus()
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </Button>
              </div>

              {/* Image metadata */}
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span>{fullscreenImage.model}</span>
                <span>•</span>
                <span>{fullscreenImage.resolution}</span>
                <span>•</span>
                <span>{new Date(fullscreenImage.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Settings Bottom Sheet */}
      {showMobileSettings && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileSettings(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-lg">Generation Settings</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-white"
                onClick={() => setShowMobileSettings(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="max-h-[calc(85vh-100px)] p-6">
              <div className="space-y-6">
                {/* Generation Mode */}
                <div className="p-4 rounded-xl border border-white/10 bg-neutral-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    {generationMode === "text-to-image" ? (
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    ) : (
                      <ImagePlus className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-sm font-medium">
                      {generationMode === "text-to-image" ? "Text to Image" : "Image to Image"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {generationMode === "text-to-image"
                      ? "Generate images from your text description"
                      : "Edit or create variations using reference images"}
                  </p>
                </div>

                {/* Model Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Model</label>
                  <div className="grid gap-2">
                    {MODELS.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSettings(s => ({ ...s, model: model.id }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${settings.model === model.id
                          ? "bg-purple-500/10 border-purple-500/50"
                          : "bg-neutral-800/50 border-white/10 hover:bg-neutral-800"
                          }`}
                      >
                        <model.icon className={`w-5 h-5 ${settings.model === model.id ? "text-purple-400" : "text-neutral-400"}`} />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{model.name}</div>
                          <div className="text-xs text-neutral-500">{model.description}</div>
                        </div>
                        {settings.model === model.id && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Resolution</label>
                  <div className="grid grid-cols-2 gap-2">
                    {RESOLUTIONS.map(res => (
                      <button
                        key={res.id}
                        onClick={() => setSettings(s => ({ ...s, resolution: res.id }))}
                        className={`p-3 rounded-xl border text-center transition-colors ${settings.resolution === res.id
                          ? "bg-purple-500/10 border-purple-500/50"
                          : "bg-neutral-800/50 border-white/10 hover:bg-neutral-800"
                          }`}
                      >
                        <div className="text-sm font-medium">{res.label}</div>
                        <div className="text-xs text-neutral-500">{res.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSettings(s => ({ ...s, style: style.id }))}
                        className={`p-3 rounded-xl border text-sm transition-colors ${settings.style === style.id
                          ? "bg-purple-500/10 border-purple-500/50"
                          : "bg-neutral-800/50 border-white/10 hover:bg-neutral-800"
                          }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Images */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Number of Images</label>
                  <div className="flex gap-3">
                    {[1, 2, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => setSettings(s => ({ ...s, numberOfImages: num }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${settings.numberOfImages === num
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                          : "bg-neutral-800/50 border-white/10 text-neutral-400 hover:bg-neutral-800"
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Mobile Credits Bottom Sheet */}
      {showMobileCredits && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMobileCredits(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-lg">Usage & Credits</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-white"
                onClick={() => setShowMobileCredits(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="max-h-[calc(85vh-100px)] p-6">
              <div className="space-y-6">
                {/* Credits Display */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-400">Credits</span>
                    <span className="text-sm text-purple-400 font-medium">{credits} remaining</span>
                  </div>
                  <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-linear-to-r from-purple-600 to-indigo-600 rounded-full transition-all"
                      style={{ width: `${credits}%` }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Get More Credits
                  </Button>
                </div>

                {/* Daily Usage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-400">Daily Limit</span>
                    <span className="text-sm text-neutral-300">{dailyGenerations}/{maxDailyGenerations}</span>
                  </div>
                  <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-linear-to-r from-blue-600 to-cyan-600 rounded-full transition-all"
                      style={{ width: `${(dailyGenerations / maxDailyGenerations) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500">
                    Resets at midnight UTC
                  </p>
                </div>

                {/* Rate Limit Info */}
                <div className="p-4 bg-neutral-800/50 rounded-xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Rate Limits
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-neutral-400">
                      <span>Per minute:</span>
                      <span className="text-white">10 generations</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Per hour:</span>
                      <span className="text-white">100 generations</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Per day:</span>
                      <span className="text-white">{maxDailyGenerations} generations</span>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                {user && (
                  <div className="p-4 bg-neutral-800/50 rounded-xl border border-white/5 space-y-2">
                    <h4 className="text-sm font-medium text-white">Account</h4>
                    <p className="text-sm text-neutral-400 truncate">{user.email}</p>
                    <p className="text-xs text-neutral-500">Free Plan</p>
                  </div>
                )}

                {/* Session Stats */}
                <div className="space-y-3">
                  <span className="text-sm font-medium text-neutral-400">Session Stats</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-neutral-800/50 rounded-xl border border-white/5 text-center">
                      <div className="text-2xl font-bold text-white">{generatedImages.length}</div>
                      <div className="text-xs text-neutral-500">Generated</div>
                    </div>
                    <div className="p-4 bg-neutral-800/50 rounded-xl border border-white/5 text-center">
                      <div className="text-2xl font-bold text-white">{referenceImages.length}</div>
                      <div className="text-xs text-neutral-500">References</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </ScrollArea>
          </div>
        </div>
      )}
    </div >
  )
}
