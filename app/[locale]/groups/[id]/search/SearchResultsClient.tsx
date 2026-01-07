'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faSpinner, faMicrophone, faMusic, faCompactDisc } from '@fortawesome/free-solid-svg-icons'
import { generateSlug } from '@/lib/chart-slugs'

interface SearchResult {
  entryKey: string
  name: string
  artist?: string | null
  slug: string | null
}

interface SearchResults {
  artists: Array<{ entryKey: string; name: string; slug: string | null }>
  tracks: Array<{ entryKey: string; name: string; artist: string | null; slug: string | null }>
  albums: Array<{ entryKey: string; name: string; artist: string | null; slug: string | null }>
}

interface SearchResultsClientProps {
  groupId: string
  initialSearchTerm: string
  initialResults: SearchResults
}

export default function SearchResultsClient({
  groupId,
  initialSearchTerm,
  initialResults,
}: SearchResultsClientProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [results, setResults] = useState<SearchResults>(initialResults)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setResults({ artists: [], tracks: [], albums: [] })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/groups/${groupId}/search?q=${encodeURIComponent(searchTerm.trim())}`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      } else {
        setResults({ artists: [], tracks: [], albums: [] })
      }
    } catch (error) {
      console.error('Error searching:', error)
      setResults({ artists: [], tracks: [], albums: [] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getSlug = (entry: SearchResult, chartType: 'artists' | 'tracks' | 'albums'): string => {
    if (entry.slug) {
      return entry.slug
    }
    return generateSlug(entry.entryKey, chartType)
  }

  const hasResults = results.artists.length > 0 || results.tracks.length > 0 || results.albums.length > 0
  const hasSearched = initialSearchTerm || searchTerm.trim()

  return (
    <div className="mt-10">
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 border border-theme shadow-sm">
        {/* Search Input */}
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for artists, tracks, or albums..."
                className="w-full px-4 py-3 pr-12 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-opacity-50 transition-all"
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
              disabled={isLoading || !searchTerm.trim()}
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
                if (!isLoading && searchTerm.trim()) {
                  e.currentTarget.style.filter = 'brightness(1.15)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = ''
              }}
            >
              {isLoading ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faSearch} />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-lg">Enter a search term to find chart entries.</p>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-sm">Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Artists */}
            {results.artists.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faMicrophone} />
                  Artists ({results.artists.length})
                </h3>
                <div className="space-y-2">
                  {results.artists.map((artist) => (
                    <Link
                      key={artist.entryKey}
                      href={`/groups/${groupId}/charts/artist/${getSlug(artist, 'artists')}`}
                      className="block p-4 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                    >
                      <div className="font-semibold text-gray-900 hover:text-[var(--theme-primary)] transition-colors">
                        {artist.name}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Tracks */}
            {results.tracks.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faMusic} />
                  Tracks ({results.tracks.length})
                </h3>
                <div className="space-y-2">
                  {results.tracks.map((track) => (
                    <Link
                      key={track.entryKey}
                      href={`/groups/${groupId}/charts/track/${getSlug(track, 'tracks')}`}
                      className="block p-4 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                    >
                      <div className="font-semibold text-gray-900 hover:text-[var(--theme-primary)] transition-colors">
                        {track.name}
                      </div>
                      {track.artist && (
                        <div className="text-sm text-gray-600 mt-1">by {track.artist}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Albums */}
            {results.albums.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCompactDisc} />
                  Albums ({results.albums.length})
                </h3>
                <div className="space-y-2">
                  {results.albums.map((album) => (
                    <Link
                      key={album.entryKey}
                      href={`/groups/${groupId}/charts/album/${getSlug(album, 'albums')}`}
                      className="block p-4 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                    >
                      <div className="font-semibold text-gray-900 hover:text-[var(--theme-primary)] transition-colors">
                        {album.name}
                      </div>
                      {album.artist && (
                        <div className="text-sm text-gray-600 mt-1">by {album.artist}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

