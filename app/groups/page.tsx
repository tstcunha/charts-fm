import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups, getUserGroupInvites } from '@/lib/group-queries'
import Link from 'next/link'
import GroupsTabs from './GroupsTabs'

export default async function GroupsPage() {
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const groups = await getUserGroups(user.id)
  const invites = await getUserGroupInvites(user.id)

  // Separate groups into owned groups (where user is owner) and member groups
  const adminGroups = groups.filter((group: any) => group.creatorId === user.id)
  const memberGroups = groups.filter((group: any) => group.creatorId !== user.id)

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
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 bg-gray-50">
      <div className="max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            My Groups
          </h1>
          <div className="flex gap-3">
            <Link
              href="/groups/discover"
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all font-semibold"
            >
              Browse Groups
            </Link>
            <Link
              href="/groups/create"
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-all font-semibold"
            >
              Create Group
            </Link>
          </div>
        </div>

        <GroupsTabs
          ownedGroups={adminGroups}
          memberGroups={memberGroups}
          invites={invites}
          userId={user.id}
          pendingRequestsMap={pendingRequestsMap}
        />
      </div>
    </main>
  )
}

