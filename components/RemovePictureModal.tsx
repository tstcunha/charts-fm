'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'

interface RemovePictureModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function RemovePictureModal({
  isOpen,
  onClose,
  onConfirm,
}: RemovePictureModalProps) {
  const t = useTranslations('profile.removePicture')
  const tCommon = useTranslations('common')
  const [mounted, setMounted] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setIsRemoving(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error removing picture:', error)
    } finally {
      setIsRemoving(false)
    }
  }

  if (!isOpen || !mounted) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 md:p-6">
        <div className="bg-white rounded-lg md:rounded-xl shadow-xl p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faTrash} className="text-red-600" />
              {t('title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl md:text-3xl leading-none w-8 h-8 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px]"
              aria-label={tCommon('close')}
              disabled={isRemoving}
            >
              ×
            </button>
          </div>

          <div className="mb-6 md:mb-8">
            <p className="text-sm md:text-base text-gray-700">
              {t('confirm')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <LiquidGlassButton
              onClick={onClose}
              disabled={isRemoving}
              variant="neutral"
              size="md"
              className="order-2 sm:order-1"
            >
              {tCommon('cancel')}
            </LiquidGlassButton>
            <LiquidGlassButton
              onClick={handleConfirm}
              disabled={isRemoving}
              variant="danger"
              size="md"
              icon={isRemoving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
              className="order-1 sm:order-2"
            >
              {isRemoving ? t('removing') : t('button')}
            </LiquidGlassButton>
          </div>
        </div>
      </div>
    </>
  )
}

