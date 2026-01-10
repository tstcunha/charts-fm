'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface ShareGroupModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  buttonRef: React.RefObject<HTMLButtonElement>
}

export default function ShareGroupModal({
  isOpen,
  onClose,
  groupId,
  buttonRef,
}: ShareGroupModalProps) {
  const t = useSafeTranslations('groups.share')
  const locale = useLocale()
  const [linkCopied, setLinkCopied] = useState(false)
  const [invitationCopied, setInvitationCopied] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')
  const [position, setPosition] = useState({ top: 0, right: 0, isMobile: false })
  const [mounted, setMounted] = useState(false)
  const [isPositioned, setIsPositioned] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      const isMobile = window.innerWidth < 768 // md breakpoint
      
      if (isMobile) {
        // On mobile, position at bottom center (we'll use bottom CSS property)
        setPosition({ top: 0, right: 0, isMobile: true })
      } else {
        // On desktop, position bubble below the button
        const top = rect.bottom + scrollY + 12 // 12px gap
        const right = window.innerWidth - rect.right
        setPosition({ top, right, isMobile: false })
      }
      setIsPositioned(true)
    }
  }, [buttonRef])

  // Calculate position synchronously before browser paints
  useLayoutEffect(() => {
    if (isOpen && typeof window !== 'undefined' && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const scrollY = window.scrollY || window.pageYOffset
      const isMobile = window.innerWidth < 768 // md breakpoint
      
      if (isMobile) {
        // On mobile, position at bottom center (we'll use bottom CSS property)
        setPosition({ top: 0, right: 0, isMobile: true })
      } else {
        // On desktop, position bubble below the button
        const top = rect.bottom + scrollY + 12
        const right = window.innerWidth - rect.right
        setPosition({ top, right, isMobile: false })
      }
      setIsPositioned(true)
    } else if (!isOpen) {
      setIsPositioned(false)
    }
  }, [isOpen, buttonRef])

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Use public URL for sharing (accessible to everyone, even non-members)
      const fullUrl = `${window.location.origin}/${locale}/groups/${groupId}/public`
      setPublicUrl(fullUrl)
      
      // Update position on scroll
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen, groupId, locale, updatePosition])

  useEffect(() => {
    if (linkCopied) {
      const timer = setTimeout(() => setLinkCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [linkCopied])

  useEffect(() => {
    if (invitationCopied) {
      const timer = setTimeout(() => setInvitationCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [invitationCopied])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setLinkCopied(true)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleCopyInvitation = async () => {
    const invitationText = `${t('invitationText')} ${publicUrl}`
    try {
      await navigator.clipboard.writeText(invitationText)
      setInvitationCopied(true)
    } catch (err) {
      console.error('Failed to copy invitation:', err)
    }
  }

  const handleSocialShare = (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    const encodedUrl = encodeURIComponent(publicUrl)
    const encodedText = encodeURIComponent(t('invitationText'))
    
    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${t('invitationText')} ${publicUrl}`)}`
        break
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
        break
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleClose = () => {
    setLinkCopied(false)
    setInvitationCopied(false)
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
      {/* Speech bubble positioned below share button */}
      <div 
        className="fixed md:absolute z-[9999] max-w-md w-full transition-opacity duration-200 ease-out"
        style={{
          ...(position.isMobile
            ? {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                right: 'auto',
                maxWidth: 'calc(100vw - 2rem)',
                width: 'calc(100vw - 2rem)',
              }
            : {
                top: `${position.top}px`,
                right: `${position.right}px`,
                marginRight: '1rem',
                marginLeft: '1rem',
              }
          ),
          opacity: isPositioned ? 1 : 0,
          pointerEvents: isPositioned ? 'auto' : 'none',
          maxHeight: position.isMobile ? 'calc(100vh - 2rem)' : '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-lg shadow-2xl p-4 md:p-6 relative">
          {/* Speech bubble tail pointing up to share button - hidden on mobile */}
          <div className="hidden md:block absolute -top-3 right-4 w-6 h-6 bg-white transform rotate-45 shadow-lg"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-bold">{t('title')}</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label={t('close')}
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Invitation Text */}
            <div>
              <p className="text-sm text-gray-700 text-center">
                {t('description')}
              </p>
            </div>

            {/* Link Field with Copy Button */}
            <div>
              <label htmlFor="publicUrl" className="block text-xs font-medium text-gray-700 mb-2">
                {t('groupLink')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="publicUrl"
                  readOnly
                  value={publicUrl}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
                <LiquidGlassButton
                  onClick={handleCopyLink}
                  variant="primary"
                  size="sm"
                  useTheme
                  className="whitespace-nowrap"
                >
                  {linkCopied ? t('copied') : t('copyLink')}
                </LiquidGlassButton>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                {t('shareOnSocialMedia')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSocialShare('twitter')}
                  className="flex-1 px-4 py-2 text-sm bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
                >
                  X
                </button>
                <button
                  onClick={() => handleSocialShare('whatsapp')}
                  className="flex-1 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => handleSocialShare('telegram')}
                  className="flex-1 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Telegram
                </button>
              </div>
            </div>

            {/* Copy Invitation Button */}
            <div>
              <LiquidGlassButton
                onClick={handleCopyInvitation}
                variant="primary"
                size="sm"
                useTheme
                fullWidth
              >
                {invitationCopied ? t('invitationCopied') : t('copyInvitation')}
              </LiquidGlassButton>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {t('copyInvitationDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}

