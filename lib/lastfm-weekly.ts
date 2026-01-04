// Last.fm API functions for fetching weekly listening data
// Reference: https://www.last.fm/api/methods

import { authenticatedLastFMCall } from './lastfm-auth'
import { getWeekStart, getWeekEnd } from './weekly-utils'

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'

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
  sessionKey?: string
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
    // Use unauthenticated call (limited data)
    const params = new URLSearchParams({
      method: 'user.getWeeklyTrackChart',
      user: username,
      api_key: apiKey,
      from: from.toString(),
      to: to.toString(),
      format: 'json',
    })
    const response = await fetch(`${LASTFM_API_BASE}?${params}`)
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }
    data = await response.json()
  }

  if (data.error) {
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
  sessionKey?: string
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
    const params = new URLSearchParams({
      method: 'user.getWeeklyArtistChart',
      user: username,
      api_key: apiKey,
      from: from.toString(),
      to: to.toString(),
      format: 'json',
    })
    const response = await fetch(`${LASTFM_API_BASE}?${params}`)
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }
    data = await response.json()
  }

  if (data.error) {
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
  sessionKey?: string
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
    const params = new URLSearchParams({
      method: 'user.getWeeklyAlbumChart',
      user: username,
      api_key: apiKey,
      from: from.toString(),
      to: to.toString(),
      format: 'json',
    })
    const response = await fetch(`${LASTFM_API_BASE}?${params}`)
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }
    data = await response.json()
  }

  if (data.error) {
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
 * Returns top 10 for each category
 */
export async function getWeeklyStats(
  username: string,
  weekStart: Date,
  apiKey: string,
  apiSecret: string,
  sessionKey?: string
): Promise<{
  topTracks: TopItem[]
  topArtists: TopItem[]
  topAlbums: TopItem[]
}> {
  const [topTracks, topArtists, topAlbums] = await Promise.all([
    getWeeklyTopTracks(username, weekStart, apiKey, apiSecret, sessionKey),
    getWeeklyTopArtists(username, weekStart, apiKey, apiSecret, sessionKey),
    getWeeklyTopAlbums(username, weekStart, apiKey, apiSecret, sessionKey),
  ])

  return {
    topTracks: topTracks.slice(0, 10),
    topArtists: topArtists.slice(0, 10),
    topAlbums: topAlbums.slice(0, 10),
  }
}

