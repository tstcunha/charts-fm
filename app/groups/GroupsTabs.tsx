'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'

interface Group {
  id: string
  name: string
  image: string | null
  creator: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  _count: {
    members: number
  }
  createdAt: Date
}

interface Invite {
  id: string
  groupId: string
  group: Group
  createdAt: Date
}

interface GroupsTabsProps {
  ownedGroups: Group[]
  memberGroups: Group[]
  invites: Invite[]
  userId: string
}

export default function GroupsTabs({ ownedGroups, memberGroups, invites, userId }: GroupsTabsProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'invites'>('groups')
  
  // Merge groups with owned groups first
  const allGroups = [...ownedGroups, ...memberGroups]
  const [rejectedInviteIds, setRejectedInviteIds] = useState<Set<string>>(new Set())
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null)
  const router = useRouter()

  const handleAcceptInvite = async (inviteId: string, groupId: string) => {
    setProcessingInviteId(inviteId)
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      // Refresh the page
      router.refresh()
    } catch (err) {
      console.error('Failed to accept invite:', err)
      setProcessingInviteId(null)
    }
  }

  const handleRejectInvite = async (inviteId: string, groupId: string) => {
    setProcessingInviteId(inviteId)
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject invite')
      }

      // Grey out the card
      setRejectedInviteIds((prev) => new Set(prev).add(inviteId))
      setProcessingInviteId(null)
    } catch (err) {
      console.error('Failed to reject invite:', err)
      setProcessingInviteId(null)
    }
  }

  const renderGroupCard = (group: Group, href: string) => {
    const isOwner = group.creator.id === userId
    
    return (
      <Link
        key={group.id}
        href={href}
        className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <SafeImage
              src={group.image}
              alt={group.name}
              className="rounded-lg object-cover w-16 h-16"
            />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-semibold">{group.name}</h3>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          <p className="flex items-center gap-2">
            Owner: {group.creator.name || group.creator.lastfmUsername}
            {isOwner && (
              <span className="text-xs bg-yellow-100 text-black px-2 py-0.5 rounded border border-yellow-600 font-semibold">
                THAT'S YOU!
              </span>
            )}
          </p>
          <p>Members: {group._count.members}</p>
          <p>Created: {new Date(group.createdAt).toLocaleDateString()}</p>
        </div>
      </Link>
    )
  }

  const renderInviteCard = (invite: Invite) => {
    const isRejected = rejectedInviteIds.has(invite.id)
    const isProcessing = processingInviteId === invite.id

    return (
      <div
        key={invite.id}
        className={`bg-white rounded-lg shadow-lg p-6 transition-opacity ${
          isRejected ? 'opacity-50' : ''
        }`}
      >
        <Link
          href={`/groups/${invite.groupId}/public`}
          className="block mb-4"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <SafeImage
                src={invite.group.image}
                alt={invite.group.name}
                className="rounded-lg object-cover w-16 h-16"
              />
            </div>
            <h3 className="text-2xl font-semibold">{invite.group.name}</h3>
          </div>
          <div className="text-sm text-gray-500">
            <p>Owner: {invite.group.creator.name || invite.group.creator.lastfmUsername}</p>
            <p>Members: {invite.group._count.members}</p>
            <p>Created: {new Date(invite.group.createdAt).toLocaleDateString()}</p>
          </div>
        </Link>
        <div className="flex gap-2 mt-4">
          <button
            onClick={(e) => {
              e.preventDefault()
              handleAcceptInvite(invite.id, invite.groupId)
            }}
            disabled={isProcessing || isRejected}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Accept'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              handleRejectInvite(invite.id, invite.groupId)
            }}
            disabled={isProcessing || isRejected}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'groups'
              ? 'border-b-2 border-yellow-500 text-yellow-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          My Groups
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'invites'
              ? 'border-b-2 border-yellow-500 text-yellow-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Invites ({invites.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'groups' && (
        <div>
          {allGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allGroups.map((group) => renderGroupCard(group, `/groups/${group.id}`))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600">You don't have any groups yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div>
          {invites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invites.map((invite) => renderInviteCard(invite))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600">You don't have any pending invites.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

