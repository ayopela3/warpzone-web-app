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
    <div className="flex h-full gap-4">
      {/* Thumbnails - Vertical on the left (Amazon style) */}
      {showThumbnails && (
        <div className="flex flex-col gap-2 w-20 flex-shrink-0">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`h-20 w-20 rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${
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
      )}

      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center bg-[#fdf6e3] p-8 rounded-2xl">
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
    </div>
  )
}
