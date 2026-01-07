import { requireGroupMembership } from '@/lib/group-auth'
import { getGroupRecords } from '@/lib/group-records'
import { Link } from '@/i18n/routing'
import RecordsClient from './RecordsClient'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { group } = await requireGroupMembership(params.id)
    return {
      title: `${group?.name || 'Group'} - Records`,
    }
  } catch {
    return {
      title: 'Records',
    }
  }
}

export default async function RecordsPage({ params }: { params: { id: string } }) {
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

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get records data
  const records = await getGroupRecords(group.id)
  
  // Get member count
  const memberCount = await prisma.groupMember.count({
    where: { groupId: group.id },
  })
  
  // Enrich user records with user images if records are completed
  if (records && records.status === 'completed' && records.records) {
    const recordsData = records.records as any
    
    // Get all user IDs from user records
    const userIds = new Set<string>()
    const userRecordFields = [
      'userMostVS',
      'userMostPlays',
      'userMostEntries',
      'userLeastEntries',
      'userMostNumberOnes',
      'userMostWeeksContributing',
      'userTasteMaker',
      'userPeakPerformer',
    ]
    
    userRecordFields.forEach((field) => {
      if (recordsData[field]?.userId) {
        userIds.add(recordsData[field].userId)
      }
    })
    
    // Fetch user images
    if (userIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, image: true },
      })
      
      const userImageMap = new Map(users.map(u => [u.id, u.image]))
      
      // Enrich user records with images
      userRecordFields.forEach((field) => {
        if (recordsData[field]?.userId) {
          recordsData[field].image = userImageMap.get(recordsData[field].userId) || null
        }
      })
    }
  }

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: group.image,
          }}
          breadcrumbs={[
            { label: 'Groups', href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: 'Records' },
          ]}
          subheader="Chart Records & Achievements"
        />

        {/* Records Content - Client Component */}
        <RecordsClient 
          groupId={group.id}
          initialRecords={records}
          memberCount={memberCount}
        />
      </div>
    </main>
  )
}

