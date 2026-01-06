'use client'

import { ReactNode } from 'react'

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
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent',
  }

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`
          absolute ${positionClasses[position]}
          opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[100]
          whitespace-nowrap
        `}
      >
        <div className="relative bg-gray-900 text-white text-xs rounded-md py-1.5 px-2.5 shadow-lg">
          {content}
          <div
            className={`
              absolute ${arrowClasses[position]}
              border-4
            `}
          />
        </div>
      </div>
    </div>
  )
}

