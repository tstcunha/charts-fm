import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupById, getGroupWeeklyStats } from '@/lib/group-queries'
import Link from 'next/link'
import { formatWeekDate } from '@/lib/weekly-utils'
import LeaveGroupButton from './LeaveGroupButton'
import EditGroupIconButton from './EditGroupIconButton'
import SafeImage from '@/components/SafeImage'
import GroupTabs from './GroupTabs'

export default async function GroupPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  
  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const group = await getGroupById(params.id, user.id)
  
  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  const weeklyStats = await getGroupWeeklyStats(group.id)
  const isCreator = user.id === group.creatorId
  const isMember = group.members.some((m: any) => m.userId === user.id)

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-8">
          <Link href="/groups" className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Groups
          </Link>
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
            <div className="flex gap-2">
              {isCreator && (
                <>
                  <EditGroupIconButton groupId={group.id} currentImage={group.image} />
                  <Link
                    href={`/groups/${group.id}/add-member`}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
                  >
                    Add Member
                  </Link>
                  <Link
                    href={`/groups/${group.id}/generate`}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Generate Charts
                  </Link>
                </>
              )}
              {isMember && !isCreator && (
                <LeaveGroupButton groupId={group.id} />
              )}
            </div>
          </div>
        </div>

        <GroupTabs
          defaultTab="charts"
          membersContent={
            <div>
              <h2 className="text-2xl font-semibold mb-4">Members</h2>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="space-y-2">
                  {group.members.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{member.user.name || member.user.lastfmUsername}</p>
                        <p className="text-sm text-gray-500">@{member.user.lastfmUsername}</p>
                      </div>
                      {member.user.id === group.creatorId && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Creator
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
          chartsContent={
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Weekly Charts</h2>
                {weeklyStats.length > 1 && (
                  <Link
                    href={`/groups/${group.id}/charts`}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
                  >
                    Explore Charts
                  </Link>
                )}
              </div>
              {weeklyStats.length === 0 ? (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No charts available yet.</p>
                  {isCreator && (
                    <Link
                      href={`/groups/${group.id}/generate`}
                      className="text-yellow-600 hover:underline"
                    >
                      Generate charts
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const latestWeek = weeklyStats[0]
                    return (
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">
                          Week of {formatWeekDate(latestWeek.weekStart)}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">Top Artists</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {(latestWeek.topArtists as any[]).map((artist: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {artist.name} ({artist.playcount} plays)
                                </li>
                              ))}
                            </ol>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Top Tracks</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {(latestWeek.topTracks as any[]).map((track: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {track.name} by {track.artist} ({track.playcount} plays)
                                </li>
                              ))}
                            </ol>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Top Albums</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {(latestWeek.topAlbums as any[]).map((album: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {album.name} by {album.artist} ({album.playcount} plays)
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          }
        />
      </div>
    </main>
  )
}

