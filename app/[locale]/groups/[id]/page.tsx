import { redirect } from '@/i18n/routing'
import { getGroupAccess } from '@/lib/group-auth'
import { Link } from '@/i18n/routing'
import GroupTabs from './GroupTabs'
import GroupHeroServer from '@/components/groups/GroupHeroServer'
import GroupQuickStats from '@/components/groups/GroupQuickStats'
import GroupWeeklyChartsTab from '@/components/groups/GroupWeeklyChartsTab'
import GroupAllTimeTab from '@/components/groups/GroupAllTimeTab'
import GroupMembersTab from '@/components/groups/GroupMembersTab'
import GroupTrendsTab from '@/components/groups/GroupTrendsTab'
import GroupSearchTab from '@/components/groups/GroupSearchTab'
import GroupShoutbox from '@/components/groups/GroupShoutbox'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { withDefaultOgImage, getDefaultOgImage, defaultOgImage } from '@/lib/metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const t = await getTranslations('groups');
  const tSite = await getTranslations('site');
  
  try {
    const { group } = await getGroupAccess(id);
    if (!group) {
      return withDefaultOgImage({
        title: t('title'),
        description: tSite('description'),
      });
    }

    const groupUrl = `${siteUrl}/${locale}/groups/${id}`;

    return withDefaultOgImage({
      title: group.name,
      description: `${group.name} - ${tSite('description')}`,
      openGraph: {
        type: 'website',
        locale: locale === 'pt' ? 'pt_BR' : 'en_US',
        url: groupUrl,
        siteName: tSite('name'),
        title: group.name,
        description: `${group.name} - ${tSite('description')}`,
        images: [getDefaultOgImage()],
      },
      twitter: {
        card: 'summary_large_image',
        title: group.name,
        description: `${group.name} - ${tSite('description')}`,
        images: [defaultOgImage],
      },
    });
  } catch {
    return withDefaultOgImage({
      title: t('title'),
      description: tSite('description'),
    });
  }
}

export default async function GroupPage({ params }: { params: { id: string } }) {
  const { user, group, isMember } = await getGroupAccess(params.id)
  const t = await getTranslations('groups')

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

  const isOwner = user?.id === group.creatorId
  const colorTheme = (group.colorTheme || 'yellow') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get pending request count for group owner
  let pendingRequestsCount = 0
  if (isOwner) {
    pendingRequestsCount = await prisma.groupJoinRequest.count({
      where: {
        groupId: group.id,
        status: 'pending',
      },
    })
  }

  return (
    <main 
      className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Hero Section - loaded server-side for immediate display */}
        <GroupHeroServer groupId={group.id} isOwner={isOwner || false} colorTheme={colorTheme} isMember={isMember} userId={user?.id || null} />
        
        {/* Quick Stats - loads asynchronously */}
        <GroupQuickStats groupId={group.id} />

        {/* Tabs with async loading content */}
        <GroupTabs
          defaultTab="trends"
          pendingRequestsCount={pendingRequestsCount}
          chartsContent={
            <GroupWeeklyChartsTab groupId={group.id} isOwner={isOwner || false} />
          }
          allTimeContent={
            <GroupAllTimeTab groupId={group.id} isOwner={isOwner || false} />
          }
          trendsContent={
            <GroupTrendsTab groupId={group.id} />
          }
          membersContent={
            isMember ? <GroupMembersTab groupId={group.id} /> : null
          }
          searchContent={
            <GroupSearchTab groupId={group.id} />
          }
          isMember={isMember}
        />

        {/* Shoutbox - only visible if user is a member */}
        {isMember && user && (
          <GroupShoutbox 
            groupId={group.id} 
            userId={user.id}
            isOwner={isOwner || false}
            shoutboxEnabled={group.shoutboxEnabled ?? true}
          />
        )}
      </div>
    </main>
  )
}
