'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { useRouter } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faPlus, faUser } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

export default function EmptyStateCTA() {
  const t = useSafeTranslations('dashboard.emptyState')
  const router = useRouter()
  const [groupsCount, setGroupsCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSolo, setIsCreatingSolo] = useState(false)
  const [createSoloError, setCreateSoloError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/groups')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setGroupsCount(0)
        } else {
          setGroupsCount(Array.isArray(data) ? data.length : 0)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching groups:', err)
        setGroupsCount(0)
        setIsLoading(false)
      })
  }, [])

  const handleCreateSolo = async () => {
    if (isCreatingSolo) return
    setCreateSoloError(null)
    setIsCreatingSolo(true)

    try {
      const res = await fetch('/api/groups/solo', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || t('soloCreateFailed'))
      }
      if (!data?.groupId) {
        throw new Error(t('soloCreateFailed'))
      }
      router.push(`/groups/${data.groupId}`)
    } catch (err) {
      setCreateSoloError(err instanceof Error ? err.message : t('soloCreateFailed'))
      setIsCreatingSolo(false)
    }
  }

  // Don't show anything while loading
  if (isLoading) {
    return null
  }

  // Only show if user has no groups
  if (groupsCount !== null && groupsCount > 0) {
    return null
  }

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  }

  return (
    <div 
      className="rounded-xl shadow-lg p-4 sm:p-6 md:p-8 border border-gray-200 mb-6 sm:mb-8"
      style={glassStyle}
    >
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
          {t('title')}
        </h2>
        <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 px-2 sm:px-0">
          {t('description')}
        </p>

        {createSoloError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {createSoloError}
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
          <Link
            href="/groups/discover"
            aria-disabled={isCreatingSolo}
            tabIndex={isCreatingSolo ? -1 : 0}
            className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-500 transition-all shadow-md hover:shadow-lg font-semibold text-base sm:text-lg w-full sm:w-auto"
          >
            <FontAwesomeIcon icon={faUsers} className="text-lg sm:text-xl" />
            <span>{t('discoverGroups')}</span>
          </Link>

          <button
            type="button"
            onClick={handleCreateSolo}
            disabled={isCreatingSolo}
            className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-500 transition-all shadow-md hover:shadow-lg font-semibold text-base sm:text-lg w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faUser} className="text-lg sm:text-xl" />
            <span>{isCreatingSolo ? t('creatingSolo') : t('createSolo')}</span>
          </button>
          
          <Link
            href="/groups/create"
            aria-disabled={isCreatingSolo}
            tabIndex={isCreatingSolo ? -1 : 0}
            className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-lg hover:from-yellow-600 hover:to-yellow-500 transition-all shadow-md hover:shadow-lg font-semibold text-base sm:text-lg w-full sm:w-auto"
          >
            <FontAwesomeIcon icon={faPlus} className="text-lg sm:text-xl" />
            <span>{t('createYourOwn')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

