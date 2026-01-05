'use client'

import { useState } from 'react'
import RevokeInviteModal from './RevokeInviteModal'

interface RevokeInviteButtonProps {
  groupId: string
  inviteId: string
  userName: string
  onInviteRevoked?: () => void
}

export default function RevokeInviteButton({
  groupId,
  inviteId,
  userName,
  onInviteRevoked,
}: RevokeInviteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRevoked, setIsRevoked] = useState(false)

  const handleRevoked = () => {
    setIsRevoked(true)
  }

  if (isRevoked) {
    return (
      <span className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded">
        Revoked!
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title={`Revoke invite for ${userName}`}
      >
        Revoke Invite
      </button>

      <RevokeInviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRevoked={handleRevoked}
        groupId={groupId}
        inviteId={inviteId}
        userName={userName}
      />
    </>
  )
}

