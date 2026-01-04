'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const LOADING_MESSAGES = [
  "This group sure has some interesting tastes...",
  "Oh wow, THAT artist got #1? Interesting...",
  "Now that's a track that I hadn't heard in a while...",
  "Calculating the perfect chart positions...",
  "Some real deep cuts in here, I see...",
  "Wow, someone really loves that album...",
  "These listening habits are... unique!",
  "Processing thousands of scrobbles...",
  "Finding the hidden gems in your music taste...",
]

export default function GenerateChartsClient({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [showFirstMessage, setShowFirstMessage] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      setShowFirstMessage(true)
      setCurrentMessageIndex(0)
      return
    }

    // Show first message for 10 seconds, then start rotating
    const firstMessageTimer = setTimeout(() => {
      setShowFirstMessage(false)
    }, 10000)

    // Rotate messages every 10 seconds (starting after first message)
    const rotationTimer = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 10000)

    return () => {
      clearTimeout(firstMessageTimer)
      clearInterval(rotationTimer)
    }
  }, [isLoading])

  const handleGenerate = async () => {
    setError(null)
    setSuccess(false)
    setIsLoading(true)
    setShowFirstMessage(true)
    setCurrentMessageIndex(0)

    try {
      const response = await fetch(`/api/groups/${groupId}/charts`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate charts')
      }

      setSuccess(true)
      setIsLoading(false)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/groups/${groupId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate charts')
      setIsLoading(false)
    }
  }

  const getLoadingMessage = () => {
    if (showFirstMessage) {
      return "Fetching data from last.fm. This may take a few minutes..."
    }
    return LOADING_MESSAGES[currentMessageIndex]
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">Generate Charts</h1>

        {isLoading && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg flex items-center gap-3">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{getLoadingMessage()}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            Charts generated successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-600 mb-6">
            This will fetch the latest listening data from Last.fm for all group members
            and generate weekly charts for the last 5 weeks. This may take a few moments.
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-1">
                  Generating
                  <span className="inline-flex">
                    <span className="animate-dots">.</span>
                    <span className="animate-dots-delay-1">.</span>
                    <span className="animate-dots-delay-2">.</span>
                  </span>
                </span>
              ) : (
                'Generate Charts'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

