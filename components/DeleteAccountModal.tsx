'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { signOut } from 'next-auth/react'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface OwnedGroup {
  id: string
  name: string
}

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const router = useRouter()
  const t = useSafeTranslations('profile.deleteAccountModal')
  const tCommon = useSafeTranslations('common')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [ownedGroups, setOwnedGroups] = useState<OwnedGroup[]>([])

  useEffect(() => {
    if (isOpen) {
      // Fetch user's owned groups
      fetch('/api/user/owned-groups')
        .then(res => res.json())
        .then(data => {
          if (data.groups) {
            setOwnedGroups(data.groups)
          }
          setIsLoadingGroups(false)
        })
        .catch(err => {
          console.error('Error fetching owned groups:', err)
          setIsLoadingGroups(false)
        })
    } else {
      // Reset state when modal closes
      setConfirmText('')
      setError(null)
      setOwnedGroups([])
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError(t('errors.pleaseTypeDelete'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('errors.failedToDelete'))
      }

      // Sign out and redirect to home
      await signOut({ redirect: false })
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToDelete'))
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 md:p-6">
        <div className="bg-white rounded-lg md:rounded-xl shadow-xl p-4 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-red-600">{t('title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl md:text-3xl leading-none w-8 h-8 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px]"
              aria-label={t('close')}
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
              {error}
            </div>
          )}

          <div className="mb-6 md:mb-8">
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6 font-semibold">
              {t('warning')}
            </p>

            {isLoadingGroups ? (
              <p className="text-xs md:text-sm text-gray-600 mb-4">{t('loadingGroups')}</p>
            ) : ownedGroups.length > 0 ? (
              <div className="mb-4 md:mb-6">
                <p className="text-xs md:text-sm text-gray-700 mb-2 font-medium">
                  {t('ownedGroupsMessage')}
                </p>
                <ul className="text-xs md:text-sm text-gray-600 list-disc list-inside mb-4 space-y-1 bg-gray-50 p-3 md:p-4 rounded">
                  {ownedGroups.map(group => (
                    <li key={group.id} className="break-words">{group.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mb-4 md:mb-6">
              <p className="text-xs md:text-sm text-gray-700 mb-2 font-medium">
                {t('whatWillBeDeleted')}
              </p>
              <ul className="text-xs md:text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
                <li>{t('deletedItems.accountAndProfile')}</li>
                <li>{t('deletedItems.groupMemberships')}</li>
                <li>{t('deletedItems.personalStatistics')}</li>
                <li>{t('deletedItems.friendshipsAndRecommendations')}</li>
              </ul>
            </div>

            <div className="mb-4 md:mb-6">
              <p className="text-xs md:text-sm text-gray-700 mb-2 font-medium">
                {t('whatWillBePreserved')}
              </p>
              <ul className="text-xs md:text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
                <li>{t('preservedItems.groupCharts')}</li>
                <li>{t('preservedItems.groupComments')}</li>
                <li>{t('preservedItems.groupsYouCreated')}</li>
              </ul>
            </div>

            <div>
              <label htmlFor="confirmText" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                {t('typeToConfirmBefore')}{' '}
                <span className="font-mono font-semibold">DELETE</span>
                {' '}{t('typeToConfirmAfter')}
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder={t('confirmPlaceholder')}
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 md:py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base font-medium min-h-[44px] sm:min-h-0 order-2 sm:order-1"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading || confirmText !== 'DELETE'}
              className="px-4 py-2.5 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base font-medium min-h-[44px] sm:min-h-0 order-1 sm:order-2"
            >
              {isLoading ? t('deleting') : t('deleteButton')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

