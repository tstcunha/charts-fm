import { requireSuperuser } from '@/lib/admin'
import BulkGenerateForm from './BulkGenerateForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bulk Generate',
}

export default async function BulkGeneratePage() {
  // Check superuser access - will redirect if not authorized
  await requireSuperuser()

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 relative">
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Bulk Generate Users & Groups
        </h1>
        <BulkGenerateForm />
      </div>
    </main>
  )
}
