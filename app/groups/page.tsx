import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups } from '@/lib/group-queries'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'

export default async function GroupsPage() {
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

  const groups = await getUserGroups(user.id)

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Groups</h1>
          <Link
            href="/groups/create"
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Create Group
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 mb-4">You don't have any groups yet.</p>
            <Link
              href="/groups/create"
              className="text-yellow-600 hover:underline"
            >
              Create your first group
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group: any) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <SafeImage
                      src={group.image}
                      alt={group.name}
                      className="rounded-lg object-cover w-16 h-16"
                    />
                  </div>
                  <h2 className="text-2xl font-semibold">{group.name}</h2>
                </div>
                  {group.description && (
                    <p className="text-gray-600 mb-4">{group.description}</p>
                  )}
                <div className="text-sm text-gray-500">
                  <p>Creator: {group.creator.name || group.creator.lastfmUsername}</p>
                  <p>Members: {group._count.members}</p>
                  <p>Created: {new Date(group.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

