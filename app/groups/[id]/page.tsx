import { redirect } from 'next/navigation'
import { requireGroupMembership } from '@/lib/group-auth'
import Link from 'next/link'
import GroupTabs from './GroupTabs'
import GroupHeroServer from '@/components/groups/GroupHeroServer'
import GroupQuickStats from '@/components/groups/GroupQuickStats'
import GroupWeeklyChartsTab from '@/components/groups/GroupWeeklyChartsTab'
import GroupAllTimeTab from '@/components/groups/GroupAllTimeTab'
import GroupMembersTab from '@/components/groups/GroupMembersTab'
import GroupTrendsTab from '@/components/groups/GroupTrendsTab'
import GroupShoutbox from '@/components/groups/GroupShoutbox'
import { prisma } from '@/lib/prisma'

export default async function GroupPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-gray-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  const isOwner = user.id === group.creatorId
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
      className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Hero Section - loaded server-side for immediate display */}
        <GroupHeroServer groupId={group.id} isOwner={isOwner} colorTheme={colorTheme} />
        
        {/* Quick Stats - loads asynchronously */}
        <GroupQuickStats groupId={group.id} />

        {/* Tabs with async loading content */}
        <GroupTabs
          defaultTab="trends"
          pendingRequestsCount={pendingRequestsCount}
          chartsContent={
            <GroupWeeklyChartsTab groupId={group.id} isOwner={isOwner} />
          }
          allTimeContent={
            <GroupAllTimeTab groupId={group.id} isOwner={isOwner} />
          }
          trendsContent={
            <GroupTrendsTab groupId={group.id} />
          }
          membersContent={
            <GroupMembersTab groupId={group.id} />
          }
        />

        {/* Shoutbox - always visible at bottom if enabled */}
        <GroupShoutbox 
          groupId={group.id} 
          userId={user.id}
          isOwner={isOwner}
          shoutboxEnabled={group.shoutboxEnabled ?? true}
        />
      </div>
    </main>
  )
}
