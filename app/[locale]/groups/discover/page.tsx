import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DiscoverGroupsClient from './DiscoverGroupsClient'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const t = await getTranslations('groups.discover')
  const tSite = await getTranslations('site');
  
  return {
    title: t('title'),
    openGraph: {
      images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
    },
    twitter: {
      images: [defaultOgImage],
    },
  }
}

export default async function DiscoverGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('groups.discover')
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect(`/${locale}/`)
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect(`/${locale}/`)
  }

  // Fetch initial groups data directly from database
  let initialGroups: any[] = []
  let error = null

  try {
    // Get first page of public groups (20 groups)
    const limit = 20
    const groups = await prisma.group.findMany({
      where: {
        isPrivate: false,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Get latest chart update and week count for each group
    const groupsWithActivity = await Promise.all(
      groups.map(async (group) => {
        const [latestChart, weekCount, dynamicImage] = await Promise.all([
          prisma.groupChartEntry.findFirst({
            where: { groupId: group.id },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          }),
          prisma.groupWeeklyStats.count({
            where: { groupId: group.id },
          }),
          getGroupImageUrl({
            id: group.id,
            image: group.image,
            dynamicIconEnabled: (group as any).dynamicIconEnabled,
            dynamicIconSource: (group as any).dynamicIconSource,
          }),
        ])

        return {
          id: group.id,
          name: group.name,
          image: dynamicImage,
          colorTheme: group.colorTheme,
          allowFreeJoin: group.allowFreeJoin,
          createdAt: group.createdAt.toISOString(),
          creator: group.creator,
          _count: group._count,
          lastChartUpdate: latestChart?.updatedAt.toISOString() || null,
          weekCount,
          tags: Array.isArray((group as any).tags) ? (group as any).tags : [],
        }
      })
    )

    initialGroups = groupsWithActivity
  } catch (err) {
    console.error('Error fetching groups:', err)
    error = t('failedToLoadGroups')
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            {t('title')}
          </h1>
        </div>

        <DiscoverGroupsClient initialGroups={initialGroups} initialError={error} userId={user.id} />
      </div>
    </main>
  )
}

