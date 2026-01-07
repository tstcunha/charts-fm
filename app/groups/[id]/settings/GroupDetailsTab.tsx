'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import CustomSelect from '@/components/CustomSelect'
import Toggle from '@/components/Toggle'

interface GroupDetailsTabProps {
  groupId: string
  initialName: string
  initialImage: string | null
  initialIsPrivate: boolean
  initialAllowFreeJoin: boolean
  initialDynamicIconEnabled: boolean
  initialDynamicIconSource: string | null
}

const ICON_SOURCES = [
  { value: 'top_album', label: 'Top Album' },
  { value: 'top_artist', label: 'Top Artist' },
  { value: 'top_track_artist', label: 'Artist of Top Track' },
]

export default function GroupDetailsTab({
  groupId,
  initialName,
  initialImage,
  initialIsPrivate,
  initialAllowFreeJoin,
  initialDynamicIconEnabled,
  initialDynamicIconSource,
}: GroupDetailsTabProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [imageUrl, setImageUrl] = useState(initialImage || '')
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate)
  const [allowFreeJoin, setAllowFreeJoin] = useState(initialAllowFreeJoin)
  const [dynamicIconEnabled, setDynamicIconEnabled] = useState(initialDynamicIconEnabled)
  const [dynamicIconSource, setDynamicIconSource] = useState(initialDynamicIconSource || 'top_album')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // If group becomes private, disable allowFreeJoin
  const handlePrivateChange = (newIsPrivate: boolean) => {
    setIsPrivate(newIsPrivate)
    if (newIsPrivate) {
      setAllowFreeJoin(false)
    }
  }

  const hasChanges =
    name !== initialName ||
    imageUrl !== (initialImage || '') ||
    isPrivate !== initialIsPrivate ||
    allowFreeJoin !== initialAllowFreeJoin ||
    dynamicIconEnabled !== initialDynamicIconEnabled ||
    (dynamicIconEnabled && dynamicIconSource !== initialDynamicIconSource)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      // Update name and privacy
      const response = await fetch(`/api/groups/${groupId}/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          isPrivate,
          allowFreeJoin: isPrivate ? false : allowFreeJoin, // Only allow free join for public groups
          dynamicIconEnabled,
          dynamicIconSource: dynamicIconEnabled ? dynamicIconSource : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update group details')
      }

      // Update icon separately if it changed
      if (imageUrl !== (initialImage || '')) {
        const iconResponse = await fetch(`/api/groups/${groupId}/icon`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageUrl.trim() || null }),
        })

        if (!iconResponse.ok) {
          const iconData = await iconResponse.json()
          throw new Error(iconData.error || 'Failed to update icon')
        }
      }

      setSuccess(true)
      
      // Refresh the router cache to ensure fresh data
      router.refresh()
      
      // Redirect immediately
      router.push(`/groups/${groupId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group details')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Group details updated successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
            Group Name
          </label>
          <input
            type="text"
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="groupIcon" className="block text-sm font-medium text-gray-700 mb-2">
            Group Icon
          </label>
          <input
            type="url"
            id="groupIcon"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="https://example.com/icon.png"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter a URL to an image for your group icon
          </p>
          {imageUrl && (
            <div className="mt-4 flex justify-center">
              <div className="relative w-32 h-32">
                <SafeImage
                  src={imageUrl}
                  alt="Preview"
                  className="rounded-lg object-cover w-full h-full"
                  defaultImage={getDefaultGroupImage()}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Privacy Settings
          </label>
          <Toggle
            id="isPrivate"
            checked={isPrivate}
            onChange={handlePrivateChange}
            disabled={isLoading}
            label="Private Group"
          />
          <p className="text-xs text-gray-500 mt-1">
            Private groups are not viewable publicly and require approval to join
          </p>
        </div>

        {!isPrivate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Join Settings
            </label>
            <Toggle
              id="allowFreeJoin"
              checked={allowFreeJoin}
              onChange={setAllowFreeJoin}
              disabled={isLoading}
              label="Users can join freely"
            />
            <p className="text-xs text-gray-500 mt-1">
              When enabled, users can join this group directly from the public page without requiring approval
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dynamic Icon
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Automatically update the group icon based on the latest weekly chart. The icon will update whenever new charts are generated.
          </p>
          
          <div className="mb-4">
            <Toggle
              id="dynamicIconEnabled"
              checked={dynamicIconEnabled}
              onChange={setDynamicIconEnabled}
              disabled={isLoading}
              label="Enable Dynamic Icon"
            />
          </div>

          {dynamicIconEnabled && (
            <div>
              <label htmlFor="dynamicIconSource" className="block text-sm font-medium text-gray-700 mb-2">
                Icon Source
              </label>
              <CustomSelect
                id="dynamicIconSource"
                options={ICON_SOURCES.map(source => ({ value: source.value, label: source.label }))}
                value={dynamicIconSource}
                onChange={(value) => setDynamicIconSource(String(value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Choose what the group icon should display from the latest weekly chart
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
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

