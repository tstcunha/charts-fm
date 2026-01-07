import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import PersonalListeningOverview from '@/components/dashboard/PersonalListeningOverview'
import GroupQuickViewCards from '@/components/dashboard/GroupQuickViewCards'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import QuickActionsPanel from '@/components/dashboard/QuickActionsPanel'
import GroupsYouMightLike from '@/components/dashboard/GroupsYouMightLike'
import EmptyStateCTA from '@/components/dashboard/EmptyStateCTA'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession()

  if (!session?.user?.email) {
    redirect(`/${locale}/`)
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        {/* Quick Actions Panel - loads its own data */}
        <div className="mb-8">
          <QuickActionsPanel />
        </div>

        {/* Empty State CTA - shows for users with no groups */}
        <EmptyStateCTA />

        {/* Main Content Grid - components load their own data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Personal Listening Overview */}
          <div className="lg:col-span-2">
            <PersonalListeningOverview />
          </div>

          {/* Right Column - Activity Feed */}
          <div>
            <ActivityFeed />
          </div>
        </div>

        {/* Group Quick View Cards - loads its own data */}
        <div className="mb-8">
          <GroupQuickViewCards />
        </div>

        {/* Groups You Might Like - loads its own data */}
        <div className="mb-8">
          <GroupsYouMightLike />
        </div>
      </div>
    </main>
  )
}

