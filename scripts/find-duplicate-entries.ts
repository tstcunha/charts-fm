/**
 * Script to find and optionally fix duplicate chart entries
 * 
 * Duplicate entries can occur when:
 * - Chart generation runs multiple times for the same week
 * - Database constraints fail to prevent duplicates
 * - Race conditions during chart generation
 * 
 * Usage:
 *   npx tsx scripts/find-duplicate-entries.ts <groupId> [--fix]
 * 
 * Without --fix: Only reports duplicates
 * With --fix: Deletes duplicate entries (keeps the most recent one)
 */

import { prisma } from '../lib/prisma'
import { formatWeekDate } from '../lib/weekly-utils'

async function findDuplicates(groupId: string, fix: boolean = false) {
  console.log(`\n🔍 Finding duplicate chart entries for group: ${groupId}\n`)

  // Find all entries
  const allEntries = await prisma.groupChartEntry.findMany({
    where: { groupId },
    orderBy: [
      { weekStart: 'asc' },
      { chartType: 'asc' },
      { entryKey: 'asc' },
      { createdAt: 'desc' }, // Most recent first
    ],
  })

  console.log(`📊 Total entries: ${allEntries.length}\n`)

  // Group by the unique constraint fields
  const entryMap = new Map<string, typeof allEntries>()
  
  for (const entry of allEntries) {
    // Create key from unique constraint: groupId, weekStart, chartType, entryKey
    const weekKey = formatWeekDate(entry.weekStart)
    const uniqueKey = `${weekKey}|${entry.chartType}|${entry.entryKey}`
    
    if (!entryMap.has(uniqueKey)) {
      entryMap.set(uniqueKey, [])
    }
    entryMap.get(uniqueKey)!.push(entry)
  }

  // Find duplicates (entries with same unique key)
  const duplicates: Array<{
    key: string
    entries: typeof allEntries
    weekStart: string
    chartType: string
    entryKey: string
  }> = []

  for (const [key, entries] of entryMap.entries()) {
    if (entries.length > 1) {
      const [weekStart, chartType, entryKey] = key.split('|')
      duplicates.push({
        key,
        entries,
        weekStart,
        chartType,
        entryKey,
      })
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate entries found!\n')
    return
  }

  console.log(`⚠️  Found ${duplicates.length} sets of duplicate entries:\n`)

  let totalDuplicates = 0

  for (const dup of duplicates) {
    totalDuplicates += dup.entries.length - 1 // Subtract 1 because we keep one
    
    console.log(`${'='.repeat(80)}`)
    console.log(`Entry Key: "${dup.entryKey}"`)
    console.log(`Chart Type: ${dup.chartType}`)
    console.log(`Week: ${dup.weekStart}`)
    console.log(`Duplicates: ${dup.entries.length} entries (should be 1)`)
    console.log(`\nDetails:`)
    
    for (let i = 0; i < dup.entries.length; i++) {
      const entry = dup.entries[i]
      console.log(`  ${i + 1}. ID: ${entry.id}`)
      console.log(`     Name: "${entry.name}"`)
      console.log(`     Artist: ${entry.artist || 'N/A'}`)
      console.log(`     Position: ${entry.position}`)
      console.log(`     Created: ${entry.createdAt.toISOString()}`)
      console.log(`     Updated: ${entry.updatedAt.toISOString()}`)
    }

    if (fix) {
      // Keep the most recent entry (first in array since sorted by createdAt desc)
      const toKeep = dup.entries[0]
      const toDelete = dup.entries.slice(1)

      console.log(`\n  🗑️  Deleting ${toDelete.length} duplicate(s), keeping ID: ${toKeep.id}`)

      for (const entry of toDelete) {
        await prisma.groupChartEntry.delete({
          where: { id: entry.id },
        })
        console.log(`     ✓ Deleted ID: ${entry.id}`)
      }
    } else {
      console.log(`\n  💡 Run with --fix to delete duplicates (keeping most recent)`)
    }
    console.log()
  }

  console.log(`${'='.repeat(80)}`)
  console.log(`📊 Summary:`)
  console.log(`   Total duplicate sets: ${duplicates.length}`)
  console.log(`   Total duplicate entries to remove: ${totalDuplicates}`)

  if (fix) {
    console.log(`\n✅ Duplicates have been removed!`)
    
    // Invalidate cache for affected entries
    console.log(`\n🔄 Invalidating cache for affected entries...`)
    const affectedEntryKeys = new Set<string>()
    for (const dup of duplicates) {
      affectedEntryKeys.add(`${dup.chartType}|${dup.entryKey}`)
    }
    
    let invalidatedCount = 0
    for (const key of affectedEntryKeys) {
      const [chartType, entryKey] = key.split('|')
      const stats = await prisma.chartEntryStats.findUnique({
        where: {
          groupId_chartType_entryKey: {
            groupId,
            chartType,
            entryKey,
          },
        },
      })
      
      if (stats) {
        await prisma.chartEntryStats.update({
          where: { id: stats.id },
          data: {
            statsStale: true,
            lastUpdated: new Date(),
          },
        })
        invalidatedCount++
      }
    }
    
    console.log(`   ✓ Invalidated cache for ${invalidatedCount} entries`)
    console.log(`   Stats will be recalculated on next access.`)
  } else {
    console.log(`\n💡 To fix these duplicates, run:`)
    console.log(`   npx tsx scripts/find-duplicate-entries.ts ${groupId} --fix`)
  }
}

// Main execution
const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('Usage: npx tsx scripts/find-duplicate-entries.ts <groupId> [--fix]')
  process.exit(1)
}

const groupId = args[0]
const fix = args.includes('--fix')

findDuplicates(groupId, fix)
  .then(() => {
    console.log('\n✅ Complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })

