'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons'

interface GroupSearchTabProps {
  groupId: string
}

export default function GroupSearchTab({ groupId }: GroupSearchTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = () => {
    if (searchTerm.trim() && !isSearching) {
      setIsSearching(true)
      router.push(`/groups/${groupId}/search?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Search Charts</h2>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for artists, tracks, or albums..."
            disabled={isSearching}
            className="w-full px-4 py-3 pr-12 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!searchTerm.trim() || isSearching}
          className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-95"
          style={{
            background: 'var(--theme-primary)',
            color: 'var(--theme-button-text)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
          onMouseEnter={(e) => {
            if (searchTerm.trim() && !isSearching) {
              e.currentTarget.style.filter = 'brightness(1.15)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = ''
          }}
        >
          {isSearching ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faSearch} />
          )}
          Search
        </button>
      </div>
    </div>
  )
}

