import { requireGroupCreator } from '@/lib/group-auth'
import { getSuperuser } from '@/lib/admin'
import Link from 'next/link'
import GenerateChartsClient from './GenerateChartsClient'

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

  const superuser = await getSuperuser()
  const isSuperuser = superuser !== null

  return <GenerateChartsClient groupId={params.id} isSuperuser={isSuperuser} />
}

