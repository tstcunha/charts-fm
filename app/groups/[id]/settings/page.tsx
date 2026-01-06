import { requireGroupCreator } from '@/lib/group-auth'
import Link from 'next/link'
import GroupSettingsTabs from './GroupSettingsTabs'
import RegenerateChartsTab from './RegenerateChartsTab'
import GroupSettingsForm from './GroupSettingsForm'
import GroupDetailsTab from './GroupDetailsTab'
import StylingTab from './StylingTab'
import DeleteGroupTab from './DeleteGroupTab'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

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
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-6xl w-full mx-auto relative z-10">
        <div className="mb-8">
          <nav className="mb-6 flex items-center gap-2 text-sm">
            <Link 
              href="/groups" 
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              Groups
            </Link>
            <span className="text-gray-400">/</span>
            <Link 
              href={`/groups/${group.id}`}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              {group.name}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Settings</span>
          </nav>
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

