import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  // Get full user data including lastfmUsername
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      lastfmUsername: true,
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-4xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-6">Welcome to ChartsFM</h1>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Your Name</p>
              <p className="text-xl font-semibold">{user.name || 'Not set'}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Last.fm Username</p>
              <p className="text-xl font-semibold">{user.lastfmUsername}</p>
            </div>
          </div>

          <div className="pt-6 border-t">
            <Link
              href="/groups"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Groups
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

