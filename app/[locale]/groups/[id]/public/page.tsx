import { getGroupByIdForAccess } from '@/lib/group-queries'
import PublicGroupHeroServer from './PublicGroupHeroServer'
import PublicGroupWeeklyCharts from './PublicGroupWeeklyCharts'
import LoggedOutBanner from './LoggedOutBanner'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { getGroupAccess } from '@/lib/group-auth'
import { redirect } from '@/i18n/routing'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const t = await getTranslations('groups');
  const tSite = await getTranslations('site');
  
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  
  try {
    const group = await getGroupByIdForAccess(id, null);
    if (!group) {
      return {
        title: t('title'),
        description: tSite('description'),
        openGraph: {
          images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
        },
        twitter: {
          images: [defaultOgImage],
        },
      };
    }

    const groupUrl = `${siteUrl}/${locale}/groups/${id}/public`;

    return {
      title: group.name,
      description: `${group.name} - ${tSite('description')}`,
      openGraph: {
        type: 'website',
        locale: locale === 'pt' ? 'pt_BR' : 'en_US',
        url: groupUrl,
        siteName: tSite('name'),
        title: group.name,
        description: `${group.name} - ${tSite('description')}`,
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        card: 'summary_large_image',
        title: group.name,
        description: `${group.name} - ${tSite('description')}`,
        images: [defaultOgImage],
      },
    };
  } catch {
    return {
      title: t('title'),
      description: tSite('description'),
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    };
  }
}

export default async function PublicGroupPage({ params }: { params: { id: string; locale: string } }) {
  // Check if user is authenticated and can access the group
  const { user, group: accessGroup, isMember } = await getGroupAccess(params.id)
  
  // If user is authenticated AND can access the group (member or public group), redirect to main group page
  if (user && accessGroup) {
    redirect({ href: `/groups/${params.id}`, locale: params.locale })
  }

  // For non-authenticated users or authenticated users who can't access (private group, not a member), show public page
  // Use getGroupByIdForAccess to get the group (works for both public and private groups)
  const group = await getGroupByIdForAccess(params.id, user?.id || null)
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

  // User is logged out (we already checked above)
  const isLoggedOut = true

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

