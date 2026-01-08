import { getPublicGroupById } from '@/lib/group-queries'
import PublicGroupHeroServer from './PublicGroupHeroServer'
import PublicGroupWeeklyCharts from './PublicGroupWeeklyCharts'
import LoggedOutBanner from './LoggedOutBanner'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string; locale: string } }): Promise<Metadata> {
  try {
    const group = await getPublicGroupById(params.id)
    const t = await getTranslations('groups')
    return {
      title: group?.name || t('title'),
    }
  } catch {
    const t = await getTranslations('groups')
    return {
      title: t('title'),
    }
  }
}

export default async function PublicGroupPage({ params }: { params: { id: string; locale: string } }) {
  const group = await getPublicGroupById(params.id)
  const t = await getTranslations('groups')
  
  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 md:px-6 lg:px-12 xl:px-24 py-8 md:py-16 lg:py-24">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{t('notFound')}</h1>
          <p className="text-sm md:text-base text-gray-600 mb-4">
            {t('public.notFoundDescription')}
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

  // Check if user is logged out
  const session = await getSession()
  const isLoggedOut = !session?.user?.email

  return (
    <main 
      className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Banner for logged-out users */}
        {isLoggedOut && <LoggedOutBanner />}
        
        {/* Hero Section - loaded server-side for immediate display */}
        <PublicGroupHeroServer groupId={group.id} colorTheme={colorTheme} />
        
        {/* Weekly Charts - loads asynchronously */}
        <PublicGroupWeeklyCharts groupId={group.id} chartMode={chartMode} />
      </div>
    </main>
  )
}

