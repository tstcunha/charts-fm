'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import LiquidGlassButton from '@/components/LiquidGlassButton'

// Lazy load modal to reduce initial bundle size
const InviteMemberModal = dynamic(() => import('./InviteMemberModal'), {
  ssr: false,
  loading: () => null,
})

interface InviteMemberButtonProps {
  groupId: string
  onInviteSent?: () => void
}

export default function InviteMemberButton({ groupId, onInviteSent }: InviteMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <LiquidGlassButton
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        useTheme
      >
        Invite Member
      </LiquidGlassButton>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        onInviteSent={onInviteSent}
      />
    </>
  )
}

