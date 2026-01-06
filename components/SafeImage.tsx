'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getDefaultGroupImage } from '@/lib/default-images'

interface SafeImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  defaultImage?: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  sizes?: string
}

export default function SafeImage({ 
  src, 
  alt, 
  className = '', 
  defaultImage,
  width,
  height,
  fill = false,
  priority = false,
  sizes
}: SafeImageProps) {
  const defaultImg = defaultImage || getDefaultGroupImage()
  const [imgSrc, setImgSrc] = useState<string>(src || defaultImg)
  const [useFallback, setUseFallback] = useState(false)

  // Update imgSrc when src prop changes
  useEffect(() => {
    if (src) {
      setImgSrc(src)
      setUseFallback(false)
    } else {
      setImgSrc(defaultImg)
      setUseFallback(true) // Default images are usually data URIs
    }
  }, [src, defaultImg])

  // Determine if we should use fill mode or fixed dimensions
  const useFill = fill || (!width && !height && (className.includes('w-full') || className.includes('h-full')))
  
  // For data URIs, invalid URLs, or when we need fallback, use regular img tag
  const isDataUri = imgSrc.startsWith('data:')
  const isValidUrl = imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('/')
  
  if (isDataUri || !isValidUrl || useFallback) {
    return (
      <img
        key={imgSrc}
        src={imgSrc}
        alt={alt}
        className={className}
        onError={() => {
          if (!useFallback && imgSrc !== defaultImg) {
            setUseFallback(true)
            setImgSrc(defaultImg)
          }
        }}
      />
    )
  }

  if (useFill) {
    // Extract size classes from className to apply to wrapper
    const sizeClasses = className.match(/\b(w-\d+|h-\d+|w-full|h-full)\b/g)?.join(' ') || ''
    const otherClasses = className.replace(/\b(w-\d+|h-\d+|w-full|h-full|object-\w+)\b/g, '').trim()
    
    return (
      <div className={`relative ${sizeClasses} ${otherClasses}`}>
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        />
      </div>
    )
  }

  // Use fixed dimensions - try to infer from className if not provided
  let imageWidth = width
  let imageHeight = height

  // Try to extract dimensions from Tailwind classes (w-8, h-8, etc.)
  if (!imageWidth || !imageHeight) {
    const widthMatch = className.match(/\bw-(\d+)\b/)
    const heightMatch = className.match(/\bh-(\d+)\b/)
    
    if (widthMatch) imageWidth = parseInt(widthMatch[1]) * 4 // Tailwind units are 0.25rem = 4px
    if (heightMatch) imageHeight = parseInt(heightMatch[1]) * 4
    
    // Default fallback
    if (!imageWidth) imageWidth = 100
    if (!imageHeight) imageHeight = 100
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={imageWidth}
      height={imageHeight}
      className={className}
      priority={priority}
    />
  )
}
