'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface QuickAccessConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function QuickAccessConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: QuickAccessConfirmModalProps) {
  const t = useSafeTranslations('navbar.quickAccess')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <>
      {/* Full page overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-200"
        onClick={onCancel}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Centered modal */}
      <div 
        className="fixed z-[9999] max-w-md w-full mx-4 transition-opacity duration-200 ease-out"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-2xl p-6 relative">
          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-700">
              {t('replaceConfirm')}
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <LiquidGlassButton
              onClick={onCancel}
              variant="neutral"
              size="md"
              useTheme={false}
            >
              {t('no')}
            </LiquidGlassButton>
            <LiquidGlassButton
              onClick={onConfirm}
              variant="primary"
              size="md"
              useTheme={false}
            >
              {t('yes')}
            </LiquidGlassButton>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}

