import { requireGroupMembership } from '@/lib/group-auth'
import { Link } from '@/i18n/routing'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { isRecordTypeSupported, getRecordTypeDisplayName } from '@/lib/group-records'
import RecordDetailClient from './RecordDetailClient'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: { id: string; recordType: string; locale: string } }): Promise<Metadata> {
  const t = await getTranslations('records')
  try {
    const { group } = await requireGroupMembership(params.id)
    const tGroups = await getTranslations('groups')
    const displayName = getRecordTypeDisplayName(params.recordType)
    return {
      title: `${displayName} - ${group?.name || tGroups('title')} - ${t('title')}`,
    }
  } catch {
    return {
      title: t('title'),
    }
  }
}

export default async function RecordDetailPage({ params }: { params: { id: string; recordType: string; locale: string } }) {
  const { user, group } = await requireGroupMembership(params.id)
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

  // Validate record type
  if (!isRecordTypeSupported(params.recordType)) {
    notFound()
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  const displayName = getRecordTypeDisplayName(params.recordType)

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: group.image,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: t('breadcrumb'), href: `/groups/${group.id}/records` },
            { label: displayName },
          ]}
          subheader={t('subheader')}
        />

        <RecordDetailClient 
          groupId={group.id}
          recordType={params.recordType}
        />
      </div>
    </main>
  )
}

