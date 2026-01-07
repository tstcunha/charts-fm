import { getPublicGroupById } from '@/lib/group-queries'
import PublicGroupHeroServer from './PublicGroupHeroServer'
import PublicGroupWeeklyCharts from './PublicGroupWeeklyCharts'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const group = await getPublicGroupById(params.id)
    return {
      title: group?.name || 'Public Group',
    }
  } catch {
    return {
      title: 'Public Group',
    }
  }
}

export default async function PublicGroupPage({ params }: { params: { id: string } }) {
  const group = await getPublicGroupById(params.id)
  
  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <p className="text-gray-600 mb-4">
            This group may not exist or may be private.
          </p>
        </div>
      </main>
    )
  }

  // Get color theme
  // @ts-ignore - Prisma client will be regenerated after migration
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string

  return (
    <main 
      className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Hero Section - loaded server-side for immediate display */}
        <PublicGroupHeroServer groupId={group.id} colorTheme={colorTheme} />
        
        {/* Weekly Charts - loads asynchronously */}
        <PublicGroupWeeklyCharts groupId={group.id} chartMode={chartMode} />
      </div>
    </main>
  )
}

