import { getPublicGroupById, getGroupWeeklyStats } from '@/lib/group-queries'
import { formatWeekDate } from '@/lib/weekly-utils'
import SafeImage from '@/components/SafeImage'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RequestToJoinButton from './RequestToJoinButton'

export default async function PublicGroupPage({ params }: { params: { id: string } }) {
  const group = await getPublicGroupById(params.id)
  
  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <p className="text-gray-600 mb-4">
            This group may not exist or may be private.
          </p>
        </div>
      </main>
    )
  }

  const weeklyStats = await getGroupWeeklyStats(group.id)
  
  // Check if user is logged in and is a member (for optional "View as Member" link)
  const session = await getSession()
  let isMember = false
  let hasPendingRequest = false
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (user) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: user.id,
          },
        },
      })
      isMember = !!membership || user.id === group.creatorId

      // Check if user has a pending request
      if (!isMember) {
        const pendingRequest = await prisma.groupJoinRequest.findUnique({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId: user.id,
            },
          },
        })
        hasPendingRequest = pendingRequest?.status === 'pending'
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-8">
          {isMember && (
            <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
              ← View as Member
            </Link>
          )}
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <SafeImage
                  src={group.image}
                  alt={group.name}
                  className="rounded-lg object-cover w-24 h-24"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{group.name}</h1>
                {group.description && (
                  <p className="text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  <p>Creator: {group.creator.name || group.creator.lastfmUsername}</p>
                  <p>Members: {group._count.members}</p>
                </div>
              </div>
            </div>
            {session?.user?.email && !isMember && (
              <RequestToJoinButton
                groupId={group.id}
                hasPendingRequest={hasPendingRequest}
                allowFreeJoin={group.allowFreeJoin ?? false}
              />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Weekly Charts</h2>
          {weeklyStats.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600 mb-4">No charts available yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {weeklyStats.map((week: any) => (
                <div key={week.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Week of {formatWeekDate(week.weekStart)}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Top Artists</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {(week.topArtists as any[]).map((artist: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {artist.name} ({artist.playcount} plays)
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Top Tracks</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {(week.topTracks as any[]).map((track: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {track.name} by {track.artist} ({track.playcount} plays)
                          </li>
                        ))}
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Top Albums</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {(week.topAlbums as any[]).map((album: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {album.name} by {album.artist} ({album.playcount} plays)
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

