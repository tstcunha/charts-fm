'use client'

import { useState } from 'react'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface ChartImageDownloadButtonProps {
  groupId: string
  weekStart: Date
  chartType?: 'artists' | 'tracks' | 'albums'
  label?: string
}

export default function ChartImageDownloadButton({
  groupId,
  weekStart,
  chartType = 'artists',
  label,
}: ChartImageDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const t = useSafeTranslations('charts')

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      // Format weekStart as ISO string
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const url = `/api/groups/${groupId}/charts/export-image?weekStart=${weekStartStr}&chartType=${chartType}`
      
      // Fetch the image
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      // Get the blob
      const blob = await response.blob()
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `chart_${chartType}_${weekStartStr}.png`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Create download link and trigger download
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading image:', error)
      const errorMessage = error instanceof Error ? error.message : t('imageDownloadFailed')
      alert(`${t('imageDownloadFailed')}\n\n${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const buttonText = isLoading 
    ? t('generatingImage')
    : label || t('downloadAsImage')

  return (
    <LiquidGlassButton
      onClick={handleDownload}
      disabled={isLoading}
      variant="primary"
      size="sm"
      fullWidth
    >
      {buttonText}
    </LiquidGlassButton>
  )
}
