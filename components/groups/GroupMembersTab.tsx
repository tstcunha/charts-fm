'use client'

import { useState, useEffect, useCallback } from 'react'
import SafeImage from '@/components/SafeImage'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import InviteMemberButton from '@/app/groups/[id]/InviteMemberButton'
import RemoveMemberButton from '@/app/groups/[id]/RemoveMemberButton'
import RevokeInviteButton from '@/app/groups/[id]/RevokeInviteButton'
import LeaveGroupButton from '@/app/groups/[id]/LeaveGroupButton'
import RequestsButton from '@/app/groups/[id]/RequestsButton'

interface GroupMembersTabProps {
  groupId: string
}

export default function GroupMembersTab({ groupId }: GroupMembersTabProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setData(data)
        setError(null)
      }
    } catch (err) {
      setError('Failed to load members')
      console.error('Error fetching members:', err)
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Members</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Members</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>{error || 'Failed to load members'}</p>
        </div>
      </div>
    )
  }

  const { members, pendingInvites, isOwner, requestCount, creatorId } = data
  const isMember = members.some((m: any) => m.userId !== creatorId)

  const memberCount = members.length
  const isAtLimit = memberCount >= MAX_GROUP_MEMBERS

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Members</h2>
          <p className="text-sm text-gray-600 mt-1">
            {memberCount} / {MAX_GROUP_MEMBERS} members
            {isAtLimit && (
              <span className="ml-2 text-yellow-600 font-semibold">(Limit reached)</span>
            )}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <InviteMemberButton groupId={groupId} onInviteSent={fetchMembers} />
            <RequestsButton groupId={groupId} requestCount={requestCount} />
          </div>
        )}
      </div>
      <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-primary-lighter)]/30 rounded-xl shadow-sm p-6 border border-theme">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Display actual members */}
          {members.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-theme shadow-sm hover:shadow transition-all hover:bg-[var(--theme-primary-lighter)]/30"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-12 h-12 rounded-full ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] flex-shrink-0 overflow-hidden">
                  <SafeImage
                    src={member.user.image}
                    alt={member.user.name || member.user.lastfmUsername}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {member.user.name || member.user.lastfmUsername}
                    </p>
                    {member.user.id === creatorId && (
                      <span className="flex-shrink-0 text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-2 py-0.5 rounded-full font-bold shadow-sm">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">@{member.user.lastfmUsername}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {isOwner && member.user.id !== creatorId && (
                  <RemoveMemberButton
                    groupId={groupId}
                    userId={member.user.id}
                    memberName={member.user.name || member.user.lastfmUsername}
                  />
                )}
              </div>
            </div>
          ))}
          {/* Display invited users */}
          {isOwner && pendingInvites.map((invite: any) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-theme shadow-sm hover:shadow transition-all hover:bg-[var(--theme-primary-lighter)]/30"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-12 h-12 rounded-full ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] flex-shrink-0 overflow-hidden">
                  <SafeImage
                    src={invite.user.image}
                    alt={invite.user.name || invite.user.lastfmUsername}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {invite.user.name || invite.user.lastfmUsername}
                    </p>
                    <span className="flex-shrink-0 text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-2 py-0.5 rounded-full font-bold shadow-sm">
                      Invited
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">@{invite.user.lastfmUsername}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <RevokeInviteButton
                  groupId={groupId}
                  inviteId={invite.id}
                  userName={invite.user.name || invite.user.lastfmUsername}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Leave Group Button */}
        {isMember && !isOwner && (
          <div className="mt-6 pt-6 border-t border-[var(--theme-border)]/50">
            <div className="flex justify-end">
              <LeaveGroupButton groupId={groupId} isOwner={isOwner} subtle={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

