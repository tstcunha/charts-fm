'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faMinus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import QuickAccessConfirmModal from './QuickAccessConfirmModal'

interface QuickAccessButtonProps {
  groupId: string
}

export default function QuickAccessButton({ groupId }: QuickAccessButtonProps) {
  const [isInQuickAccess, setIsInQuickAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [currentQuickAccessGroup, setCurrentQuickAccessGroup] = useState<{
    id: string
    name: string
  } | null>(null)

  // Check if this group is in quick access
  useEffect(() => {
    fetch('/api/user/quick-access')
      .then((res) => res.json())
      .then((data) => {
        if (data.group) {
          setCurrentQuickAccessGroup(data.group)
          setIsInQuickAccess(data.group.id === groupId)
        } else {
          setIsInQuickAccess(false)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching quick access:', err)
        setIsLoading(false)
      })
  }, [groupId])

  const handleToggle = async () => {
    if (isUpdating) return // Prevent multiple clicks
    
    if (isInQuickAccess) {
      // Remove from quick access
      setIsUpdating(true)
      try {
        const res = await fetch('/api/user/quick-access', {
          method: 'DELETE',
        })
        if (res.ok) {
          setIsInQuickAccess(false)
          setCurrentQuickAccessGroup(null)
          // Trigger navbar refresh by dispatching a custom event
          window.dispatchEvent(new Event('quickAccessUpdated'))
        }
      } catch (err) {
        console.error('Error removing quick access:', err)
      } finally {
        setIsUpdating(false)
      }
    } else {
      // Add to quick access
      // Check if another group is already in quick access
      if (currentQuickAccessGroup && currentQuickAccessGroup.id !== groupId) {
        // Show confirmation modal immediately
        setShowConfirmModal(true)
      } else {
        // No existing group, add directly
        handleConfirmReplace()
      }
    }
  }

  const handleConfirmReplace = async () => {
    setIsUpdating(true)
    setShowConfirmModal(false)
    try {
      const res = await fetch('/api/user/quick-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsInQuickAccess(true)
        setCurrentQuickAccessGroup(data.group)
        // Trigger navbar refresh
        window.dispatchEvent(new Event('quickAccessUpdated'))
      }
    } catch (err) {
      console.error('Error adding quick access:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelReplace = () => {
    setShowConfirmModal(false)
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <LiquidGlassButton
        onClick={handleToggle}
        variant="primary"
        size="md"
        useTheme
        disabled={isUpdating}
        className="!aspect-auto"
        icon={
          <FontAwesomeIcon
            icon={isUpdating ? faSpinner : (isInQuickAccess ? faMinus : faPlus)}
            className={`text-base ${isUpdating ? 'animate-spin' : ''}`}
          />
        }
        aria-label={isUpdating 
          ? (isInQuickAccess ? 'Removing...' : 'Adding...')
          : (isInQuickAccess ? 'Remove from quick access' : 'Add to quick access')
        }
      />
      <QuickAccessConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </>
  )
}

