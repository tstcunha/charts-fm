'use client'

import { useState } from 'react'
import InviteMemberModal from './InviteMemberModal'

interface InviteMemberButtonProps {
  groupId: string
  onInviteSent?: () => void
}

export default function InviteMemberButton({ groupId, onInviteSent }: InviteMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-colors font-semibold"
      >
        Invite Member
      </button>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        onInviteSent={onInviteSent}
      />
    </>
  )
}

