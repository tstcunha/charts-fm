import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUserFromDB } from '@/lib/auth'

function getSoloGroupName(locale: string | null | undefined) {
  // Keep in sync with i18n `dashboard.emptyState.soloGroupName`
  if ((locale || '').toLowerCase().startsWith('pt')) return 'Meus charts'
  return 'My charts'
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromDB()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // One solo group per user: reuse if it exists
  const existing = await prisma.group.findFirst({
    where: {
      creatorId: user.id,
      isSolo: true,
    } as any,
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ groupId: existing.id, reused: true }, { status: 200 })
  }

  const group = await prisma.group.create({
    data: {
      name: getSoloGroupName(user.locale),
      isSolo: true,
      isPrivate: true,
      allowFreeJoin: false,
      chartSize: 20,
      chartMode: 'vs_weighted',
      dynamicIconEnabled: true,
      dynamicIconSource: 'top_album',
      creatorId: user.id,
      members: {
        create: { userId: user.id },
      },
    } as any,
    select: { id: true },
  })

  return NextResponse.json({ groupId: group.id, reused: false }, { status: 201 })
}

