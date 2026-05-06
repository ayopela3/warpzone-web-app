"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react"

interface ProductImageCarouselProps {
  imageUrl: string | null
  productName: string
}

export default function ProductImageCarousel({ imageUrl, productName }: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // For now, we only have one image, but the carousel is ready for multiple images
  const images = imageUrl ? [imageUrl] : []
  
  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index)
  }

  // Only show carousel controls if there are multiple images
  const showControls = images.length > 1

  return (
    <div className={`flex flex-col ${showControls ? 'h-full' : 'h-full'}`}>
      {/* Main Image */}
      <div className={`flex ${showControls ? 'flex-1' : 'flex-1'} items-center justify-start bg-[linear-gradient(135deg,#fff7cc,#ffffff)] p-8`}>
        {images.length > 0 && images[currentIndex] ? (
          <img
            src={images[currentIndex]}
            alt={productName}
            className="max-h-[500px] w-full object-contain"
          />
        ) : (
          <div className="flex h-[500px] w-full items-center justify-center rounded-3xl border-2 border-primary bg-white shadow-xl">
            <ShoppingBag className="h-20 w-20 text-primary" />
          </div>
        )}
      </div>

      {/* Carousel Controls - Only show if there are multiple images */}
      {showControls && (
        <div className="flex items-center justify-center gap-2 p-3 border-t border-neutral-200">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={images.length <= 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Thumbnails */}
          <div className="flex gap-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={`h-16 w-16 rounded-lg border-2 overflow-hidden transition-all ${
                  index === currentIndex 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <img
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={images.length <= 1}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
