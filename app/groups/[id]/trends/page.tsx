import { requireGroupMembership } from '@/lib/group-auth'
import { getTrendsForGroup } from '@/lib/group-trends'
import Link from 'next/link'
import TrendsClient from './TrendsClient'
import GroupPageHero from '@/components/groups/GroupPageHero'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { group } = await requireGroupMembership(params.id)
    return {
      title: `${group?.name || 'Group'} - Trends`,
    }
  } catch {
    return {
      title: 'Trends',
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

  // Get trends data
  const trends = await getTrendsForGroup(group.id)

  if (!trends) {
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
              { label: 'Trends' },
            ]}
            subheader="Trends"
          />
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No trends available yet.</p>
            <p className="text-gray-500 text-sm">Generate charts to see weekly trends and insights!</p>
          </div>
        </div>
      </main>
    )
  }

  const weekStartFormatted = formatDateWritten(trends.weekStart)
  const weekEndFormatted = formatDateWritten(trends.weekEnd)

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
            { label: 'Trends' },
          ]}
          subheader={
            <>
              Week of {weekStartFormatted}
              <span className="text-xs italic text-gray-500 ml-1">
                (from {weekStartFormatted} to {weekEndFormatted})
              </span>
            </>
          }
        />

        {/* Trends Content - Client Component */}
        <TrendsClient trends={trends} groupId={group.id} userId={user.id} />
      </div>
    </main>
  )
}

