'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import CustomSelect from '@/components/CustomSelect'
import Toggle from '@/components/Toggle'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faSearch, faTh, faList, faMusic, faSpinner } from '@fortawesome/free-solid-svg-icons'

interface Group {
  id: string
  name: string
  image: string | null
  colorTheme: string | null
  allowFreeJoin: boolean
  createdAt: string
  creator: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  _count: {
    members: number
  }
  lastChartUpdate?: string | null
  weekCount?: number
}

interface DiscoverGroupsClientProps {
  initialGroups: Group[]
  initialError: string | null
  userId: string
}

type SortOption = 'newest' | 'oldest' | 'most_members' | 'least_members' | 'most_active'
type ViewMode = 'grid' | 'list'
type ActivityLevel = 'all' | 'active' | 'recent'

export default function DiscoverGroupsClient({
  initialGroups,
  initialError,
  userId,
}: DiscoverGroupsClientProps) {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [allowFreeJoin, setAllowFreeJoin] = useState<boolean | null>(null)
  const [minMembers, setMinMembers] = useState<number | null>(null)
  const [maxMembers, setMaxMembers] = useState<number | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialGroups.length >= 20)
  const observerTarget = useRef<HTMLDivElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch groups from API
  const fetchGroups = useCallback(async (page: number, reset: boolean = false) => {
    if (reset) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort: sortBy,
      })

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim())
      }

      if (allowFreeJoin === true) {
        params.append('allowFreeJoin', 'true')
      }

      if (minMembers !== null && minMembers > 0) {
        params.append('minMembers', minMembers.toString())
      }

      const response = await fetch(`/api/groups/discover?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch groups')
      }

      // Filter by maxMembers and activityLevel client-side (not supported by API yet)
      let filtered = data.groups || []
      
      if (maxMembers !== null && maxMembers > 0) {
        filtered = filtered.filter((group: Group) => group._count.members <= maxMembers)
      }

      if (activityLevel !== 'all') {
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        filtered = filtered.filter((group: Group) => {
          if (!group.lastChartUpdate) return false
          const lastUpdate = new Date(group.lastChartUpdate)
          
          if (activityLevel === 'active') {
            return lastUpdate >= oneWeekAgo
          } else if (activityLevel === 'recent') {
            return lastUpdate >= oneMonthAgo
          }
          return true
        })
      }

      if (reset) {
        setGroups(filtered)
      } else {
        setGroups((prev) => [...prev, ...filtered])
      }

      setHasMore(data.pagination?.hasMore || false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [debouncedSearch, allowFreeJoin, minMembers, maxMembers, activityLevel, sortBy])

  // Reset and fetch when filters change
  useEffect(() => {
    setCurrentPage(1)
    setHasMore(true)
    fetchGroups(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, allowFreeJoin, minMembers, sortBy, maxMembers, activityLevel])

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = currentPage + 1
          setCurrentPage(nextPage)
          fetchGroups(nextPage, false)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingMore, isLoading, currentPage])

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'most_members', label: 'Most Members' },
    { value: 'least_members', label: 'Least Members' },
    { value: 'most_active', label: 'Most Active' },
  ]

  const activityOptions = [
    { value: 'all', label: 'All Groups' },
    { value: 'active', label: 'Active This Week' },
    { value: 'recent', label: 'Active This Month' },
  ]

  const renderGroupCard = (group: Group) => {
    const colorTheme = group.colorTheme || 'white'
    const themeClass = `theme-${colorTheme.replace('_', '-')}`
    const groupImage = group.image || getDefaultGroupImage()
    
    // Check if user is already a member (would need to fetch this, but for now assume not)
    // This could be enhanced to check membership status
    
    if (viewMode === 'list') {
      return (
        <Link
          key={group.id}
          href={`/groups/${group.id}/public`}
          className={`block bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-4 border border-[var(--theme-border)] hover:shadow-md transition-all ${themeClass}`}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)]">
                <SafeImage
                  src={groupImage}
                  alt={group.name}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-[var(--theme-text)] truncate">
                  {group.name}
                </h3>
                {group.allowFreeJoin && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                    Free Join
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-4 flex-wrap">
                <span>Owner: <span className="font-semibold">{group.creator.name || group.creator.lastfmUsername}</span></span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faUsers} className="text-xs" />
                  <span>{group._count.members} {group._count.members === 1 ? 'member' : 'members'}</span>
                </span>
                {group.weekCount !== undefined && (
                  <span className="text-xs text-gray-500">
                    {group.weekCount} {group.weekCount === 1 ? 'week' : 'weeks'} tracked
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      )
    }

    // Grid view
    return (
      <Link
        key={group.id}
        href={`/groups/${group.id}/public`}
        className={`block bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-6 border border-[var(--theme-border)] hover:shadow-md transition-all ${themeClass}`}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] transition-all">
              <SafeImage
                src={groupImage}
                alt={group.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-2xl font-bold text-[var(--theme-text)] transition-colors truncate">
                {group.name}
              </h3>
              {group.allowFreeJoin && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                  Free Join
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2 flex-wrap">
                <span>Owner:</span>
                <span className="font-semibold text-gray-900">{group.creator.name || group.creator.lastfmUsername}</span>
              </p>
              <p className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-[var(--theme-primary)] font-medium" />
                <span>{group._count.members} {group._count.members === 1 ? 'member' : 'members'}</span>
              </p>
              {group.weekCount !== undefined && (
                <p className="text-xs text-gray-500">
                  {group.weekCount} {group.weekCount === 1 ? 'week' : 'weeks'} tracked
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div>
      {/* Search and Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>
        </div>

        {/* Filters and Sort Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filters Toggle (Mobile) */}
          <div className="lg:hidden">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700"
            >
              {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Filters Panel */}
          <div className={`flex-1 ${filtersExpanded ? 'block' : 'hidden lg:block'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Free Join Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Free Join Only
                </label>
                <Toggle
                  id="allowFreeJoin"
                  checked={allowFreeJoin === true}
                  onChange={(checked) => setAllowFreeJoin(checked ? true : null)}
                />
              </div>

              {/* Min Members */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Members
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={minMembers || ''}
                  onChange={(e) => setMinMembers(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>

              {/* Max Members */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Members
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={maxMembers || ''}
                  onChange={(e) => setMaxMembers(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity
                </label>
                <CustomSelect
                  options={activityOptions}
                  value={activityLevel}
                  onChange={(value) => setActivityLevel(value as ActivityLevel)}
                />
              </div>
            </div>
          </div>

          {/* Sort and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 lg:flex-col">
            <div className="w-full sm:w-auto lg:w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <CustomSelect
                options={sortOptions}
                value={sortBy}
                onChange={(value) => setSortBy(value as SortOption)}
              />
            </div>
            <div className="flex items-end">
              <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Grid View"
                >
                  <FontAwesomeIcon icon={faTh} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  title="List View"
                >
                  <FontAwesomeIcon icon={faList} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
              <span className="text-gray-600 font-medium">Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
            {error}
          </div>
        )}

        {groups.length > 0 ? (
          <>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-4'
              }
            >
              {groups.map((group) => renderGroupCard(group))}
            </div>
            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
                {isLoadingMore && (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <div className="mb-4 text-gray-400">
              <FontAwesomeIcon icon={faMusic} size="3x" />
            </div>
            <p className="text-gray-700 text-lg mb-2 font-medium">
              {debouncedSearch || allowFreeJoin !== null || minMembers !== null || maxMembers !== null || activityLevel !== 'all'
                ? 'No groups match your filters'
                : 'No groups available'}
            </p>
            <p className="text-gray-500 text-sm mb-6">
              {debouncedSearch || allowFreeJoin !== null || minMembers !== null || maxMembers !== null || activityLevel !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a group!'}
            </p>
            {(!debouncedSearch && allowFreeJoin === null && minMembers === null && maxMembers === null && activityLevel === 'all') && (
              <Link
                href="/groups/create"
                className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-all font-semibold"
              >
                Create Group
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

