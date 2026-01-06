import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { getTrendsForGroup, calculatePersonalizedStats, calculateConsecutiveStreaks } from '@/lib/group-trends'
import { getGroupWeeklyStats, getGroupChartEntriesForWeek } from '@/lib/group-queries'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group, user } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get trends (calculate if missing)
    let trends = await getTrendsForGroup(group.id)

    // If no trends exist, return null (trends will be calculated on next chart generation)
    if (!trends) {
      return NextResponse.json({ 
        trends: null,
        message: 'Trends not available yet. Generate charts to see trends.' 
      })
    }

    // Calculate longest streaks and comebacks
    let longestStreaks: any[] = []
    let comebacks: any[] = []
    
    if (trends) {
      const normalizedWeekStart = new Date(trends.weekStart)
      normalizedWeekStart.setUTCHours(0, 0, 0, 0)
      
      // Calculate longest streaks using shared function
      longestStreaks = await calculateConsecutiveStreaks(group.id, normalizedWeekStart, undefined, 2)
      
      // Calculate comebacks - entries that returned after being away
      const previousWeekStart = new Date(normalizedWeekStart)
      previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)
      const previousEntries = await getGroupChartEntriesForWeek(group.id, previousWeekStart)
      const previousKeys = new Set(
        previousEntries.map((e) => `${e.chartType}|${e.entryKey}`)
      )
      
      // Find entries that weren't in previous week but have appeared before
      const potentialComebacks = currentEntries.filter((entry) => {
        const wasInPreviousWeek = previousKeys.has(`${entry.chartType}|${entry.entryKey}`)
        const hasAppearedBefore = (entry.totalWeeksAppeared || 0) > 1
        return !wasInPreviousWeek && hasAppearedBefore
      })
      
      if (potentialComebacks.length > 0) {
        // Get historical entries to find when they last appeared
        const allHistoricalEntries = await prisma.groupChartEntry.findMany({
          where: {
            groupId: group.id,
            weekStart: {
              lt: normalizedWeekStart,
            },
          },
          select: {
            weekStart: true,
            entryKey: true,
            chartType: true,
          },
          orderBy: {
            weekStart: 'desc',
          },
        })
        
        for (const entry of potentialComebacks) {
          const historicalForEntry = allHistoricalEntries
            .filter(e => e.entryKey === entry.entryKey && e.chartType === entry.chartType)
            .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
          
          if (historicalForEntry.length > 0) {
            const lastAppearance = historicalForEntry[0]
            const weeksSince = Math.floor((normalizedWeekStart.getTime() - lastAppearance.weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
            if (weeksSince > 0) {
              comebacks.push({
                chartType: entry.chartType,
                entryKey: entry.entryKey,
                name: entry.name,
                artist: entry.artist || undefined,
                position: entry.position,
                weeksAway: weeksSince,
              })
            }
          }
        }
        
        // Sort by weeks away (longest away first)
        comebacks.sort((a, b) => b.weeksAway - a.weeksAway)
      }
    }

    // Check if personalized stats are requested
    const url = new URL(request.url)
    const includePersonal = url.searchParams.get('includePersonal') === 'true'

    let personalizedStats = null
    if (includePersonal && user && trends) {
      try {
        personalizedStats = await calculatePersonalizedStats(
          user.id,
          group.id,
          trends.weekStart,
          trends
        )
      } catch (error) {
        console.error('Error calculating personalized stats:', error)
        // Don't fail the request if personalized stats fail
      }
    }

    return NextResponse.json({
      trends,
      personalizedStats,
      longestStreaks,
      comebacks,
    })
  } catch (error: any) {
    console.error('Error fetching trends:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trends' },
      { status: 500 }
    )
  }
}

