// Last.fm API functions for fetching weekly listening data
// Reference: https://www.last.fm/api/methods

import { authenticatedLastFMCall } from './lastfm-auth'
import { getWeekStart, getWeekEnd } from './weekly-utils'
import { acquireLastFMRateLimit } from './lastfm-rate-limiter'

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'

/**
 * Retry a function with exponential backoff, handling rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 4,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Don't retry on certain errors (authentication, invalid parameters, 404 errors)
      // 404 errors (user not found, resource not found) should not be retried
      const errorMessage = error.message || String(error) || ''
      const is404 = error.statusCode === 404 || error.status === 404
      const isNonRetryable = 
        is404 ||
        errorMessage.includes('Invalid API key') || 
        errorMessage.includes('Invalid session key') ||
        errorMessage.includes('Invalid method') ||
        errorMessage.includes('Invalid parameters')
      
      if (isNonRetryable) {
        if (is404) {
          console.warn(`[Last.fm API] ⚠️  404 error detected, skipping retries: ${errorMessage}`)
        }
        throw error
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }
      
      // For rate limit errors (429), use much longer backoff
      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit')
      const baseDelay = isRateLimit ? initialDelay * 2.5 : initialDelay
      
      // Calculate delay with exponential backoff:
      // Normal errors: 2s, 4s, 8s, 16s
      // Rate limit errors: 5s, 12.5s, 31.25s, 78.125s
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`[Last.fm API] ⚠️  Call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${(delay / 1000).toFixed(1)}s:`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError || new Error('Unknown error in retry logic')
}

export interface TopItem {
  name: string
  playcount: number
  artist?: string // For tracks and albums
}

/**
 * Fetch weekly top tracks for a user
 * Uses user.getWeeklyTrackChart API method
 */
export async function getWeeklyTopTracks(
  username: string,
  weekStart: Date,
  apiKey: string,
  apiSecret: string,
  sessionKey?: string,
  
): Promise<TopItem[]> {
  // Last.fm uses Unix timestamps for from/to parameters
  const from = Math.floor(weekStart.getTime() / 1000)
  const weekEnd = getWeekEnd(weekStart)
  const to = Math.floor(weekEnd.getTime() / 1000)

  let data
  if (sessionKey) {
    // Use authenticated call if we have session key
    data = await authenticatedLastFMCall(
      'user.getWeeklyTrackChart',
      sessionKey,
      apiKey,
      apiSecret,
      {
        user: username,
        from: from.toString(),
        to: to.toString(),
      }
    )
  } else {
    // Use unauthenticated call (limited data) with retry logic
    // Acquire rate limit token before making the request
    await acquireLastFMRateLimit(1)
    
    data = await retryWithBackoff(async () => {
      const params = new URLSearchParams({
        method: 'user.getWeeklyTrackChart',
        user: username,
        api_key: apiKey,
        from: from.toString(),
        to: to.toString(),
        format: 'json',
      })
      const response = await fetch(`${LASTFM_API_BASE}?${params}`)
      const responseText = await response.text()
      let responseData: any
      
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = { _rawResponse: responseText }
      }
      
      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const error: any = new Error(`Last.fm API rate limit exceeded: ${response.statusText}`)
        error.status = 429
        throw error
      }
      
      // Check for user not found error first (before checking response.ok)
      // This handles both 404 responses and 200 responses with error code 6
      if (responseData.error === 6 || responseData.error === '6' || 
          (responseData.message && responseData.message.toLowerCase().includes('user not found'))) {
        const error: any = new Error(`Last.fm API error: User not found`)
        error.responseBody = responseData
        error.statusCode = response.status
        error.isUserNotFound = true // Add flag for easy detection
        throw error
      }

      if (!response.ok) {
        const error: any = new Error(`Last.fm API error: ${response.statusText}`)
        error.responseBody = responseData
        error.statusCode = response.status
        throw error
      }
      
      if (responseData.error) {
        const error: any = new Error(`Last.fm API error: ${responseData.message || responseData.error}`)
        error.responseBody = responseData
        error.statusCode = response.status
        throw error
      }
      return responseData
    })
  }

  if (data.error) {
    // Check if it's a user not found error (error code 6) - don't retry these
    if (data.error === 6 || data.error === '6' || data.message?.toLowerCase().includes('user not found')) {
      const error: any = new Error(`Last.fm API error: User not found`)
      error.responseBody = data
      throw error
    }
    throw new Error(`Last.fm API error: ${data.message || data.error}`)
  }

  const tracks = data.weeklytrackchart?.track || []
  return Array.isArray(tracks)
    ? tracks.map((t: any) => ({
        name: t.name,
        artist: t.artist?.['#text'] || t.artist?.name || '',
        playcount: parseInt(t.playcount || '0', 10),
      }))
    : []
}

/**
 * Fetch weekly top artists for a user
 * Uses user.getWeeklyArtistChart API method
 */
export async function getWeeklyTopArtists(
  username: string,
  weekStart: Date,
  apiKey: string,
  apiSecret: string,
  sessionKey?: string,
  
): Promise<TopItem[]> {
  const from = Math.floor(weekStart.getTime() / 1000)
  const weekEnd = getWeekEnd(weekStart)
  const to = Math.floor(weekEnd.getTime() / 1000)

  let data
  if (sessionKey) {
    data = await authenticatedLastFMCall(
      'user.getWeeklyArtistChart',
      sessionKey,
      apiKey,
      apiSecret,
      {
        user: username,
        from: from.toString(),
        to: to.toString(),
      }
    )
  } else {
    // Use unauthenticated call with retry logic
    // Acquire rate limit token before making the request
    await acquireLastFMRateLimit(1)
    
    data = await retryWithBackoff(async () => {
      const params = new URLSearchParams({
        method: 'user.getWeeklyArtistChart',
        user: username,
        api_key: apiKey,
        from: from.toString(),
        to: to.toString(),
        format: 'json',
      })
      const response = await fetch(`${LASTFM_API_BASE}?${params}`)
      const responseText = await response.text()
      let responseData: any
      
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = { _rawResponse: responseText }
      }
      
      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const error: any = new Error(`Last.fm API rate limit exceeded: ${response.statusText}`)
        error.status = 429
        throw error
      }
      
      // Check for user not found error first (before checking response.ok)
      // This handles both 404 responses and 200 responses with error code 6
      if (responseData.error === 6 || responseData.error === '6' || 
          (responseData.message && responseData.message.toLowerCase().includes('user not found'))) {
        const error: any = new Error(`Last.fm API error: User not found`)
        error.responseBody = responseData
        error.statusCode = response.status
        error.isUserNotFound = true // Add flag for easy detection
        throw error
      }

      if (!response.ok) {
        const error: any = new Error(`Last.fm API error: ${response.statusText}`)
        error.responseBody = responseData
        error.statusCode = response.status
        throw error
      }
      
      if (responseData.error) {
        const error: any = new Error(`Last.fm API error: ${responseData.message || responseData.error}`)
        error.responseBody = responseData
        error.statusCode = response.status
        throw error
      }
      return responseData
    })
  }

  if (data.error) {
    // Check if it's a user not found error (error code 6) - don't retry these
    if (data.error === 6 || data.error === '6' || data.message?.toLowerCase().includes('user not found')) {
      const error: any = new Error(`Last.fm API error: User not found`)
      error.responseBody = data
      throw error
    }
    throw new Error(`Last.fm API error: ${data.message || data.error}`)
  }

  const artists = data.weeklyartistchart?.artist || []
  return Array.isArray(artists)
    ? artists.map((a: any) => ({
        name: a.name,
        playcount: parseInt(a.playcount || '0', 10),
      }))
    : []
}

/**
 * Fetch weekly top albums for a user
 * Uses user.getWeeklyAlbumChart API method
 */
export async function getWeeklyTopAlbums(
  username: string,
  weekStart: Date,
  apiKey: string,
  apiSecret: string,
  sessionKey?: string,
  
): Promise<TopItem[]> {
  const from = Math.floor(weekStart.getTime() / 1000)
  const weekEnd = getWeekEnd(weekStart)
  const to = Math.floor(weekEnd.getTime() / 1000)

  let data
  if (sessionKey) {
    data = await authenticatedLastFMCall(
      'user.getWeeklyAlbumChart',
      sessionKey,
      apiKey,
      apiSecret,
      {
        user: username,
        from: from.toString(),
        to: to.toString(),
      }
    )
  } else {
    // Use unauthenticated call with retry logic
    // Acquire rate limit token before making the request
    await acquireLastFMRateLimit(1)
    
    data = await retryWithBackoff(async () => {
      const params = new URLSearchParams({
        method: 'user.getWeeklyAlbumChart',
        user: username,
        api_key: apiKey,
        from: from.toString(),
        to: to.toString(),
        format: 'json',
      })
      const response = await fetch(`${LASTFM_API_BASE}?${params}`)
      const responseText = await response.text()
      let responseData: any
      
      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = { _rawResponse: responseText }
      }
      
      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const error: any = new Error(`Last.fm API rate limit exceeded: ${response.statusText}`)
        error.status = 429
        throw error
      }
      
      // Check for user not found error first (before checking response.ok)
      // This handles both 404 responses and 200 responses with error code 6
      if (responseData.error === 6 || responseData.error === '6' || 
          (responseData.message && responseData.message.toLowerCase().includes('user not found'))) {
        const error: any = new Error(`Last.fm API error: User not found`)
        error.responseBody = responseData
        error.statusCode = response.status
        error.isUserNotFound = true // Add flag for easy detection
        throw error
      }

      if (!response.ok) {
        const error: any = new Error(`Last.fm API error: ${response.statusText}`)
        error.responseBody = responseData
        error.statusCode = response.status
        throw error
      }
      
      if (responseData.error) {
        const error: any = new Error(`Last.fm API error: ${responseData.message || responseData.error}`)
        error.responseBody = responseData
        error.statusCode = response.status
        throw error
      }
      return responseData
    })
  }

  if (data.error) {
    // Check if it's a user not found error (error code 6) - don't retry these
    if (data.error === 6 || data.error === '6' || data.message?.toLowerCase().includes('user not found')) {
      const error: any = new Error(`Last.fm API error: User not found`)
      error.responseBody = data
      throw error
    }
    throw new Error(`Last.fm API error: ${data.message || data.error}`)
  }

  const albums = data.weeklyalbumchart?.album || []
  return Array.isArray(albums)
    ? albums.map((a: any) => ({
        name: a.name,
        artist: a.artist?.['#text'] || a.artist?.name || '',
        playcount: parseInt(a.playcount || '0', 10),
      }))
    : []
}

/**
 * Fetch all weekly stats (tracks, artists, albums) for a user
 * Returns top 100 for each category
 * 
 * Note: Fetches sequentially to respect rate limits (instead of parallel)
 * The rate limiter will handle spacing between requests automatically
 */
export async function getWeeklyStats(
  username: string,
  weekStart: Date,
  apiKey: string,
  apiSecret: string,
  sessionKey?: string,
  
): Promise<{
  topTracks: TopItem[]
  topArtists: TopItem[]
  topAlbums: TopItem[]
}> {
  // Fetch sequentially to respect rate limits
  // The rate limiter will automatically space out requests
  console.log(`[Last.fm API] 📡 Fetching weekly tracks for ${username}...`)
  const topTracks = await getWeeklyTopTracks(username, weekStart, apiKey, apiSecret, sessionKey)
  console.log(`[Last.fm API] ✅ Got ${topTracks.length} tracks for ${username}`)
  
  console.log(`[Last.fm API] 📡 Fetching weekly artists for ${username}...`)
  const topArtists = await getWeeklyTopArtists(username, weekStart, apiKey, apiSecret, sessionKey)
  console.log(`[Last.fm API] ✅ Got ${topArtists.length} artists for ${username}`)
  
  console.log(`[Last.fm API] 📡 Fetching weekly albums for ${username}...`)
  const topAlbums = await getWeeklyTopAlbums(username, weekStart, apiKey, apiSecret, sessionKey)
  console.log(`[Last.fm API] ✅ Got ${topAlbums.length} albums for ${username}`)

  return {
    topTracks: topTracks.slice(0, 100),
    topArtists: topArtists.slice(0, 100),
    topAlbums: topAlbums.slice(0, 100),
  }
}

