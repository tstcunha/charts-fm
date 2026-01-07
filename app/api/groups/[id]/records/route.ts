import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { getGroupRecords, calculateGroupRecords, triggerRecordsCalculation } from '@/lib/group-records'
import { prisma } from '@/lib/prisma'
import { RecordsCalculationLogger } from '@/lib/records-calculation-logger'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const records = await getGroupRecords(group.id)

    if (!records) {
      return NextResponse.json({
        status: 'not_started',
        records: null,
      })
    }

    // Enrich user records with user images
    let enrichedRecords = records.records
    if (records.status === 'completed' && enrichedRecords) {
      const recordsData = enrichedRecords as any
      
      // Get all user IDs from user records
      const userIds = new Set<string>()
      const userRecordFields = [
        'userMostVS',
        'userMostPlays',
        'userMostEntries',
        'userLeastEntries',
        'userMostNumberOnes',
        'userMostWeeksContributing',
        'userTasteMaker',
        'userPeakPerformer',
      ]
      
      userRecordFields.forEach((field) => {
        if (recordsData[field]?.userId) {
          userIds.add(recordsData[field].userId)
        }
      })
      
      // Fetch user images
      if (userIds.size > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, image: true },
        })
        
        const userImageMap = new Map(users.map(u => [u.id, u.image]))
        
        // Enrich user records with images
        userRecordFields.forEach((field) => {
          if (recordsData[field]?.userId) {
            recordsData[field].image = userImageMap.get(recordsData[field].userId) || null
          }
        })
      }
    }

    return NextResponse.json({
      status: records.status,
      records: records.status === 'completed' ? enrichedRecords : null,
      calculationStartedAt: records.calculationStartedAt,
      chartsGeneratedAt: records.chartsGeneratedAt,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if calculation should run
    const shouldRun = await triggerRecordsCalculation(group.id)
    
    if (!shouldRun) {
      return NextResponse.json(
        { error: 'Records calculation is already in progress or was recently completed' },
        { status: 409 }
      )
    }

    // Get existing records to check status
    const existing = await getGroupRecords(group.id)
    
    // Delete existing records if they exist (for fresh calculation)
    if (existing) {
      await prisma.groupRecords.delete({
        where: { groupId: group.id },
      })
    }

    // Create new record with "calculating" status
    await prisma.groupRecords.create({
      data: {
        groupId: group.id,
        status: 'calculating',
        calculationStartedAt: new Date(),
        chartsGeneratedAt: existing?.chartsGeneratedAt || new Date(),
        records: {},
      },
    })

    // Start calculation in background (fire-and-forget)
    calculateRecordsInBackground(group.id).catch((error) => {
      console.error('Error calculating records in background:', error)
      // Update status to failed
      prisma.groupRecords.update({
        where: { groupId: group.id },
        data: { status: 'failed' },
      }).catch((err) => {
        console.error('Error updating records status to failed:', err)
      })
    })

    return NextResponse.json({ success: true, message: 'Records calculation started' })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error starting records calculation:', error)
    return NextResponse.json(
      { error: 'Failed to start records calculation' },
      { status: 500 }
    )
  }
}

// Background function to calculate records
async function calculateRecordsInBackground(groupId: string): Promise<void> {
  const logger = new RecordsCalculationLogger(groupId)
  
  try {
    const records = await calculateGroupRecords(groupId, undefined, logger)
    
    // Update records with completed status
    await prisma.groupRecords.update({
      where: { groupId },
      data: {
        status: 'completed',
        records: records as any,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    logger.log('Error during calculation', 0, String(error))
    await logger.logSummary()
    
    // Update status to failed
    await prisma.groupRecords.update({
      where: { groupId },
      data: { status: 'failed' },
    })
    
    throw error
  }
}

