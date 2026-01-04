import { requireSuperuser } from '@/lib/admin'
import CreateUserForm from './CreateUserForm'

export default async function CreateUserPage() {
  // Check superuser access - will redirect if not authorized
  await requireSuperuser()

  return (
    <main className="flex min-h-screen flex-col p-24">
      <CreateUserForm />
    </main>
  )
}

