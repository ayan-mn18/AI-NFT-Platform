import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowLeft, Zap, Image as ImageIcon, Settings2, Crown, Download, Share2, RefreshCw, Send, ChevronDown, Check, Loader2, Upload, X, ImagePlus, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { imageGenerationService, createBase64Reference, createUrlReference, type ReferenceImage as ApiReferenceImage } from "@/services/imageGeneration.service"
import { chatService } from "@/services/chat.service"

// Demo images
import wolf1 from "@/assets/wolf1.png"
import wolf2 from "@/assets/wolf2.png"
import wolfAstronaut from "@/assets/wolf-astronaut.png"

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

  // Demo images data
  const demoImages: GeneratedImage[] = [
    {
      id: "demo-1",
      url: wolfAstronaut,
      prompt: "A majestic wolf astronaut floating in space with Earth in the background, digital art style",
      timestamp: new Date(),
      model: "gemini-2.5-flash",
      resolution: "1024x1024",
    },
    {
      id: "demo-2",
      url: wolf1,
      prompt: "A fierce wolf with glowing eyes in a mystical forest, fantasy art",
      timestamp: new Date(Date.now() - 60000),
      model: "gemini-2.5-flash",
      resolution: "1024x1024",
    },
    {
      id: "demo-3",
      url: wolf2,
      prompt: "A cyberpunk wolf with neon accents in a futuristic city, vibrant colors",
      timestamp: new Date(Date.now() - 120000),
      model: "gemini-2.5-pro",
      resolution: "1024x1024",
    },
  ]

  // Generation state
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(demoImages)
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(demoImages[0])

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

  // Update mode based on reference images
  useEffect(() => {
    setGenerationMode(referenceImages.length > 0 ? "image-to-image" : "text-to-image")
  }, [referenceImages])

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
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `auramint-${image.id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("Image downloaded!")
    } catch (error) {
      toast.error("Failed to download image")
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

      {/* Left Panel - Settings */}
      <aside className="w-72 border-r border-white/10 bg-neutral-900/50 backdrop-blur-sm flex flex-col shrink-0 relative z-10">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5"
            onClick={() => navigate("/nft-gen")}
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
            <div className="w-8 h-8 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-neutral-400 font-heading">
              AuraMint Studio
            </span>
          </div>
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 rounded-full border border-white/10">
            <span className={`text-xs font-medium ${generationMode === "text-to-image" ? "text-purple-400" : "text-neutral-500"}`}>
              Text
            </span>
            <div className="w-px h-3 bg-white/20" />
            <span className={`text-xs font-medium ${generationMode === "image-to-image" ? "text-blue-400" : "text-neutral-500"}`}>
              Image
            </span>
          </div>
        </header>

        {/* Image Display / Generation Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-6 pb-48">
              {generatedImages.length === 0 ? (
                /* Empty State */
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
                  {/* Selected Image Preview */}
                  {selectedImage && (
                    <div className="space-y-4">
                      <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/50">
                        <img
                          src={selectedImage.url}
                          alt={selectedImage.prompt}
                          className="w-full aspect-square object-cover"
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
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
                      </div>
                      <p className="text-sm text-neutral-400 px-1">
                        <span className="text-white/80">Prompt:</span> {selectedImage.prompt}
                      </p>
                    </div>
                  )}

                  {/* Image Grid */}
                  {generatedImages.length > 1 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-400 mb-3">Previous Generations</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {generatedImages.map((img, idx) => (
                          <button
                            key={`${img.id}-${idx}`}
                            onClick={() => setSelectedImage(img)}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage?.id === img.id
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
                  className="flex-1 bg-transparent text-white placeholder:text-neutral-500 resize-none py-3 text-sm focus:outline-none min-h-12 max-h-32 leading-normal"
                  style={{ overflow: "hidden" }}
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

            <p className="text-xs text-center text-neutral-500">
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

      {/* Right Panel - Credits & Rate Limiting */}
      < aside className="w-64 border-l border-white/10 bg-neutral-900/50 backdrop-blur-sm flex flex-col shrink-0 relative z-10" >
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
    </div >
  )
}
