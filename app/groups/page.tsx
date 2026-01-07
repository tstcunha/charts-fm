import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups, getUserGroupInvites } from '@/lib/group-queries'
import Link from 'next/link'
import GroupsTabs from './GroupsTabs'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'

export default async function GroupsPage() {
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect('/')
  }

  const groups = await getUserGroups(user.id)
  const invites = await getUserGroupInvites(user.id)

  // Separate groups into owned groups (where user is owner) and member groups
  // Filter out groups with null creators to match the Group interface
  const adminGroups = groups.filter((group: any) => group.creatorId === user.id && group.creator !== null) as any
  const memberGroups = groups.filter((group: any) => group.creatorId !== user.id && group.creator !== null) as any

  // Get pending request counts for owned groups
  const pendingRequestsMap: Record<string, number> = {}
  if (adminGroups.length > 0) {
    const ownedGroupIds = adminGroups.map((group: any) => group.id)
    const pendingRequestsCounts = await prisma.groupJoinRequest.groupBy({
      by: ['groupId'],
      where: {
        groupId: { in: ownedGroupIds },
        status: 'pending',
      },
      _count: {
        id: true,
      },
    })

    // Create a map of groupId -> pending request count
    pendingRequestsCounts.forEach((item) => {
      pendingRequestsMap[item.groupId] = item._count.id
    })
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            My Groups
          </h1>
          <div className="flex gap-3">
            <LiquidGlassLink
              href="/groups/discover"
              variant="neutral"
              useTheme={false}
            >
              Browse Groups
            </LiquidGlassLink>
            <LiquidGlassLink
              href="/groups/create"
              variant="primary"
              useTheme={false}
            >
              Create Group
            </LiquidGlassLink>
          </div>
        </div>

        <GroupsTabs
          ownedGroups={adminGroups}
          memberGroups={memberGroups}
          invites={invites.filter((invite: any) => invite.group.creator !== null) as any}
          userId={user.id}
          pendingRequestsMap={pendingRequestsMap}
        />
      </div>
    </main>
  )
}

