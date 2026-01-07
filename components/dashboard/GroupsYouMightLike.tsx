'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faTimes, faUsers, faHeart } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

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
  const t = useSafeTranslations('dashboard.groupsYouMightLike')
  // TEMPORARY: Recommendations system hidden for launch
  // Using dummy data instead of fetching from API
  const [recommendations] = useState<RecommendationGroup[]>(() => {
    // Dummy group data to show behind the "Coming Soon" overlay
    return [
      {
        group: {
          id: 'dummy-1',
          name: 'Indie Rock Enthusiasts',
          image: null,
          colorTheme: 'blue',
          allowFreeJoin: true,
          creator: {
            id: 'dummy-creator-1',
            name: 'Music Lover',
            lastfmUsername: 'musiclover',
          },
          _count: {
            members: 42,
          },
        },
        score: 85,
        components: {
          artistOverlap: 75,
          trackOverlap: 80,
          genreOverlap: 90,
          patternScore: 95,
        },
      },
      {
        group: {
          id: 'dummy-2',
          name: 'Jazz Collective',
          image: null,
          colorTheme: 'purple',
          allowFreeJoin: false,
          creator: {
            id: 'dummy-creator-2',
            name: 'Jazz Master',
            lastfmUsername: 'jazzmaster',
          },
          _count: {
            members: 28,
          },
        },
        score: 72,
        components: {
          artistOverlap: 65,
          trackOverlap: 70,
          genreOverlap: 80,
          patternScore: 75,
        },
      },
      {
        group: {
          id: 'dummy-3',
          name: 'Electronic Vibes',
          image: null,
          colorTheme: 'green',
          allowFreeJoin: true,
          creator: {
            id: 'dummy-creator-3',
            name: 'DJ Pro',
            lastfmUsername: 'djpro',
          },
          _count: {
            members: 156,
          },
        },
        score: 68,
        components: {
          artistOverlap: 60,
          trackOverlap: 65,
          genreOverlap: 75,
          patternScore: 70,
        },
      },
    ]
  })
  const [isLoading] = useState(false)
  const [isCalculating] = useState(false)
  const [error] = useState<string | null>(null)
  const [hasSearched] = useState(true) // Set to true to show the component immediately

  // TEMPORARY: Disabled API call - recommendations system hidden for launch
  // useEffect(() => {
  //   handleFindGroups()
  // }, [])

  // TEMPORARY: Disabled - no API calls should be made
  // const handleFindGroups = async () => {
  //   setIsLoading(true)
  //   setIsCalculating(true)
  //   setError(null)
  //   setHasSearched(true)

  //   try {
  //     const response = await fetch('/api/dashboard/recommendations', {
  //       method: 'POST',
  //     })

  //     const data = await response.json()

  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to fetch recommendations')
  //     }

  //     if (data.message) {
  //       setError(data.message)
  //     } else {
  //       setRecommendations(data.groups || [])
  //     }
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to load recommendations')
  //     console.error('Error fetching recommendations:', err)
  //   } finally {
  //     setIsLoading(false)
  //     setIsCalculating(false)
  //   }
  // }

  // TEMPORARY: Disabled - recommendations system hidden for launch
  // const handleReject = async (groupId: string) => {
  //   try {
  //     const response = await fetch('/api/groups/recommendations/reject', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ groupId }),
  //     })

  //     if (!response.ok) {
  //       throw new Error('Failed to reject recommendation')
  //     }

  //     // Remove from list
  //     setRecommendations(prev => prev.filter(r => r.group.id !== groupId))
  //   } catch (err) {
  //     console.error('Error rejecting recommendation:', err)
  //   }
  // }

  // TEMPORARY: Always show the component with dummy data and overlay
  // if (!hasSearched) {
  //   return (
  //     <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
  //       <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
  //       <div className="text-center py-8">
  //         <p className="text-gray-600 mb-6">
  //           Discover groups that match your music taste based on your listening history
  //         </p>
  //         <button
  //           onClick={handleFindGroups}
  //           disabled={isLoading}
  //           className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
  //         >
  //           {isLoading ? (
  //             <>
  //               <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
  //               Finding Groups...
  //             </>
  //           ) : (
  //             'Find Groups You Might Like'
  //           )}
  //         </button>
  //       </div>
  //     </div>
  //   )
  // }

  // TEMPORARY: Skip loading/error/empty states - always show dummy data with overlay
  // if (isLoading || isCalculating) {
  //   return (
  //     <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
  //       <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
  //       <div className="flex flex-col items-center justify-center py-12">
  //         <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500 mb-4" />
  //         <p className="text-gray-600">Calculating compatibility scores...</p>
  //         <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
  //       </div>
  //     </div>
  //   )
  // }

  // if (error) {
  //   return (
  //     <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
  //       <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
  //       <div className="text-center py-8">
  //         <p className="text-gray-600 mb-4">{error}</p>
  //         <button
  //           onClick={handleFindGroups}
  //           className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
  //         >
  //           Try Again
  //         </button>
  //       </div>
  //     </div>
  //   )
  // }

  // if (recommendations.length === 0) {
  //   return (
  //     <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
  //       <h2 className="text-2xl font-bold mb-4 text-gray-900">Groups You Might Like</h2>
  //       <div className="text-center py-8 text-gray-500">
  //         <p className="mb-4">No recommendations found at this time.</p>
  //         <button
  //           onClick={handleFindGroups}
  //           className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
  //         >
  //           Refresh Recommendations
  //         </button>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div 
        className="rounded-xl shadow-lg p-6 border border-gray-200 relative"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
        {/* TEMPORARY: Refresh button disabled - recommendations system hidden for launch */}
        <button
          disabled
          className="text-sm text-gray-400 cursor-not-allowed font-medium"
        >
          {t('refresh')}
        </button>
      </div>

      {/* TEMPORARY: Opaque overlay with "Coming Soon!" text */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-30 pointer-events-none">
          {recommendations.map((rec) => {
            const themeClass = `theme-${rec.group.colorTheme.replace('_', '-')}`
            const groupImage = rec.group.image || getDefaultGroupImage()

            return (
              <div
                key={rec.group.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow relative"
              >
                {/* Reject Button - disabled */}
                <button
                  disabled
                  className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-sm opacity-50"
                  title={t('notInterested')}
                >
                  <FontAwesomeIcon icon={faTimes} className="text-gray-500 text-sm" />
                </button>

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
                      {t('match', { count: Math.round(rec.score) })}
                    </span>
                  </div>

                  {/* Group Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-xs" />
                      <span>{t('members', { count: rec.group._count.members })}</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4">
                    <div className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg text-center font-semibold">
                      {t('viewGroup')}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Opaque overlay with "Coming Soon!" text */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{t('comingSoon')}</h3>
            <p className="text-gray-600">{t('comingSoonDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

