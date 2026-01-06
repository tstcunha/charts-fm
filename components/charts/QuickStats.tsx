'use client'

import { MajorDriver } from '@/lib/chart-deep-dive'

interface QuickStatsProps {
  totalVS: number | null
  totalPlays: number
  majorDriver: MajorDriver | null
  chartMode: string
}

export default function QuickStats({ totalVS, totalPlays, majorDriver, chartMode }: QuickStatsProps) {
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-xl p-6 border border-white/30">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {showVS && totalVS !== null && (
          <div>
            <div className="text-sm text-gray-600 mb-1">Total VS</div>
            <div className="text-2xl font-bold text-gray-900">{totalVS.toFixed(2)}</div>
          </div>
        )}
        <div>
          <div className="text-sm text-gray-600 mb-1">Total Plays</div>
          <div className="text-2xl font-bold text-gray-900">{totalPlays.toLocaleString()}</div>
        </div>
        {majorDriver && (
          <div>
            <div className="text-sm text-gray-600 mb-1">Major Chart Driver</div>
            <div className="text-lg font-semibold text-gray-900">{majorDriver.name}</div>
            <div className="text-sm text-gray-500">
              {chartMode === 'plays_only' ? (
                <>{majorDriver.contribution.toLocaleString()} plays</>
              ) : (
                <>{majorDriver.contribution.toFixed(2)} VS</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

