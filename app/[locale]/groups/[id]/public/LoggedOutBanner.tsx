'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import SignInModal from '@/components/SignInModal'
import LiquidGlassButton, { LiquidGlassLink } from '@/components/LiquidGlassButton'

export default function LoggedOutBanner() {
  const t = useTranslations('groups.public')
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)

  return (
    <>
      <div className="mb-6 md:mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 font-medium">
              {t('joinCommunityMessage')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <LiquidGlassButton
              onClick={() => setIsSignInModalOpen(true)}
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
            >
              {t('logIn')}
            </LiquidGlassButton>
            <LiquidGlassLink
              href="/auth/signup"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
            >
              {t('createAccount')}
            </LiquidGlassLink>
          </div>
        </div>
      </div>
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </>
  )
}

