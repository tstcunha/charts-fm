import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DiscoverGroupsClient from './DiscoverGroupsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover Groups',
}

export default async function DiscoverGroupsPage() {
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

  // Fetch initial groups data directly from database
  let initialGroups: any[] = []
  let error = null

  try {
    // Get first page of public groups (20 groups)
    const limit = 20
    const groups = await prisma.group.findMany({
      where: {
        isPrivate: false,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Get latest chart update and week count for each group
    const groupsWithActivity = await Promise.all(
      groups.map(async (group) => {
        const [latestChart, weekCount] = await Promise.all([
          prisma.groupChartEntry.findFirst({
            where: { groupId: group.id },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          }),
          prisma.groupWeeklyStats.count({
            where: { groupId: group.id },
          }),
        ])

        return {
          id: group.id,
          name: group.name,
          image: group.image,
          colorTheme: group.colorTheme,
          allowFreeJoin: group.allowFreeJoin,
          createdAt: group.createdAt.toISOString(),
          creator: group.creator,
          _count: group._count,
          lastChartUpdate: latestChart?.updatedAt.toISOString() || null,
          weekCount,
        }
      })
    )

    initialGroups = groupsWithActivity
  } catch (err) {
    console.error('Error fetching groups:', err)
    error = 'Failed to load groups'
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Discover Groups
          </h1>
        </div>

        <DiscoverGroupsClient initialGroups={initialGroups} initialError={error} userId={user.id} />
      </div>
    </main>
  )
}

