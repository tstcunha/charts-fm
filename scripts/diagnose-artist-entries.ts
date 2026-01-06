/**
 * Diagnostic script to identify issues with artist chart entries
 * 
 * This script helps diagnose why album entries in artist deep dive pages
 * show incorrect peak positions and weeks on chart.
 * 
 * Usage:
 *   npx tsx scripts/diagnose-artist-entries.ts <groupId> <artistName> [albumName]
 * 
 * If albumName is provided, it will show detailed information about that specific album.
 */

import { prisma } from '../lib/prisma'

async function diagnoseArtistEntries(groupId: string, artistName: string, albumName?: string) {
  console.log(`\n🔍 Diagnosing chart entries for artist: "${artistName}"`)
  console.log(`   Group ID: ${groupId}\n`)

  // Get all chart entries for tracks and albums by this artist
  const entries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      artist: artistName,
      chartType: {
        in: ['tracks', 'albums'],
      },
    },
    orderBy: [
      { chartType: 'asc' },
      { entryKey: 'asc' },
      { weekStart: 'asc' },
    ],
  })

  console.log(`📊 Found ${entries.length} total chart entries\n`)

  // Group by entryKey to see what's being grouped together
  const entryMap = new Map<string, typeof entries>()
  
  for (const entry of entries) {
    const existing = entryMap.get(entry.entryKey)
    if (existing) {
      existing.push(entry)
    } else {
      entryMap.set(entry.entryKey, [entry])
    }
  }

  console.log(`📦 Found ${entryMap.size} unique entryKeys\n`)

  // Filter to albums if albumName is provided
  let entriesToShow = Array.from(entryMap.entries())
  if (albumName) {
    entriesToShow = entriesToShow.filter(([entryKey, entries]) => 
      entries.some(e => e.chartType === 'albums' && e.name.toLowerCase().includes(albumName.toLowerCase()))
    )
    console.log(`🎵 Filtering to albums matching "${albumName}"\n`)
  }

  // Show detailed information for each entryKey
  for (const [entryKey, entryList] of entriesToShow) {
    const albums = entryList.filter(e => e.chartType === 'albums')
    const tracks = entryList.filter(e => e.chartType === 'tracks')
    
    if (albums.length > 0) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`📀 ALBUM ENTRY KEY: "${entryKey}"`)
      console.log(`${'='.repeat(80)}`)
      
      // Check for name/artist inconsistencies
      const uniqueNames = new Set(albums.map(e => e.name))
      const uniqueArtists = new Set(albums.map(e => e.artist).filter(Boolean))
      
      if (uniqueNames.size > 1) {
        console.log(`\n⚠️  WARNING: Multiple album names found for same entryKey:`)
        uniqueNames.forEach(name => {
          const entriesWithName = albums.filter(e => e.name === name)
          console.log(`   - "${name}" (${entriesWithName.length} entries)`)
        })
        console.log(`   This suggests different albums are being incorrectly grouped together!`)
      }
      
      if (uniqueArtists.size > 1) {
        console.log(`\n⚠️  WARNING: Multiple artists found for same entryKey:`)
        uniqueArtists.forEach(artist => {
          const entriesWithArtist = albums.filter(e => e.artist === artist)
          console.log(`   - "${artist}" (${entriesWithArtist.length} entries)`)
        })
        console.log(`   This suggests different albums are being incorrectly grouped together!`)
      }
      
      // Check if entryKey matches expected format
      const expectedEntryKey = albums[0] 
        ? `${albums[0].name.toLowerCase().trim()}|${(albums[0].artist || '').toLowerCase().trim()}`
        : null
      if (expectedEntryKey && entryKey !== expectedEntryKey) {
        console.log(`\n⚠️  WARNING: entryKey "${entryKey}" doesn't match expected format "${expectedEntryKey}"`)
        console.log(`   This may indicate an entryKey normalization issue.`)
      }
      
      // Show all weeks this entry appeared
      console.log(`\n📅 Chart History (${albums.length} entries):`)
      console.log(`   Week Start          | Position | Name                    | Artist`)
      console.log(`   ${'-'.repeat(75)}`)
      
      const positions: number[] = []
      const weekStarts = new Set<string>()
      
      for (const entry of albums) {
        const weekStr = entry.weekStart.toISOString().split('T')[0]
        weekStarts.add(weekStr)
        positions.push(entry.position)
        console.log(`   ${weekStr} | ${String(entry.position).padStart(8)} | ${entry.name.padEnd(22).substring(0, 22)} | ${entry.artist || 'N/A'}`)
      }
      
      // Calculate what the function would calculate
      const peakPosition = Math.min(...positions)
      const weeksAtPeak = positions.filter(p => p === peakPosition).length
      const totalWeeks = albums.length
      const uniqueWeeks = weekStarts.size
      
      console.log(`\n📈 Calculated Stats:`)
      console.log(`   Peak Position:      ${peakPosition}`)
      console.log(`   Weeks at Peak:      ${weeksAtPeak}`)
      console.log(`   Total Entries:      ${totalWeeks} (should match unique weeks: ${uniqueWeeks})`)
      
      if (totalWeeks !== uniqueWeeks) {
        console.log(`\n⚠️  PROBLEM DETECTED: Total entries (${totalWeeks}) != Unique weeks (${uniqueWeeks})`)
        console.log(`   This suggests duplicate entries for the same week!`)
        
        // Find duplicate weeks
        const weekCounts = new Map<string, number>()
        for (const entry of albums) {
          const weekStr = entry.weekStart.toISOString().split('T')[0]
          weekCounts.set(weekStr, (weekCounts.get(weekStr) || 0) + 1)
        }
        
        console.log(`\n   Duplicate weeks:`)
        for (const [week, count] of weekCounts.entries()) {
          if (count > 1) {
            console.log(`     ${week}: ${count} entries`)
          }
        }
      }
      
      // Check if peak position matches what's shown
      if (peakPosition === 1 && positions.some(p => p > 1)) {
        console.log(`\n⚠️  POTENTIAL ISSUE: Peak shows as #1, but entry also appeared at higher positions`)
        console.log(`   Positions found: ${[...new Set(positions)].sort((a, b) => a - b).join(', ')}`)
      }
    }
    
    if (tracks.length > 0 && !albumName) {
      console.log(`\n🎵 Track Entry Key: "${entryKey}" (${tracks.length} entries)`)
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📊 SUMMARY`)
  console.log(`${'='.repeat(80)}`)
  
  const allAlbums = entries.filter(e => e.chartType === 'albums')
  const allTracks = entries.filter(e => e.chartType === 'tracks')
  
  console.log(`Total Albums: ${allAlbums.length} entries across ${new Set(allAlbums.map(e => e.entryKey)).size} unique albums`)
  console.log(`Total Tracks: ${allTracks.length} entries across ${new Set(allTracks.map(e => e.entryKey)).size} unique tracks`)
  
  // Check for potential entryKey collisions
  const albumEntryKeys = new Set(allAlbums.map(e => e.entryKey))
  const trackEntryKeys = new Set(allTracks.map(e => e.entryKey))
  const collisions = Array.from(albumEntryKeys).filter(key => trackEntryKeys.has(key))
  
  if (collisions.length > 0) {
    console.log(`\n⚠️  WARNING: Found ${collisions.length} entryKeys that exist in both tracks and albums:`)
    collisions.forEach(key => console.log(`   - "${key}"`))
  }
}

// Main execution
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: npx tsx scripts/diagnose-artist-entries.ts <groupId> <artistName> [albumName]')
  process.exit(1)
}

const [groupId, artistName, albumName] = args

diagnoseArtistEntries(groupId, artistName, albumName)
  .then(() => {
    console.log('\n✅ Diagnosis complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })

