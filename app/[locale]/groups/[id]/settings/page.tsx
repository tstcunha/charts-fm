import { requireGroupCreator } from '@/lib/group-auth'
import { getSuperuser } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { Link } from '@/i18n/routing'
import GroupPageHero from '@/components/groups/GroupPageHero'
import GroupSettingsTabs from './GroupSettingsTabs'
import RegenerateChartsTab from './RegenerateChartsTab'
import GroupSettingsForm from './GroupSettingsForm'
import GroupDetailsTab from './GroupDetailsTab'
import StylingTab from './StylingTab'
import ShoutboxSettingsTab from './ShoutboxSettingsTab'
import DeleteGroupTab from './DeleteGroupTab'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { getGroupImageUrl } from '@/lib/group-image-utils'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const t = await getTranslations('groups.settings')
  const tSite = await getTranslations('site');
  
  try {
    const { group } = await requireGroupCreator(id)
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

export default async function GroupSettingsPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupCreator(params.id)
  const t = await getTranslations('groups.settings')
  const tGroups = await getTranslations('groups')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-24">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{t('notFound')}</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline text-sm md:text-base">
            {t('backToGroups')}
          </Link>
        </div>
      </main>
    )
  }

  // Fetch the latest group state to check lock status
  const latestGroup = await prisma.group.findUnique({
    where: { id: group.id },
    select: {
      chartGenerationInProgress: true,
    },
  })

  const superuser = await getSuperuser()
  const isSuperuser = superuser !== null
  const chartGenerationInProgress = latestGroup?.chartGenerationInProgress || false

  // Get dynamic group image (includes user-chosen artist images if dynamic covers are enabled)
  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 relative">
      <div className="max-w-6xl w-full mx-auto relative z-10">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: tGroups('hero.settings') },
          ]}
          subheader={t('subheader')}
          narrow={true}
        />

        <GroupSettingsTabs
          regenerateChartsContent={
            <RegenerateChartsTab 
              groupId={group.id} 
              isSuperuser={isSuperuser}
              initialInProgress={chartGenerationInProgress}
            />
          }
          chartCreationContent={
            <GroupSettingsForm
              groupId={group.id}
              initialChartSize={group.chartSize || 10}
              initialChartMode={group.chartMode || 'plays_only'}
              initialTrackingDayOfWeek={group.trackingDayOfWeek ?? 0}
            />
          }
          groupDetailsContent={
            <GroupDetailsTab
              groupId={group.id}
              initialName={group.name}
              initialImage={group.image}
              initialIsPrivate={group.isPrivate}
              initialAllowFreeJoin={group.allowFreeJoin ?? false}
              initialDynamicIconEnabled={(group as any).dynamicIconEnabled ?? false}
              initialDynamicIconSource={(group as any).dynamicIconSource}
              initialTags={Array.isArray((group as any).tags) ? (group as any).tags : []}
            />
          }
          stylingContent={
            <StylingTab
              groupId={group.id}
              initialColorTheme={(group as any).colorTheme}
            />
          }
          shoutboxContent={
            <ShoutboxSettingsTab groupId={group.id} />
          }
          deleteGroupContent={
            <DeleteGroupTab
              groupId={group.id}
              groupName={group.name}
            />
          }
        />
      </div>
    </main>
  )
}

