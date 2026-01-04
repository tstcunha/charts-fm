'use client'

import { useState } from 'react'
import AddMemberModal from './AddMemberModal'

interface AddMemberButtonProps {
  groupId: string
}

export default function AddMemberButton({ groupId }: AddMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
      >
        Add Member
      </button>

      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
      />
    </>
  )
}

