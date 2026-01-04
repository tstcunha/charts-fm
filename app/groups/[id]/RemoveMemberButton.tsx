'use client'

import { useState } from 'react'
import RemoveMemberModal from './RemoveMemberModal'

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)

  const handleRemoved = () => {
    setIsRemoved(true)
  }

  if (isRemoved) {
    return (
      <span className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded">
        Removed!
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title={`Remove ${memberName} from group`}
      >
        Remove
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

