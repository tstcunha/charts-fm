'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import Toggle from '@/components/Toggle'
import SafeImage from '@/components/SafeImage'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons'

interface User {
  id: string
  name: string | null
  lastfmUsername: string
  image: string | null
  permissionId: string
}

interface ShoutboxSettingsTabProps {
  groupId: string
}

export default function ShoutboxSettingsTab({ groupId }: ShoutboxSettingsTabProps) {
  const router = useRouter()
  const [shoutboxEnabled, setShoutboxEnabled] = useState(true)
  const [shoutboxRestrictiveMode, setShoutboxRestrictiveMode] = useState(false)
  const [silencedUsers, setSilencedUsers] = useState<User[]>([])
  const [allowedUsers, setAllowedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [searchUsername, setSearchUsername] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<{ id: string; name: string | null; lastfmUsername: string } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [silencingUserId, setSilencingUserId] = useState<string | null>(null)
  const [unsilencingUserId, setUnsilencingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [groupId])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/settings`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setShoutboxEnabled(data.shoutboxEnabled ?? true)
        setShoutboxRestrictiveMode(data.shoutboxRestrictiveMode ?? false)
        setSilencedUsers(data.silencedUsers || [])
        setAllowedUsers(data.allowedUsers || [])
        setError(null)
      }
    } catch (err) {
      setError('Failed to load settings')
      console.error('Error fetching settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const searchUser = async () => {
    if (!searchUsername.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const res = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(searchUsername.trim())}`)
      const data = await res.json()
      
      if (data.error) {
        setSearchError(data.error)
      } else if (data.user) {
        setSearchResult(data.user)
      } else {
        setSearchError('User not found')
      }
    } catch (err) {
      setSearchError('Failed to search for user')
      console.error('Error searching user:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSilence = async (userId: string) => {
    if (silencingUserId) return

    setSilencingUserId(userId)
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to silence user')
        setSilencingUserId(null)
        return
      }

      await fetchSettings()
      setSearchUsername('')
      setSearchResult(null)
      setSearchError(null)
    } catch (err) {
      setError('Failed to silence user')
      console.error('Error silencing user:', err)
    } finally {
      setSilencingUserId(null)
    }
  }

  const handleUnsilence = async (userId: string) => {
    if (unsilencingUserId) return

    setUnsilencingUserId(userId)
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/silence?userId=${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to remove silence')
        setUnsilencingUserId(null)
        return
      }

      await fetchSettings()
    } catch (err) {
      setError('Failed to remove silence')
      console.error('Error removing silence:', err)
    } finally {
      setUnsilencingUserId(null)
    }
  }

  const handleAllow = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/allow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to allow user')
        return
      }

      await fetchSettings()
      setSearchUsername('')
      setSearchResult(null)
      setSearchError(null)
    } catch (err) {
      setError('Failed to allow user')
      console.error('Error allowing user:', err)
    }
  }

  const handleRevokeAllow = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/allow?userId=${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to revoke permission')
        return
      }

      await fetchSettings()
    } catch (err) {
      setError('Failed to revoke permission')
      console.error('Error revoking permission:', err)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoutboxEnabled,
          shoutboxRestrictiveMode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center py-8">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Shoutbox settings updated successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shoutbox Settings
          </label>
          <Toggle
            id="shoutboxEnabled"
            checked={shoutboxEnabled}
            onChange={setShoutboxEnabled}
            disabled={isSaving}
            label="Enable Shoutbox"
          />
          <p className="text-xs text-gray-500 mt-1">
            When disabled, the shoutbox will be hidden from the group page. Existing comments are preserved.
          </p>
        </div>

        <div>
          <Toggle
            id="shoutboxRestrictiveMode"
            checked={shoutboxRestrictiveMode}
            onChange={setShoutboxRestrictiveMode}
            disabled={isSaving}
            label="Restrictive Mode"
          />
          <p className="text-xs text-gray-500 mt-1">
            When enabled, only users explicitly added to the allowed list can post comments. By default, all members can post.
          </p>
        </div>

        {/* Silenced Users */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Silenced Users
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Users who are silenced cannot post comments in this group.
          </p>

          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchUser()
                  }
                }}
                placeholder="Search by Last.fm username..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={searchUser}
                disabled={isSearching || !searchUsername.trim()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faSearch} />
                )}
              </button>
            </div>
            {searchError && (
              <p className="text-xs text-red-600 mt-1">{searchError}</p>
            )}
            {searchResult && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={null}
                    alt={searchResult.name || searchResult.lastfmUsername}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">
                    {searchResult.name || searchResult.lastfmUsername}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSilence(searchResult.id)}
                  disabled={silencingUserId === searchResult.id}
                  className="px-3 py-1 bg-yellow-500 text-black rounded text-sm font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {silencingUserId === searchResult.id && (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  )}
                  Silence
                </button>
              </div>
            )}
          </div>

          {silencedUsers.length > 0 ? (
            <div className="space-y-2">
              {silencedUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={user.image}
                      alt={user.name || user.lastfmUsername}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium">
                      {user.name || user.lastfmUsername}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnsilence(user.id)}
                    disabled={unsilencingUserId === user.id}
                    className="p-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove silence"
                  >
                    {unsilencingUserId === user.id ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No silenced users</p>
          )}
        </div>

        {/* Allowed Users (only show in restrictive mode) */}
        {shoutboxRestrictiveMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Users
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Users who are allowed to post comments in restrictive mode.
            </p>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      searchUser()
                    }
                  }}
                  placeholder="Search by Last.fm username..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  disabled={isSearching}
                />
                <button
                  type="button"
                  onClick={searchUser}
                  disabled={isSearching || !searchUsername.trim()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faSearch} />
                  )}
                </button>
              </div>
              {searchError && (
                <p className="text-xs text-red-600 mt-1">{searchError}</p>
              )}
              {searchResult && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={null}
                      alt={searchResult.name || searchResult.lastfmUsername}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium">
                      {searchResult.name || searchResult.lastfmUsername}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAllow(searchResult.id)}
                    className="px-3 py-1 bg-yellow-500 text-black rounded text-sm font-semibold hover:bg-yellow-400"
                  >
                    Allow
                  </button>
                </div>
              )}
            </div>

            {allowedUsers.length > 0 ? (
              <div className="space-y-2">
                {allowedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <SafeImage
                        src={user.image}
                        alt={user.name || user.lastfmUsername}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium">
                        {user.name || user.lastfmUsername}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeAllow(user.id)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      title="Revoke permission"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No allowed users</p>
            )}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

