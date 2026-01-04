import { requireGroupCreator } from '@/lib/group-auth'
import Link from 'next/link'
import GroupSettingsTabs from './GroupSettingsTabs'
import RegenerateChartsTab from './RegenerateChartsTab'
import GroupSettingsForm from './GroupSettingsForm'
import GroupDetailsTab from './GroupDetailsTab'
import DeleteGroupTab from './DeleteGroupTab'

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
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-8">
          <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Group
          </Link>
          <h1 className="text-4xl font-bold mb-2">Group Settings</h1>
          <p className="text-gray-600">Configure settings for {group.name}</p>
        </div>

        <GroupSettingsTabs
          regenerateChartsContent={<RegenerateChartsTab groupId={group.id} />}
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
            />
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

