import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/weekly-utils'
import ExcelJS from 'exceljs'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get weekStart from query params
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('weekStart')
    
    if (!weekStartParam) {
      return NextResponse.json({ error: 'weekStart parameter is required' }, { status: 400 })
    }

    // Parse date string as UTC (YYYY-MM-DD format)
    const [year, month, day] = weekStartParam.split('-').map(Number)
    const requestedWeekStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

    // Verify the week exists in GroupWeeklyStats and use the exact weekStart from database
    const weeklyStats = await prisma.groupWeeklyStats.findFirst({
      where: {
        groupId: group.id,
        weekStart: requestedWeekStart,
      },
      select: {
        weekStart: true,
      },
    })

    if (!weeklyStats) {
      return NextResponse.json({ error: 'No charts found for the specified week' }, { status: 404 })
    }

    // Use the exact weekStart from the database to ensure perfect matching
    const normalizedWeekStart = new Date(weeklyStats.weekStart)
    normalizedWeekStart.setUTCHours(0, 0, 0, 0)

    // Get chart mode
    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Get all chart entries for the week
    // Use the exact weekStart from the database to ensure we match
    const chartEntries = await prisma.groupChartEntry.findMany({
      where: {
        groupId: group.id,
        weekStart: normalizedWeekStart,
      },
      orderBy: [
        { chartType: 'asc' },
        { position: 'asc' },
      ],
    })

    // Get all group members
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
          },
        },
      },
    })

    // Sort group members by user name (for consistent ordering in Excel)
    groupMembers.sort((a, b) => {
      const nameA = a.user.name || a.user.lastfmUsername
      const nameB = b.user.name || b.user.lastfmUsername
      return nameA.localeCompare(nameB)
    })

    // Organize chart entries by type
    const artistsEntries = chartEntries.filter(e => e.chartType === 'artists')
    const tracksEntries = chartEntries.filter(e => e.chartType === 'tracks')
    const albumsEntries = chartEntries.filter(e => e.chartType === 'albums')

    // Get user contributions for charted entries only
    const chartedEntryKeys = new Set(chartEntries.map(e => `${e.chartType}|${e.entryKey}`))
    
    const userContributions = await prisma.userChartEntryVS.findMany({
      where: {
        weekStart: normalizedWeekStart,
        chartType: { in: ['artists', 'tracks', 'albums'] },
        userId: { in: groupMembers.map(m => m.userId) },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
          },
        },
      },
    })

    // Filter to only charted entries and organize by chart type
    const contributionsByType = {
      artists: userContributions.filter(c => c.chartType === 'artists' && chartedEntryKeys.has(`artists|${c.entryKey}`)),
      tracks: userContributions.filter(c => c.chartType === 'tracks' && chartedEntryKeys.has(`tracks|${c.entryKey}`)),
      albums: userContributions.filter(c => c.chartType === 'albums' && chartedEntryKeys.has(`albums|${c.entryKey}`)),
    }

    // Create a map of entryKey to chart entry for quick lookup
    const entryMap = new Map<string, typeof chartEntries[0]>()
    chartEntries.forEach(entry => {
      entryMap.set(`${entry.chartType}|${entry.entryKey}`, entry)
    })

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    
    // Helper function to get user display name
    const getUserName = (user: { name: string | null; lastfmUsername: string }) => {
      return user.name || user.lastfmUsername
    }

    // Helper function to create chart data sheet
    const createChartSheet = (
      worksheet: ExcelJS.Worksheet,
      entries: typeof chartEntries,
      chartType: 'artists' | 'tracks' | 'albums'
    ) => {
      // Headers
      const headers = ['Position', 'Name']
      if (chartType !== 'artists') {
        headers.push('Artist')
      }
      if (showVS) {
        headers.push('Vibe Score')
      }
      headers.push('Total Plays')

      worksheet.addRow(headers)

      // Style header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }

      // Add data rows
      entries.forEach(entry => {
        const row = [entry.position, entry.name]
        if (chartType !== 'artists') {
          row.push(entry.artist || '')
        }
        if (showVS) {
          row.push(entry.vibeScore ?? '')
        }
        row.push(entry.playcount)
        worksheet.addRow(row)
      })

      // Set column widths
      worksheet.getColumn(1).width = 10 // Position
      worksheet.getColumn(2).width = 30 // Name
      if (chartType !== 'artists') {
        worksheet.getColumn(3).width = 30 // Artist
      }
      if (showVS) {
        const vsCol = chartType === 'artists' ? 3 : 4
        worksheet.getColumn(vsCol).width = 12 // Vibe Score
      }
      const playsCol = chartType === 'artists' 
        ? (showVS ? 4 : 3)
        : (showVS ? 5 : 4)
      worksheet.getColumn(playsCol).width = 12 // Total Plays
    }

    // Helper function to create contributions sheet
    const createContributionsSheet = (
      worksheet: ExcelJS.Worksheet,
      contributions: typeof userContributions,
      chartType: 'artists' | 'tracks' | 'albums',
      entries: typeof chartEntries
    ) => {
      // Headers
      const headers = ['User Name', 'Entry Name']
      if (chartType !== 'artists') {
        headers.push('Artist')
      }
      headers.push('Position', 'Vibe Score', 'Playcount')

      worksheet.addRow(headers)

      // Style header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }

      // Create a map of user contributions by userId and entryKey
      const userContributionsMap = new Map<string, Map<string, typeof userContributions[0]>>()
      contributions.forEach(contrib => {
        if (!userContributionsMap.has(contrib.userId)) {
          userContributionsMap.set(contrib.userId, new Map())
        }
        userContributionsMap.get(contrib.userId)!.set(contrib.entryKey, contrib)
      })

      // Create a map of entries by entryKey for quick lookup
      const entriesByKey = new Map<string, typeof entries[0]>()
      entries.forEach(entry => {
        entriesByKey.set(entry.entryKey, entry)
      })

      // For each group member, add their contributions or "No contributions"
      groupMembers.forEach(member => {
        const memberContributions = userContributionsMap.get(member.userId)
        
        if (!memberContributions || memberContributions.size === 0) {
          // No contributions - add single row
          const row = [getUserName(member.user)]
          row.push('No contributions')
          if (chartType !== 'artists') {
            row.push('')
          }
          row.push('', '', '')
          worksheet.addRow(row)
        } else {
          // Has contributions - add one row per entry
          // Sort contributions by entry position
          const contribArray = Array.from(memberContributions.values())
            .map(contrib => {
              const entry = entriesByKey.get(contrib.entryKey)
              return { contrib, entry, position: entry?.position ?? 999 }
            })
            .sort((a, b) => a.position - b.position)

          contribArray.forEach(({ contrib, entry }) => {
            if (!entry) return // Skip if entry not found (shouldn't happen)
            
            const row = [getUserName(member.user)]
            row.push(entry.name)
            if (chartType !== 'artists') {
              row.push(entry.artist || '')
            }
            row.push(entry.position)
            row.push(contrib.vibeScore)
            row.push(contrib.playcount)
            worksheet.addRow(row)
          })
        }
      })

      // Set column widths
      worksheet.getColumn(1).width = 25 // User Name
      worksheet.getColumn(2).width = 30 // Entry Name
      if (chartType !== 'artists') {
        worksheet.getColumn(3).width = 30 // Artist
      }
      const posCol = chartType === 'artists' ? 3 : 4
      worksheet.getColumn(posCol).width = 10 // Position
      const vsCol = chartType === 'artists' ? 4 : 5
      worksheet.getColumn(vsCol).width = 12 // Vibe Score
      const playsCol = chartType === 'artists' ? 5 : 6
      worksheet.getColumn(playsCol).width = 12 // Playcount
    }

    // Create sheets
    // Tab 1: Artists Chart
    const artistsSheet = workbook.addWorksheet('Artists')
    createChartSheet(artistsSheet, artistsEntries, 'artists')

    // Tab 2: Tracks Chart
    const tracksSheet = workbook.addWorksheet('Tracks')
    createChartSheet(tracksSheet, tracksEntries, 'tracks')

    // Tab 3: Albums Chart
    const albumsSheet = workbook.addWorksheet('Albums')
    createChartSheet(albumsSheet, albumsEntries, 'albums')

    // Tab 4: Artist Contributions
    const artistContribSheet = workbook.addWorksheet('Artist Contributions')
    createContributionsSheet(artistContribSheet, contributionsByType.artists, 'artists', artistsEntries)

    // Tab 5: Track Contributions
    const trackContribSheet = workbook.addWorksheet('Track Contributions')
    createContributionsSheet(trackContribSheet, contributionsByType.tracks, 'tracks', tracksEntries)

    // Tab 6: Album Contributions
    const albumContribSheet = workbook.addWorksheet('Album Contributions')
    createContributionsSheet(albumContribSheet, contributionsByType.albums, 'albums', albumsEntries)

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Create filename
    const weekStr = normalizedWeekStart.toISOString().split('T')[0]
    const groupName = group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${groupName}_week-${weekStr}.xlsx`

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating Excel export:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel export' },
      { status: 500 }
    )
  }
}

