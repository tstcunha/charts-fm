import { getGroupAccess } from '@/lib/group-auth'
import { getGroupRecords } from '@/lib/group-records'
import { Link } from '@/i18n/routing'
import RecordsClient from './RecordsClient'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const t = await getTranslations('records')
  const tSite = await getTranslations('site');
  
  try {
    const { group } = await getGroupAccess(id)
    const tGroups = await getTranslations('groups')
    return {
      title: `${group?.name || tGroups('title')} - ${t('title')}`,
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  } catch {
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
}

export default async function RecordsPage({ params }: { params: { id: string; locale: string } }) {
  const { user, group } = await getGroupAccess(params.id)
  const t = await getTranslations('records')
  const tGroups = await getTranslations('groups')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-24">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{t('notFound')}</h1>
          <Link href="/groups" className="text-gray-600 hover:underline text-sm md:text-base">
            {t('backToGroups')}
          </Link>
        </div>
      </main>
    )
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get records data
  const records = await getGroupRecords(group.id)
  
  // Get member count
  const memberCount = await prisma.groupMember.count({
    where: { groupId: group.id },
  })
  
  // Enrich user records with user images if records are completed
  if (records && records.status === 'completed' && records.records) {
    const recordsData = records.records as any
    
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

  // Get dynamic group image (includes user-chosen artist images if dynamic covers are enabled)
  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: t('breadcrumb') },
          ]}
          subheader={t('subheader')}
        />

        {/* Records Content - Client Component */}
        <RecordsClient 
          groupId={group.id}
          initialRecords={records}
          memberCount={memberCount}
        />
      </div>
    </main>
  )
}

