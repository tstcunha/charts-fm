'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface QuickAccessInfoModalProps {
  isOpen: boolean
  onClose: () => void
  buttonRef: React.RefObject<HTMLButtonElement>
}

export default function QuickAccessInfoModal({
  isOpen,
  onClose,
  buttonRef,
}: QuickAccessInfoModalProps) {
  const t = useSafeTranslations('navbar.quickAccess')
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)
  const [isPositioned, setIsPositioned] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      // Position bubble below the button (button bottom + gap)
      const top = rect.bottom + scrollY + 12 // 12px gap
      const right = window.innerWidth - rect.right
      setPosition({ top, right })
      setIsPositioned(true)
    }
  }, [buttonRef])

  // Calculate position synchronously before browser paints
  useLayoutEffect(() => {
    if (isOpen && typeof window !== 'undefined' && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      const top = rect.bottom + scrollY + 12
      const right = window.innerWidth - rect.right
      setPosition({ top, right })
      setIsPositioned(true)
    } else if (!isOpen) {
      setIsPositioned(false)
    }
  }, [isOpen, buttonRef])

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Update position on scroll
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen, updatePosition])

  const handleClose = () => {
    onClose()
  }

  if (!isOpen || !mounted || !isPositioned) return null

  const modalContent = (
    <>
      {/* Full page overlay - covers entire viewport */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-200"
        onClick={handleClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Speech bubble positioned below + button */}
      <div 
        className="absolute z-[9999] max-w-md w-full mx-4 transition-opacity duration-200 ease-out"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
          opacity: isPositioned ? 1 : 0,
          pointerEvents: isPositioned ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-2xl p-6 relative">
          {/* Speech bubble tail pointing up to + button */}
          <div className="absolute -top-3 right-4 w-6 h-6 bg-white transform rotate-45 shadow-lg"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{t('title')}</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label={t('close')}
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {t('description')} <strong>{t('descriptionButton')}</strong> {t('descriptionEnd')}
            </p>
            <p className="text-sm text-gray-600">
              {t('description2')}
            </p>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}

