import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import SafeImage from '@/components/SafeImage'
import { Link } from '@/i18n/routing'
import PersonalListeningOverview from '@/components/dashboard/PersonalListeningOverview'
import { getSession } from '@/lib/auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; lastfmUsername: string }>
}): Promise<Metadata> {
  const { locale, lastfmUsername } = await params
  const tSite = await getTranslations('site')

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'
  const defaultOgImage = `${siteUrl}/social-preview.png`

  const username = decodeURIComponent(lastfmUsername)
  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { name: true, lastfmUsername: true, profilePublic: true },
  })

  if (!user || !user.profilePublic) {
    return {
      title: tSite('name'),
      openGraph: { images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }] },
      twitter: { images: [defaultOgImage] },
    }
  }

  const title = `${user.name || user.lastfmUsername} (@${user.lastfmUsername})`
  const url = `${siteUrl}/${locale}/u/${encodeURIComponent(user.lastfmUsername)}`

  return {
    title,
    openGraph: {
      type: 'website',
      url,
      siteName: tSite('name'),
      title,
      images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [defaultOgImage],
    },
  }
}

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ locale: string; lastfmUsername: string }>
}) {
  const { lastfmUsername } = await params
  const t = await getTranslations('profilePublic')

  const username = decodeURIComponent(lastfmUsername).trim()
  if (!username) notFound()

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: {
      id: true,
      name: true,
      image: true,
      lastfmUsername: true,
      bio: true,
      profilePublic: true,
      showProfileStats: true,
      showProfileGroups: true,
    },
  })

  if (!user || !user.profilePublic) notFound()

  const groups = user.showProfileGroups
    ? await prisma.group.findMany({
        where: { OR: [{ creatorId: user.id }, { members: { some: { userId: user.id } } }] },
        select: { id: true, name: true, image: true, isPrivate: true, creatorId: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  const session = await getSession()
  const viewerUserId = session?.user?.id || null
  const isSelf = viewerUserId === user.id

  // Hide private groups unless viewer can actually access them.
  const privateGroupIds = !isSelf && viewerUserId
    ? groups.filter((g) => g.isPrivate).map((g) => g.id)
    : []

  const viewerPrivateMemberships = privateGroupIds.length
    ? await prisma.groupMember.findMany({
        where: { userId: viewerUserId!, groupId: { in: privateGroupIds } },
        select: { groupId: true },
      })
    : []

  const viewerPrivateGroupIdSet = new Set(viewerPrivateMemberships.map((m) => m.groupId))

  const visibleGroups = groups.filter((g) => {
    if (!g.isPrivate) return true
    if (isSelf) return true
    if (!viewerUserId) return false
    if (g.creatorId === viewerUserId) return true
    return viewerPrivateGroupIdSet.has(g.id)
  })

  const lastfmUrl = `https://www.last.fm/user/${encodeURIComponent(user.lastfmUsername)}`

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 relative">
      <div className="max-w-5xl w-full mx-auto">
        <div
          className="rounded-3xl p-6 md:p-8 border border-gray-200 shadow-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white/60 shadow-lg">
                <SafeImage
                  src={user.image}
                  alt={user.name || user.lastfmUsername}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                  {user.name || user.lastfmUsername}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <p className="text-sm md:text-base text-gray-600 font-semibold truncate">@{user.lastfmUsername}</p>
                  <a
                    href={lastfmUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-red-800 hover:bg-red-900 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap text-sm md:text-base w-fit"
                  >
                    {t('viewOnLastfm')}
                  </a>
                </div>
              </div>

              {user.bio ? (
                <p className="mt-4 text-sm md:text-base text-gray-700 whitespace-pre-wrap">{user.bio}</p>
              ) : (
                <p className="mt-4 text-sm text-gray-500">{t('noBio')}</p>
              )}
            </div>
          </div>
        </div>

        {user.showProfileGroups && (
          <section className="mt-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">{t('groupsTitle')}</h2>
            {visibleGroups.length === 0 ? (
              <p className="text-sm text-gray-600">{t('noGroups')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleGroups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/60">
                        <SafeImage src={g.image} alt={g.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{g.name}</div>
                        {g.isPrivate && (
                          <div className="text-xs text-gray-500 font-medium">{t('privateGroupBadge')}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {user.showProfileStats && (
          <section className="mt-8">
            <PersonalListeningOverview username={user.lastfmUsername} />
          </section>
        )}
      </div>
    </main>
  )
}

