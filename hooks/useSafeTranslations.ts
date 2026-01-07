'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useRef } from 'react'

/**
 * Safe wrapper around useTranslations that prevents hydration mismatches
 * and ensures translations are always available.
 * 
 * This hook memoizes translation values to prevent them from disappearing
 * during React hydration or re-renders. It ensures that:
 * 1. Translations always return a string (never undefined/null)
 * 2. Translation function reference is stable across re-renders
 * 3. Values are cached to prevent hydration mismatches
 * 
 * @param namespace - The translation namespace (e.g., 'dashboard.quickActions')
 * @returns A memoized translation function that always returns a string
 * 
 * @example
 * ```tsx
 * const t = useSafeTranslations('dashboard.quickActions')
 * return <h1>{t('title')}</h1>
 * ```
 */
export function useSafeTranslations(namespace: string) {
  const t = useTranslations(namespace)
  const cacheRef = useRef<Map<string, string>>(new Map())
  
  // Create a memoized translation function that always returns a string
  return useMemo(() => {
    return (key: string, values?: Record<string, any>): string => {
      // Create cache key including values for proper memoization
      const cacheKey = values ? `${key}:${JSON.stringify(values)}` : key
      
      // Check cache first to ensure consistent values during hydration
      if (cacheRef.current.has(cacheKey)) {
        return cacheRef.current.get(cacheKey)!
      }
      
      try {
        const translation = t(key, values)
        // Ensure we always return a string, never undefined or null
        const result = typeof translation === 'string' && translation.length > 0
          ? translation
          : key
        
        // Cache the result for consistency
        cacheRef.current.set(cacheKey, result)
        return result
      } catch (error) {
        // If translation fails, return the key as fallback
        console.warn(`Translation failed for ${namespace}.${key}:`, error)
        cacheRef.current.set(cacheKey, key)
        return key
      }
    }
  }, [t, namespace])
}

