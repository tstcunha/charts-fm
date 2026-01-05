import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { prisma } from '@/lib/prisma'
import { getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'
import { getLastChartWeek } from '@/lib/group-service'
import UpdateChartsButton from './UpdateChartsButton'

interface GroupHeroServerProps {
  groupId: string
  isOwner: boolean
  colorTheme: string
}

export default async function GroupHeroServer({ groupId, isOwner, colorTheme }: GroupHeroServerProps) {
  // Fetch members with images
  const membersWithImages = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
          image: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  })

  // Get group data
  const group = await prisma.group.findUnique({
    where: { id: groupId },
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
  })

  if (!group) {
    return null
  }

  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const trackingDayName = dayNames[trackingDayOfWeek]
  
  const now = new Date()
  const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
  const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
  const nextChartDate = currentWeekEnd
  const nextChartDateFormatted = formatWeekLabel(nextChartDate)
  const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Check if charts can be updated
  const lastChartWeek = await getLastChartWeek(groupId)
  let canUpdateCharts = false
  
  if (!lastChartWeek) {
    // No charts exist, can update
    canUpdateCharts = true
  } else {
    // Check if current week has finished (currentWeekEnd is in the past)
    if (currentWeekEnd < now) {
      // Check if we need to generate the current finished week
      const nextExpectedWeek = new Date(lastChartWeek)
      nextExpectedWeek.setUTCDate(nextExpectedWeek.getUTCDate() + 7)
      
      // If next expected week is before or equal to current finished week, we can update
      if (nextExpectedWeek <= currentWeekStart) {
        canUpdateCharts = true
      }
    }
  }

  const chartGenerationInProgress = group.chartGenerationInProgress || false
  // Can only update if not already in progress
  canUpdateCharts = canUpdateCharts && !chartGenerationInProgress

  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  return (
    <div className={`mb-8 relative ${themeClass}`}>
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-8 border border-theme">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link 
            href="/groups" 
            className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
          >
            Groups
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium truncate">{group.name}</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex items-start gap-6">
            {/* Large Group Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-sm ring-4 ring-theme bg-[var(--theme-primary-lighter)]">
                <SafeImage
                  src={group.image}
                  alt={group.name}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            
            {/* Group Info */}
            <div className="flex-1">
              <h1 className="text-5xl font-bold mb-3 text-[var(--theme-primary-dark)] leading-[1.1] pb-2 overflow-visible">
                {group.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Owner:</span>
                  <span className="font-semibold text-gray-900">{group.creator.name || group.creator.lastfmUsername}</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Members:</span>
                  <span className="font-semibold text-gray-900">{group._count.members}</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Tracking:</span>
                  <span className="font-semibold text-gray-900">{trackingDayName}</span>
                </div>
              </div>
              
              {/* Member Avatars */}
              {membersWithImages.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-3">
                    {membersWithImages.slice(0, 6).map((member) => (
                      <div
                        key={member.user.id}
                        className="relative w-10 h-10 rounded-full ring-2 ring-white bg-[var(--theme-primary-lighter)] overflow-hidden"
                        title={member.user.name || member.user.lastfmUsername}
                      >
                        <SafeImage
                          src={member.user.image}
                          alt={member.user.name || member.user.lastfmUsername}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                  {membersWithImages.length > 6 && (
                    <span className="text-sm text-gray-600 ml-2">+{membersWithImages.length - 6} more</span>
                  )}
                </div>
              )}
              
              {/* Next Charts Badge or Update Button */}
              {canUpdateCharts || chartGenerationInProgress ? (
                <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} />
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-full font-semibold shadow-sm">
                  <span className="text-sm">Next charts in {daysUntilNextChart} {daysUntilNextChart === 1 ? 'day' : 'days'}</span>
                  <span className="text-xs opacity-80">({nextChartDateFormatted})</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Link
                href={`/groups/${groupId}/settings`}
                className="px-5 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
              >
                Settings
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

