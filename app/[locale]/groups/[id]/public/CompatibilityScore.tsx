'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faSpinner, faInfoCircle, faCalculator } from '@fortawesome/free-solid-svg-icons'
import Tooltip from '@/components/Tooltip'
import LiquidGlassButton from '@/components/LiquidGlassButton'

interface CompatibilityScoreProps {
  groupId: string
}

interface CompatibilityData {
  score: number
  components: {
    artistOverlap: number
    trackOverlap: number
    genreOverlap: number
    patternScore: number
  }
}

export default function CompatibilityScore({ groupId }: CompatibilityScoreProps) {
  const [score, setScore] = useState<CompatibilityData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if score exists (without calculating)
  useEffect(() => {
    fetch(`/api/groups/${groupId}/compatibility`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else if (data.exists && data.score !== undefined) {
          // Score exists and is fresh
          setScore({
            score: data.score,
            components: data.components,
          })
        }
        // If exists is false, score is null - user can click to calculate
        setIsChecking(false)
      })
      .catch((err) => {
        setError('Failed to check compatibility score')
        setIsChecking(false)
        console.error('Error checking compatibility score:', err)
      })
  }, [groupId])

  const handleCalculate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/compatibility`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate compatibility score')
      }

      setScore({
        score: data.score,
        components: data.components,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate compatibility score')
      console.error('Error calculating compatibility score:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
  }, [])

  useEffect(() => {
    if (showDetails) {
      updatePosition()
      
      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showDetails, updatePosition])

  if (isChecking) {
    return null // Don't show anything while checking
  }

  if (error) {
    return null // Don't show anything if there's an error
  }

  // If no score exists, show button to calculate
  // TEMPORARY: Recommendations system hidden for launch - button is faint and disabled
  if (!score) {
    return (
      <Tooltip 
        content="Coming Soon!"
        position="top"
      >
        <LiquidGlassButton
          ref={buttonRef}
          onClick={(e) => {
            // TEMPORARY: Prevent click - recommendations system hidden for launch
            e.preventDefault()
            e.stopPropagation()
          }}
          disabled
          variant="neutral"
          size="sm"
          useTheme={false}
          icon={<FontAwesomeIcon icon={faHeart} className="text-red-500" />}
        >
          Check Match
          <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-xs" />
        </LiquidGlassButton>
      </Tooltip>
    )
  }

  const scoreColor = score.score >= 70 ? 'text-green-600' : score.score >= 50 ? 'text-yellow-600' : 'text-gray-600'

  const handleToggleDetails = () => {
    setShowDetails(!showDetails)
  }

  return (
    <div className="relative">
      <LiquidGlassButton
        ref={buttonRef}
        onClick={handleToggleDetails}
        variant="secondary"
        size="sm"
        useTheme={false}
        icon={<FontAwesomeIcon icon={faHeart} className="text-red-500" />}
      >
        <span className={scoreColor}>
          {Math.round(score.score)}% Match
        </span>
        <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-xs" />
      </LiquidGlassButton>

      {showDetails && mounted && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          
          {/* Details Popup */}
          <div 
            className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
            }}
          >
            <h4 className="font-semibold text-gray-900 mb-3">Compatibility Breakdown</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Artist Overlap</span>
                <span className="font-semibold text-gray-900">
                  {score.components.artistOverlap.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Track Overlap</span>
                <span className="font-semibold text-gray-900">
                  {score.components.trackOverlap.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Genre Overlap</span>
                <span className="font-semibold text-gray-900">
                  {score.components.genreOverlap.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Listening Patterns</span>
                <span className="font-semibold text-gray-900">
                  {score.components.patternScore.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Overall Match</span>
                <span className={`font-bold text-lg ${scoreColor}`}>
                  {Math.round(score.score)}%
                </span>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

