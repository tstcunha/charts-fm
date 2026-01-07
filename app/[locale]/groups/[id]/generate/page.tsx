import { requireGroupCreator } from '@/lib/group-auth'
import { getSuperuser } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { Link } from '@/i18n/routing'
import GenerateChartsClient from './GenerateChartsClient'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { group } = await requireGroupCreator(params.id)
    return {
      title: `${group?.name || 'Group'} - Generate Charts`,
    }
  } catch {
    return {
      title: 'Generate Charts',
    }
  }
}

export default async function GenerateChartsPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupCreator(params.id)

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

  // Fetch the latest group state to check lock status
  const latestGroup = await prisma.group.findUnique({
    where: { id: params.id },
    select: {
      chartGenerationInProgress: true,
    },
  })

  const superuser = await getSuperuser()
  const isSuperuser = superuser !== null
  const chartGenerationInProgress = latestGroup?.chartGenerationInProgress || false

  return (
    <GenerateChartsClient
      groupId={params.id}
      isSuperuser={isSuperuser}
      initialInProgress={chartGenerationInProgress}
    />
  )
}

