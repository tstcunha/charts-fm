'use client'

import { useState } from 'react'
import { getDefaultGroupImage } from '@/lib/default-images'

interface SafeImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  defaultImage?: string
}

export default function SafeImage({ 
  src, 
  alt, 
  className = '', 
  defaultImage 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src || defaultImage || getDefaultGroupImage())
  const defaultImg = defaultImage || getDefaultGroupImage()

  const handleError = () => {
    setImgSrc(defaultImg)
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  )
}

