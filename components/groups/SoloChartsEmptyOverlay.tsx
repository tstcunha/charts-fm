'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface SoloChartsEmptyOverlayProps {
  groupId: string
  enabled: boolean
}

/**
 * Shows a page fade + bubble CTA prompting the user to generate charts.
 * Does not auto-trigger generation; user must click.
 *
 * Guarded so it won't keep showing after dismissal during this session.
 */
export default function SoloChartsEmptyOverlay({ groupId, enabled }: SoloChartsEmptyOverlayProps) {
  const t = useSafeTranslations('groups.soloOverlay')
  const [dismissed, setDismissed] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const storageKey = useMemo(() => `solo_charts_overlay_dismissed_${groupId}`, [groupId])

  useEffect(() => {
    setIsMounted(true)
    if (!enabled) return
    try {
      if (window.sessionStorage.getItem(storageKey) === '1') setDismissed(true)
    } catch {
      // ignore
    }
  }, [enabled, storageKey])

  if (!enabled || dismissed || !isMounted) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(storageKey, '1')
    } catch {
      // ignore
    }
  }

  const start = async () => {
    if (isStarting) return
    setError(null)
    setIsStarting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/charts/update`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || t('failed'))

      // Poll until generation completes, then refresh the page.
      const pollIntervalMs = 2500
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/groups/${groupId}/charts/update`)
          const statusData = await statusRes.json().catch(() => ({}))
          if (statusRes.ok && statusData && statusData.inProgress === false) {
            window.location.reload()
            return
          }
        } catch {
          // ignore transient errors and keep polling
        }
        setTimeout(poll, pollIntervalMs)
      }
      setTimeout(poll, pollIntervalMs)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('failed'))
      setIsStarting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* Page fade */}
      <button
        type="button"
        aria-label={t('dismiss')}
        onClick={dismiss}
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
      />

      {/* Bubble */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/20 shadow-xl p-5 sm:p-6"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        <div className="text-center">
          <div className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{t('title')}</div>
          <div className="text-sm sm:text-base text-gray-600 mb-4">{t('description')}</div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <LiquidGlassButton
              onClick={start}
              disabled={isStarting}
              variant="primary"
              useTheme={false}
              className="w-full"
            >
              {isStarting ? t('starting') : t('cta')}
            </LiquidGlassButton>
            <LiquidGlassButton onClick={dismiss} variant="neutral" useTheme={false} className="w-full">
              {t('later')}
            </LiquidGlassButton>
          </div>
        </div>
      </div>
    </div>
    ,
    document.body
  )
}

