import { requireGroupCreator } from '@/lib/group-auth'
import { getSuperuser } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import GroupPageHero from '@/components/groups/GroupPageHero'
import GroupSettingsTabs from './GroupSettingsTabs'
import RegenerateChartsTab from './RegenerateChartsTab'
import GroupSettingsForm from './GroupSettingsForm'
import GroupDetailsTab from './GroupDetailsTab'
import StylingTab from './StylingTab'
import ShoutboxSettingsTab from './ShoutboxSettingsTab'
import DeleteGroupTab from './DeleteGroupTab'
import type { Metadata } from 'next'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { group } = await requireGroupCreator(params.id)
    return {
      title: `${group?.name || 'Group'} - Settings`,
    }
  } catch {
    return {
      title: 'Group Settings',
    }
  }
}

export default async function GroupSettingsPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupCreator(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline">
            Back to Groups
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

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-6xl w-full mx-auto relative z-10">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: group.image,
          }}
          breadcrumbs={[
            { label: 'Groups', href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: 'Settings' },
          ]}
          subheader="Configure settings for your group"
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

