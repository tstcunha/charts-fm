import Link from 'next/link'

interface RegenerateChartsTabProps {
  groupId: string
}

export default function RegenerateChartsTab({ groupId }: RegenerateChartsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-semibold mb-4">Regenerate Charts</h2>
      <p className="text-gray-600 mb-6">
        Regenerate charts for the last 5 weeks with the listening data of the current members of the group.
        This may take a few moments.
      </p>
      <Link
        href={`/groups/${groupId}/generate`}
        className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
      >
        Generate Charts
      </Link>
    </div>
  )
}

