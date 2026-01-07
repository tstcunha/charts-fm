import { requireSuperuser } from '@/lib/admin'
import CreateUserForm from './CreateUserForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create User',
}

export default async function CreateUserPage() {
  // Check superuser access - will redirect if not authorized
  await requireSuperuser()

  return (
    <main className="flex min-h-screen flex-col p-24">
      <CreateUserForm />
    </main>
  )
}

