'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faTimes, faUsers, faHeart } from '@fortawesome/free-solid-svg-icons'

interface RecommendationGroup {
  group: {
    id: string
    name: string
    image: string | null
    colorTheme: string
    allowFreeJoin: boolean
    creator: {
      id: string
      name: string | null
      lastfmUsername: string
    }
    _count: {
      members: number
    }
  }
  score: number
  components: {
    artistOverlap: number
    trackOverlap: number
    genreOverlap: number
    patternScore: number
  }
}

export default function GroupsYouMightLike() {
  const [recommendations, setRecommendations] = useState<RecommendationGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Fetch recommendations on component mount
  useEffect(() => {
    handleFindGroups()
  }, [])

  const handleFindGroups = async () => {
    setIsLoading(true)
    setIsCalculating(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch('/api/dashboard/recommendations', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations')
      }

      if (data.message) {
        setError(data.message)
      } else {
        setRecommendations(data.groups || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
      console.error('Error fetching recommendations:', err)
    } finally {
      setIsLoading(false)
      setIsCalculating(false)
    }
  }

  const handleReject = async (groupId: string) => {
    try {
      const response = await fetch('/api/groups/recommendations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject recommendation')
      }

      // Remove from list
      setRecommendations(prev => prev.filter(r => r.group.id !== groupId))
    } catch (err) {
      console.error('Error rejecting recommendation:', err)
    }
  }

  if (!hasSearched) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6">
            Discover groups that match your music taste based on your listening history
          </p>
          <button
            onClick={handleFindGroups}
            disabled={isLoading}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Finding Groups...
              </>
            ) : (
              'Find Groups You Might Like'
            )}
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || isCalculating) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500 mb-4" />
          <p className="text-gray-600">Calculating compatibility scores...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleFindGroups}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No recommendations found at this time.</p>
          <button
            onClick={handleFindGroups}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Refresh Recommendations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Groups You Might Like</h2>
        <button
          onClick={handleFindGroups}
          className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => {
          const themeClass = `theme-${rec.group.colorTheme.replace('_', '-')}`
          const groupImage = rec.group.image || getDefaultGroupImage()

          return (
            <div
              key={rec.group.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow relative"
            >
              {/* Reject Button */}
              <button
                onClick={() => handleReject(rec.group.id)}
                className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-sm hover:bg-gray-100 transition-colors"
                title="Not interested"
              >
                <FontAwesomeIcon icon={faTimes} className="text-gray-500 text-sm" />
              </button>

              <Link href={`/groups/${rec.group.id}/public`}>
                <div className="p-4">
                  {/* Group Image */}
                  <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
                    <SafeImage
                      src={groupImage}
                      alt={rec.group.name}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  {/* Group Name */}
                  <h3 className="font-bold text-lg mb-2 text-gray-900 truncate">
                    {rec.group.name}
                  </h3>

                  {/* Compatibility Score */}
                  <div className="flex items-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faHeart} className="text-red-500" />
                    <span className="font-semibold text-gray-900">
                      {Math.round(rec.score)}% Match
                    </span>
                  </div>

                  {/* Group Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-xs" />
                      <span>{rec.group._count.members} members</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4">
                    <div className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg text-center font-semibold hover:bg-yellow-400 transition-colors">
                      View Group
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

