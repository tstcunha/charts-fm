'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassButton from '@/components/LiquidGlassButton'

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
  const [linkCopied, setLinkCopied] = useState(false)
  const [invitationCopied, setInvitationCopied] = useState(false)
  const [publicUrl, setPublicUrl] = useState('')
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
      const fullUrl = `${window.location.origin}/groups/${groupId}/public`
      setPublicUrl(fullUrl)
      
      // Update position on scroll
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen, groupId, updatePosition])

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
    const invitationText = `Hey! Join my music group on chartsfm: ${publicUrl}`
    try {
      await navigator.clipboard.writeText(invitationText)
      setInvitationCopied(true)
    } catch (err) {
      console.error('Failed to copy invitation:', err)
    }
  }

  const handleSocialShare = (platform: 'twitter' | 'whatsapp' | 'telegram') => {
    const encodedUrl = encodeURIComponent(publicUrl)
    const encodedText = encodeURIComponent('Hey! Join my music group on chartsfm:')
    
    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`Hey! Join my music group on chartsfm: ${publicUrl}`)}`
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
          {/* Speech bubble tail pointing up to share button */}
          <div className="absolute -top-3 right-4 w-6 h-6 bg-white transform rotate-45 shadow-lg"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Share Group</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Invitation Text */}
            <div>
              <p className="text-sm text-gray-700 text-center">
                ✨ Let's grow the squad! Share this group with your music-loving friends
              </p>
            </div>

            {/* Link Field with Copy Button */}
            <div>
              <label htmlFor="publicUrl" className="block text-xs font-medium text-gray-700 mb-2">
                Group Link
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
                  {linkCopied ? 'Copied!' : 'Copy Link'}
                </LiquidGlassButton>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Share on Social Media
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
                {invitationCopied ? '✓ Invitation Copied!' : 'Copy Invitation'}
              </LiquidGlassButton>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Copy a ready-to-send invitation message
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}

