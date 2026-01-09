'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const isSuccess = type === 'success'
  const bgColor = isSuccess 
    ? 'rgba(34, 197, 94, 0.2)' 
    : 'rgba(239, 68, 68, 0.2)'
  const borderColor = isSuccess
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)'
  const textColor = isSuccess
    ? 'text-green-700'
    : 'text-red-700'
  const icon = isSuccess ? '✓' : '✕'

  return (
    <div 
      className={`fixed top-20 left-1/2 z-[10000] p-3 md:p-4 rounded-2xl ${textColor}`}
      style={{
        background: bgColor,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: 'calc(100vw - 2rem)',
        animation: 'fadeInDown 0.3s ease-out',
        transform: 'translateX(-50%)',
      }}
    >
      <p className={`text-sm md:text-base font-semibold whitespace-nowrap ${textColor}`}>
        {icon} {message}
      </p>
    </div>
  )
}

