'use client'

import { useState } from 'react'
import RemoveMemberModal from './RemoveMemberModal'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface RemoveMemberButtonProps {
  groupId: string
  userId: string
  memberName: string
}

export default function RemoveMemberButton({
  groupId,
  userId,
  memberName,
}: RemoveMemberButtonProps) {
  const t = useSafeTranslations('groups.members.removeModal')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)

  const handleRemoved = () => {
    setIsRemoved(true)
  }

  if (isRemoved) {
    return (
      <span className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded">
        {t('removed')}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title={t('removeFromGroup', { memberName })}
      >
        {t('remove')}
      </button>

      <RemoveMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRemoved={handleRemoved}
        groupId={groupId}
        userId={userId}
        memberName={memberName}
      />
    </>
  )
}

