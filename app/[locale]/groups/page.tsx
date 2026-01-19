import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups, getUserGroupInvites } from '@/lib/group-queries'
import { Link } from '@/i18n/routing'
import GroupsTabs from './GroupsTabs'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const t = await getTranslations('groups.list')
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

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('groups.list')
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

  const groups = await getUserGroups(user.id)
  const invites = await getUserGroupInvites(user.id)

  // Separate groups into owned groups (where user is owner) and member groups
  // Filter out groups with null creators to match the Group interface
  const adminGroups = groups.filter((group: any) => group.creatorId === user.id && group.creator !== null) as any
  const memberGroups = groups.filter((group: any) => group.creatorId !== user.id && group.creator !== null) as any

  // Get pending request counts for owned groups
  const pendingRequestsMap: Record<string, number> = {}
  if (adminGroups.length > 0) {
    const ownedGroupIds = adminGroups.map((group: any) => group.id)
    const pendingRequestsCounts = await prisma.groupJoinRequest.groupBy({
      by: ['groupId'],
      where: {
        groupId: { in: ownedGroupIds },
        status: 'pending',
      },
      _count: {
        id: true,
      },
    })

    // Create a map of groupId -> pending request count
    pendingRequestsCounts.forEach((item) => {
      pendingRequestsMap[item.groupId] = item._count.id
    })
  }

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <LiquidGlassLink
              href="/groups/discover"
              variant="neutral"
              useTheme={false}
            >
              {t('browseGroups')}
            </LiquidGlassLink>
            <LiquidGlassLink
              href="/groups/create"
              variant="primary"
              useTheme={false}
            >
              {t('createGroup')}
            </LiquidGlassLink>
          </div>
        </div>

        <GroupsTabs
          ownedGroups={adminGroups}
          memberGroups={memberGroups}
          invites={invites.filter((invite: any) => invite.group.creator !== null) as any}
          userId={user.id}
          pendingRequestsMap={pendingRequestsMap}
        />
      </div>
    </main>
  )
}

