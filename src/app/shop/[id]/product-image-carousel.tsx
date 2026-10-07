"use client"

import { useState } from "react"
import { ShoppingBag } from "lucide-react"

interface ProductImageCarouselProps {
  imageUrl: string | null
  productName: string
}

export default function ProductImageCarousel({ imageUrl, productName }: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // For now, we only have one image, but the carousel is ready for multiple images
  const images = imageUrl ? [imageUrl] : []
  
  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index)
  }

  // Only show thumbnails if there are multiple images
  const showThumbnails = images.length > 1

  return (
    <div className="flex h-full gap-3">
      {/* Thumbnails - Vertical on the left (Amazon style) */}
      {showThumbnails && (
        <div className="flex w-20 flex-shrink-0 flex-col gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border transition-all ${
                index === currentIndex 
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-foreground"
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
      )}

      {/* Main Image */}
      <div className="flex flex-1 items-center justify-center bg-muted p-8">
        {images.length > 0 && images[currentIndex] ? (
          <img
            src={images[currentIndex]}
            alt={productName}
            className="max-h-[500px] w-full object-contain"
          />
        ) : (
          <div className="flex h-[500px] w-full items-center justify-center rounded-md border border-border bg-card">
            <ShoppingBag className="h-20 w-20 text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
