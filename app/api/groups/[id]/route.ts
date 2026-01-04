import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - Delete a group and all associated data
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const groupId = params.id

  // Check if user is the creator
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
      name: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can delete the group' },
      { status: 403 }
    )
  }

  // Delete the group - Prisma will cascade delete all related records:
  // - GroupMember (members)
  // - GroupJoinRequest (join requests)
  // - GroupInvite (invites)
  // - GroupWeeklyStats (weekly stats)
  // - GroupChartEntry (chart entries)
  // - GroupAllTimeStats (all-time stats)
  // - UserChartEntryVS (user chart entry vibe scores)
  await prisma.group.delete({
    where: { id: groupId },
  })

  return NextResponse.json({ 
    success: true,
    message: 'Group deleted successfully' 
  })
}

