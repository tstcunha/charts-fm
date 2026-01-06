'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

interface GroupQuickStatsProps {
  groupId: string
}

export default function GroupQuickStats({ groupId }: GroupQuickStatsProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/quick-stats`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setIsLoading(false)
        console.error('Error fetching quick stats:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-center py-4">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-yellow-500" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.weeksTracked === 0) {
    return null
  }

  const { totalPlaysThisWeek, weeksTracked, chartMode, obsessionArtist } = data

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
        <div className="text-sm text-gray-600 mb-1">Obsession</div>
        {obsessionArtist ? (
          <>
            <div className="text-xl font-bold text-[var(--theme-text)] truncate">{obsessionArtist.name}</div>
            <div className="text-sm text-gray-500 mt-1">{obsessionArtist.weeks} {obsessionArtist.weeks === 1 ? 'week' : 'weeks'} streak</div>
          </>
        ) : (
          <div className="text-lg font-bold text-gray-400">No data yet</div>
        )}
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
        <div className="text-sm text-gray-600 mb-1">Weeks Tracked</div>
        <div className="text-3xl font-bold text-[var(--theme-text)]">{weeksTracked}</div>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
        <div className="text-sm text-gray-600 mb-1">Chart Mode</div>
        <div className="text-lg font-bold text-[var(--theme-text)] capitalize">
          {chartMode === 'vs' ? 'Vibe Score' : chartMode === 'vs_weighted' ? 'Vibe Score Weighted' : 'Plays Only'}
        </div>
      </div>
    </div>
  )
}

