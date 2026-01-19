'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelope } from '@fortawesome/free-solid-svg-icons'

export default function EmailVerificationBanner() {
  const { data: session } = useSession()
  const t = useTranslations('emailVerification')
  const [isVisible, setIsVisible] = useState(false)
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)

  useEffect(() => {
    // Only check verification status if user is logged in
    if (session?.user?.email) {
      checkVerificationStatus()
    } else {
      setIsVisible(false)
      setEmailVerified(null)
    }
  }, [session])

  const checkVerificationStatus = async () => {
    if (!session?.user?.email) return

    try {
      const response = await fetch('/api/auth/check-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      })

      const data = await response.json()
      
      if (data.exists && !data.verified) {
        setEmailVerified(false)
        setIsVisible(true)
      } else {
        setEmailVerified(true)
        setIsVisible(false)
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      // On error, don't show banner
      setIsVisible(false)
    }
  }

  // Don't render if not visible or user is not logged in
  if (!isVisible || !session?.user || emailVerified === true) {
    return null
  }

  return (
    <div className="sticky top-16 z-40 bg-yellow-500 border-b border-yellow-600 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <FontAwesomeIcon icon={faEnvelope} className="flex-shrink-0 text-lg" />
        <p className="text-sm md:text-base font-medium">
          {t('banner.message')}
        </p>
      </div>
    </div>
  )
}
