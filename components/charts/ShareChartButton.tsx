'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShare } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

// Lazy load modal to reduce initial bundle size
const ShareChartModal = dynamic(() => import('./ShareChartModal'), {
  ssr: false,
  loading: () => null,
})

interface ShareChartButtonProps {
  groupId: string
  weekStart: Date
  fullWidth?: boolean
}

export default function ShareChartButton({ groupId, weekStart, fullWidth = false }: ShareChartButtonProps) {
  const t = useSafeTranslations('groups.weeklyCharts')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <LiquidGlassButton
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        useTheme
        fullWidth={fullWidth}
        icon={<FontAwesomeIcon icon={faShare} className="text-sm" />}
      >
        {t('shareChart')}
      </LiquidGlassButton>

      <ShareChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        weekStart={weekStart}
      />
    </>
  )
}
