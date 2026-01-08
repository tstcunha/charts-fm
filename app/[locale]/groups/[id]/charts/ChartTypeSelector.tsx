'use client'

import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { faMicrophone, faMusic, faCompactDisc } from '@fortawesome/free-solid-svg-icons'

type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartTypeSelectorProps {
  currentType: ChartType
  onTypeChange?: (type: ChartType) => void
}

export default function ChartTypeSelector({ currentType, onTypeChange }: ChartTypeSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse } = useNavigation()
  const t = useSafeTranslations('charts')

  const handleTypeChange = (typeId: string) => {
    const type = typeId as ChartType
    if (onTypeChange) {
      // Use local state change for instant switching
      onTypeChange(type)
    } else {
      // Fallback to URL navigation for backwards compatibility
      triggerPulse()
      const params = new URLSearchParams(searchParams.toString())
      params.set('type', type)
      router.push(`?${params.toString()}`)
    }
  }

  const tabs: TabItem[] = [
    { id: 'artists', label: t('artists'), icon: faMicrophone },
    { id: 'tracks', label: t('tracks'), icon: faMusic },
    { id: 'albums', label: t('albums'), icon: faCompactDisc },
  ]

  return (
    <LiquidGlassTabs
      tabs={tabs}
      activeTab={currentType}
      onTabChange={handleTypeChange}
      fullWidth
    />
  )
}

