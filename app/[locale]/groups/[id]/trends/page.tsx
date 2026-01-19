import { getGroupAccess } from '@/lib/group-auth'
import { getTrendsForGroup } from '@/lib/group-trends'
import { Link } from '@/i18n/routing'
import TrendsClient from './TrendsClient'
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
    const t = await getTranslations('groups.trends')
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
    const t = await getTranslations('groups.trends')
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

export default async function TrendsPage({ params }: { params: { id: string } }) {
  const { user, group, isMember } = await getGroupAccess(params.id)
  const t = await getTranslations('groups')
  const tTrends = await getTranslations('groups.trends')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('notFound')}</h1>
          <Link href="/groups" className="text-gray-600 hover:underline">
            {t('backToGroups')}
          </Link>
        </div>
      </main>
    )
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get trends data
  const trends = await getTrendsForGroup(group.id)

  // Get dynamic group image (includes user-chosen artist images if dynamic covers are enabled)
  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  if (!trends) {
    return (
      <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
        <div className="max-w-7xl w-full mx-auto">
          <GroupPageHero
            group={{
              id: group.id,
              name: group.name,
              image: dynamicGroupImage,
            }}
            breadcrumbs={[
              { label: t('hero.breadcrumb'), href: '/groups' },
              { label: group.name, href: `/groups/${group.id}` },
              { label: tTrends('title') },
            ]}
            subheader={tTrends('title')}
          />
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 text-center">
            <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">{tTrends('noTrendsAvailable')}</p>
            <p className="text-gray-500 text-xs md:text-sm">{tTrends('generateChartsToSee')}</p>
          </div>
        </div>
      </main>
    )
  }

  const weekStartFormatted = formatDateWritten(trends.weekStart)
  const weekEndFormatted = formatDateWritten(trends.weekEnd)

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: t('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: tTrends('title') },
          ]}
          subheader={
            <>
              {tTrends('weekOf', { date: weekStartFormatted })}
              <span className="text-xs italic text-gray-500 ml-1">
                ({tTrends('from')} {weekStartFormatted} {tTrends('to')} {weekEndFormatted})
              </span>
            </>
          }
        />

        {/* Trends Content - Client Component */}
        <TrendsClient trends={trends} groupId={group.id} userId={user?.id || null} />
      </div>
    </main>
  )
}

