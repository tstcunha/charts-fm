import { getGroupAccess } from '@/lib/group-auth'
import { getGroupChartEntries, getGroupAvailableWeeks } from '@/lib/group-queries'
import { formatWeekDate, formatWeekLabel } from '@/lib/weekly-utils'
import { Link } from '@/i18n/routing'
import ChartsClient from './ChartsClient'
import { getCachedChartEntries } from '@/lib/group-chart-metrics'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const tSite = await getTranslations('site');
  
  try {
    const { group } = await getGroupAccess(id)
    const t = await getTranslations('charts')
    return {
      title: `${group?.name || 'Group'} - ${t('title')}`,
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  } catch {
    const t = await getTranslations('charts')
    return {
      title: t('title'),
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  }
}

// Helper function to format date as "Dec. 28, 2025"
function formatDateWritten(date: Date): string {
  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  const month = monthNames[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

// Helper function to get week end date (6 days after week start)
function getWeekEndDate(weekStart: Date): Date {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  return weekEnd
}

type ChartType = 'artists' | 'tracks' | 'albums'

export default async function ChartsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { week?: string; type?: string }
}) {
  const { user, group } = await getGroupAccess(params.id)
  const t = await getTranslations('charts')
  const tGroups = await getTranslations('groups')

  // Get color theme
  // @ts-ignore - Prisma client will be regenerated after migration
  const colorTheme = (group?.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('groupNotFound')}</h1>
          <Link href="/groups" className="text-[var(--theme-text)] hover:underline">
            {t('backToGroups')}
          </Link>
        </div>
      </main>
    )
  }

  // Get available weeks
  const availableWeeks = await getGroupAvailableWeeks(group.id)

  // Get dynamic group image (includes user-chosen artist images if dynamic covers are enabled)
  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  if (availableWeeks.length === 0) {
    return (
      <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
        <div className="max-w-7xl w-full mx-auto">
          <GroupPageHero
            group={{
              id: group.id,
              name: group.name,
              image: dynamicGroupImage,
            }}
            breadcrumbs={[
              { label: tGroups('hero.breadcrumb'), href: '/groups' },
              { label: group.name, href: `/groups/${group.id}` },
              { label: t('title') },
            ]}
            subheader={t('title')}
          />
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">{t('noChartsAvailable')}</p>
          </div>
        </div>
      </main>
    )
  }

  // Parse selected week (default to latest)
  const selectedWeekStr = searchParams.week || formatWeekDate(availableWeeks[0].weekStart)
  // Parse the date string (YYYY-MM-DD) and create a Date object
  const [year, month, day] = selectedWeekStr.split('-').map(Number)
  const selectedWeek = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  // Parse selected chart type (default to artists)
  const selectedType = (searchParams.type || 'artists') as ChartType

  // Load all three chart types for instant switching
  const [artists, tracks, albums] = await Promise.all([
    getCachedChartEntries(group.id, selectedWeek, 'artists'),
    getCachedChartEntries(group.id, selectedWeek, 'tracks'),
    getCachedChartEntries(group.id, selectedWeek, 'albums'),
  ])

  const weekStartFormatted = formatDateWritten(selectedWeek)
  const weekEndDate = getWeekEndDate(selectedWeek)
  const weekEndFormatted = formatDateWritten(weekEndDate)

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: t('title') },
          ]}
          subheader={
            <>
              {t('weekOf', { date: weekStartFormatted })}
              <span className="text-xs italic text-gray-500 ml-1">
                {t('fromTo', { start: weekStartFormatted, end: weekEndFormatted })}
              </span>
            </>
          }
        />

        <ChartsClient
          weeks={availableWeeks}
          currentWeek={selectedWeek}
          trackingDayOfWeek={group.trackingDayOfWeek ?? 0}
          initialType={selectedType}
          artists={artists}
          tracks={tracks}
          albums={albums}
          groupId={group.id}
        />
      </div>
    </main>
  )
}

