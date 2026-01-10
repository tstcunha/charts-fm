import { getGroupAccess } from '@/lib/group-auth'
import GroupPageHero from '@/components/groups/GroupPageHero'
import ChartToppersClient from './ChartToppersClient'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: { id: string; locale: string } }): Promise<Metadata> {
  const t = await getTranslations('chartToppers')
  try {
    const { group } = await getGroupAccess(params.id)
    const tGroups = await getTranslations('groups')
    return {
      title: `${t('title')} - ${group?.name || tGroups('title')}`,
    }
  } catch {
    return {
      title: t('title'),
    }
  }
}

export default async function ChartToppersPage({ params }: { params: { id: string; locale: string } }) {
  const { user, group } = await getGroupAccess(params.id)
  const t = await getTranslations('chartToppers')
  const tGroups = await getTranslations('groups')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 lg:p-24">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">{t('notFound')}</h1>
        </div>
      </main>
    )
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

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
            { label: t('title') },
          ]}
          subheader={t('subheader')}
        />

        <ChartToppersClient 
          groupId={group.id}
        />
      </div>
    </main>
  )
}

