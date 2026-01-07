'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { THEME_NAMES, THEME_DISPLAY_NAMES, GROUP_THEMES, type ThemeName } from '@/lib/group-themes'

interface StylingTabProps {
  groupId: string
  initialColorTheme: string | null
}

export default function StylingTab({
  groupId,
  initialColorTheme,
}: StylingTabProps) {
  const router = useRouter()
  const [colorTheme, setColorTheme] = useState<ThemeName>((initialColorTheme as ThemeName) || 'white')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges = colorTheme !== (initialColorTheme || 'white')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          colorTheme: colorTheme,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update styling settings')
      }

      setSuccess(true)
      
      // Force a full page reload to ensure fresh data is fetched
      // This ensures the server component gets the updated colorTheme
      window.location.href = `/groups/${groupId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update styling settings')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Styling settings updated successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="colorTheme" className="block text-lg font-bold text-gray-900 mb-2">
            Color Theme
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Choose a color theme for your group page. This will apply to backgrounds, text, buttons, and highlights throughout the page.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEME_NAMES.map((themeName) => {
              const theme = GROUP_THEMES[themeName]
              const isSelected = colorTheme === themeName
              
              return (
                <label
                  key={themeName}
                  className={`relative cursor-pointer border-2 rounded-xl p-4 transition-all ${
                    isSelected
                      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-lighter)]/20'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={isSelected ? {
                    '--theme-primary': theme.primary,
                    '--theme-primary-lighter': theme.primaryLighter,
                  } as React.CSSProperties : undefined}
                >
                  <input
                    type="radio"
                    name="colorTheme"
                    value={themeName}
                    checked={isSelected}
                    onChange={(e) => setColorTheme(e.target.value as ThemeName)}
                    className="sr-only"
                  />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        {THEME_DISPLAY_NAMES[themeName]}
                        {themeName === 'white' && <span className="ml-2 text-xs text-gray-500">(Default)</span>}
                      </h3>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.primary }}></div>
                      )}
                    </div>
                    
                    {/* Color preview - three colors only */}
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500">Background</div>
                        <div 
                          className="h-12 rounded border border-gray-200"
                          style={
                            themeName === 'rainbow'
                              ? {
                                  backgroundImage: 'linear-gradient(135deg, rgb(239 68 68), rgb(249 115 22), rgb(234 179 8), rgb(34 197 94), rgb(59 130 246), rgb(147 51 234), rgb(219 39 119), rgb(239 68 68))',
                                }
                              : { backgroundColor: theme.backgroundFrom }
                          }
                          title={themeName === 'rainbow' ? 'Rainbow gradient background' : 'Background color'}
                        ></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500">Button</div>
                        <div 
                          className="h-12 rounded border border-gray-200"
                          style={{ backgroundColor: theme.primaryLight }}
                          title="Button color"
                        ></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500">Title</div>
                        <div 
                          className="h-12 rounded border border-gray-200"
                          style={{ backgroundColor: theme.primaryDark }}
                          title="Title color"
                        ></div>
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
