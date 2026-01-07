'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    zIndex: 99999,
    pointerEvents: 'none',
    opacity: 0,
  })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible || !triggerRef.current) {
      // Hide tooltip when not visible
      setTooltipStyle({
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        zIndex: 99999,
        pointerEvents: 'none',
        opacity: 0,
      })
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return

      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      // Don't calculate if tooltip hasn't been measured yet - retry if needed
      if (tooltipRect.width === 0 || tooltipRect.height === 0) {
        // Retry after a short delay if not measured yet
        setTimeout(updatePosition, 10)
        return
      }
      
      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 6
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'bottom':
          top = triggerRect.bottom + 6
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
          break
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.left - tooltipRect.width - 6
          break
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          left = triggerRect.right + 6
          break
      }

      // Keep tooltip within viewport
      const padding = 8
      if (left < padding) left = padding
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding
      }
      if (top < padding) top = padding
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 99999,
        pointerEvents: 'none',
        opacity: 1,
      })
    }

    // First render tooltip off-screen, then measure and position
    // Use multiple attempts to ensure tooltip is measured
    requestAnimationFrame(() => {
      updatePosition()
    })
    setTimeout(() => {
      updatePosition()
    }, 0)
    setTimeout(() => {
      updatePosition()
    }, 10)

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, position])

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent',
  }

  const tooltipContent = isVisible && typeof document !== 'undefined' ? (
    createPortal(
      <div
        ref={tooltipRef}
        className="transition-opacity duration-200"
        style={tooltipStyle}
      >
        <div className="relative bg-gray-900 text-white text-xs rounded-md py-2 px-3 shadow-lg whitespace-nowrap">
          {content}
          <div
            className={`
              absolute ${arrowClasses[position]}
              border-4
            `}
          />
        </div>
      </div>,
      document.body
    )
  ) : null

  return (
    <>
      <div 
        ref={triggerRef}
        className="inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {tooltipContent}
    </>
  )
}

