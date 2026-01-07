'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import LiquidGlassButton from '@/components/LiquidGlassButton'

// Lazy load modal to reduce initial bundle size
const InviteMemberModal = dynamic(() => import('./InviteMemberModal'), {
  ssr: false,
  loading: () => null,
})

const MAX_GROUP_MEMBERS = 100

interface InviteMemberButtonProps {
  groupId: string
  onInviteSent?: () => void
}

export default function InviteMemberButton({ groupId, onInviteSent }: InviteMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMemberCount = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/members`)
        const data = await res.json()
        if (data.members) {
          setMemberCount(data.members.length)
        }
      } catch (err) {
        console.error('Error fetching member count:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (groupId) {
      fetchMemberCount()
    }
  }, [groupId, isModalOpen])

  const isAtLimit = memberCount !== null && memberCount >= MAX_GROUP_MEMBERS

  return (
    <>
      <LiquidGlassButton
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        useTheme
        disabled={isAtLimit}
        title={isAtLimit ? `Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members` : undefined}
      >
        Invite Member
      </LiquidGlassButton>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        onInviteSent={() => {
          if (onInviteSent) onInviteSent()
          setMemberCount(prev => prev !== null ? prev + 1 : null)
        }}
        memberCount={memberCount}
      />
    </>
  )
}

