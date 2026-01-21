import { Metadata } from 'next'
import { requireSuperuser } from '@/lib/admin'
import AdminTabs from './AdminTabs'
import CreateUserForm from './users/create/CreateUserForm'
import BulkGenerateForm from './bulk-generate/BulkGenerateForm'
import CleanupTab from './CleanupTab'
import UserListTab from './UserListTab'
import MetricsTab from './MetricsTab'

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Superuser admin panel',
}

export default async function AdminPage() {
  // Check superuser access - will redirect if not authorized
  await requireSuperuser()

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Admin Panel
        </h1>
        <AdminTabs
          metricsContent={<MetricsTab />}
          createUserContent={<CreateUserForm />}
          bulkGenerateContent={<BulkGenerateForm />}
          cleanupContent={<CleanupTab />}
          userListContent={<UserListTab />}
        />
      </div>
    </main>
  )
}
