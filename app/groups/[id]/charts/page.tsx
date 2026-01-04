import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupById, getGroupChartEntries, getGroupAvailableWeeks } from '@/lib/group-queries'
import { formatWeekDate } from '@/lib/weekly-utils'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import WeekSelector from './WeekSelector'
import ChartTypeSelector from './ChartTypeSelector'
import ChartTable from './ChartTable'
import { getCachedChartEntries } from '@/lib/group-chart-metrics'

type ChartType = 'artists' | 'tracks' | 'albums'

export default async function ChartsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { week?: string; type?: string }
}) {
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

  const group = await getGroupById(params.id, user.id)

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

  // Get available weeks
  const availableWeeks = await getGroupAvailableWeeks(group.id)

  if (availableWeeks.length === 0) {
    return (
      <main className="flex min-h-screen flex-col p-24">
        <div className="max-w-6xl w-full mx-auto">
          <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Group
          </Link>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No charts available yet.</p>
          </div>
        </div>
      </main>
    )
  }

  // Parse selected week (default to latest)
  const selectedWeekStr = searchParams.week || formatWeekDate(availableWeeks[0].weekStart)
  // Parse the date string (YYYY-MM-DD) and create a Date object
  const [year, month, day] = selectedWeekStr.split('-').map(Number)
  const selectedWeek = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  // Parse selected chart type (default to artists)
  const selectedType = (searchParams.type || 'artists') as ChartType

  // Get cached chart entries
  const chartEntries = await getCachedChartEntries(group.id, selectedWeek, selectedType)

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-7xl w-full mx-auto">
        <div className="mb-8">
          <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Group
          </Link>
          <div className="flex items-start gap-4 mb-6">
            <div className="relative w-16 h-16 flex-shrink-0">
              <SafeImage
                src={group.image}
                alt={group.name}
                className="rounded-lg object-cover w-16 h-16"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
              <p className="text-gray-600">Week of {formatWeekDate(selectedWeek)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Week Selector */}
          <div className="col-span-12 md:col-span-3">
            <WeekSelector weeks={availableWeeks} currentWeek={selectedWeek} />
          </div>

          {/* Right: Chart Table and Type Selector */}
          <div className="col-span-12 md:col-span-9">
            {/* Chart Type Selector above table */}
            <div className="mb-4">
              <ChartTypeSelector currentType={selectedType} />
            </div>
            {/* Chart Table */}
            <ChartTable items={chartEntries} chartType={selectedType} />
          </div>
        </div>
      </div>
    </main>
  )
}

