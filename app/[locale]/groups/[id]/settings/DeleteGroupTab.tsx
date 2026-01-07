'use client'

import { useState } from 'react'
import DeleteGroupModal from './DeleteGroupModal'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface DeleteGroupTabProps {
  groupId: string
  groupName: string
}

export default function DeleteGroupTab({
  groupId,
  groupName,
}: DeleteGroupTabProps) {
  const t = useSafeTranslations('groups.settings.deleteGroup')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-red-600">{t('title')}</h2>
          <p className="text-gray-600">
            {t('description')}
          </p>
        </div>

        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-3">
            {t('warning')}
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            {t('willDelete')}
          </p>
          <ul className="text-sm text-gray-700 list-disc list-inside mb-6 space-y-1">
            <li>{t('allCharts')}</li>
            <li>{t('allInvites')}</li>
            <li>{t('allRequests')}</li>
            <li>{t('allMembers')}</li>
          </ul>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            {t('deleteButton')}
          </button>
        </div>
      </div>

      <DeleteGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        groupName={groupName}
      />
    </>
  )
}

