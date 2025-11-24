import { useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageMessageProps {
  imageUrl: string;
  prompt: string;
  isLoading?: boolean;
  timestamp?: Date;
}

export function ImageMessage({ imageUrl, prompt, isLoading, timestamp }: ImageMessageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
            <p className="text-sm text-neutral-400">Generating your image...</p>
            <p className="text-xs text-neutral-500">{prompt.substring(0, 100)}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-400">Failed to load image</p>
          <p className="text-xs text-neutral-500">{prompt}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {/* Image Container */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 group">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          </div>
        )}

        <img
          src={imageUrl}
          alt={prompt}
          className={cn(
            "w-full h-auto object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        {/* Hover Overlay with Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <Button
            onClick={handleDownload}
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleOpenInNewTab}
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </div>

      {/* Prompt & Metadata */}
      <div className="space-y-1 px-1">
        <p className="text-xs text-neutral-400 line-clamp-2">{prompt}</p>
        {timestamp && (
          <p className="text-xs text-neutral-600">
            {new Date(timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
