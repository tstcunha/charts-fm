// Script to generate slugs for existing chart entries
// Run with: npx tsx scripts/generate-slugs.ts

import { PrismaClient } from '@prisma/client'
import { generateSlug, ChartType } from '../lib/chart-slugs'

const prisma = new PrismaClient()

async function generateSlugsForExistingEntries() {
  console.log('Generating slugs for existing chart entries...')

  // Get all entries without slugs
  const entriesWithoutSlugs = await prisma.groupChartEntry.findMany({
    where: {
      slug: null,
    },
    select: {
      id: true,
      entryKey: true,
      chartType: true,
    },
  })

  console.log(`Found ${entriesWithoutSlugs.length} entries without slugs`)

  let updated = 0
  for (const entry of entriesWithoutSlugs) {
    const slug = generateSlug(entry.entryKey, entry.chartType as ChartType)
    
    await prisma.groupChartEntry.update({
      where: { id: entry.id },
      data: { slug },
    })
    
    updated++
    if (updated % 100 === 0) {
      console.log(`Updated ${updated} entries...`)
    }
  }

  console.log(`✓ Generated slugs for ${updated} entries`)
}

async function main() {
  try {
    await generateSlugsForExistingEntries()
  } catch (error) {
    console.error('Error generating slugs:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

