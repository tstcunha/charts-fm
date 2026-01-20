'use client'

import { useState } from 'react'
import WeekSelector from './WeekSelector'
import ChartDisplay from './ChartDisplay'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import WeeklyChartDownloadButton from '@/components/charts/WeeklyChartDownloadButton'
import ShareChartButton from '@/components/charts/ShareChartButton'

type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartsClientProps {
  weeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
  initialType: ChartType
  artists: EnrichedChartItem[]
  tracks: EnrichedChartItem[]
  albums: EnrichedChartItem[]
  groupId: string
  isSuperuser?: boolean
}

export default function ChartsClient({
  weeks,
  currentWeek,
  trackingDayOfWeek,
  initialType,
  artists,
  tracks,
  albums,
  groupId,
  isSuperuser = false,
}: ChartsClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentChartType, setCurrentChartType] = useState<ChartType>(initialType)

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-3">
        <div className="mb-4">
          <WeekSelector 
            weeks={weeks} 
            currentWeek={currentWeek}
            trackingDayOfWeek={trackingDayOfWeek}
            onWeekChange={() => setIsLoading(true)}
          />
        </div>
        <div className="space-y-3">
          <div className="flex justify-center">
            <ShareChartButton
              groupId={groupId}
              weekStart={currentWeek}
              fullWidth
            />
          </div>
          <div className="flex justify-center">
            <WeeklyChartDownloadButton
              groupId={groupId}
              weekStart={currentWeek}
            />
          </div>
        </div>
      </div>
      <div className="col-span-12 md:col-span-9">
        <ChartDisplay
          initialType={initialType}
          artists={artists}
          tracks={tracks}
          albums={albums}
          isLoading={isLoading}
          onLoadingChange={setIsLoading}
          groupId={groupId}
          onTypeChange={setCurrentChartType}
        />
      </div>
    </div>
  )
}

