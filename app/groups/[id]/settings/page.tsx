import { requireGroupCreator } from '@/lib/group-auth'
import Link from 'next/link'
import GroupSettingsForm from './GroupSettingsForm'

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

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-4xl w-full mx-auto">
        <div className="mb-8">
          <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Group
          </Link>
          <h1 className="text-4xl font-bold mb-2">Group Settings</h1>
          <p className="text-gray-600">Configure chart generation settings for {group.name}</p>
        </div>

        <GroupSettingsForm
          groupId={group.id}
          initialChartSize={group.chartSize || 10}
          initialTrackingDayOfWeek={group.trackingDayOfWeek ?? 0}
        />
      </div>
    </main>
  )
}

