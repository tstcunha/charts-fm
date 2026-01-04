// Last.fm API client utilities

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'

export interface LastFMTrack {
  name: string
  artist: {
    '#text': string
  }
  album?: {
    '#text': string
  }
  date?: {
    '#text': string
    uts: string
  }
  '@attr'?: {
    nowplaying?: string
  }
}

export interface LastFMResponse {
  recenttracks?: {
    track: LastFMTrack[]
  }
  toptracks?: {
    track: Array<{
      name: string
      artist: {
        name: string
      }
      playcount: string
    }>
  }
  topartists?: {
    artist: Array<{
      name: string
      playcount: string
    }>
  }
}

export async function fetchLastFMData(
  method: string,
  username: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<LastFMResponse> {
  const queryParams = new URLSearchParams({
    method,
    user: username,
    api_key: apiKey,
    format: 'json',
    ...params,
  })

  const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)
  
  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`)
  }

  return response.json()
}

export async function getRecentTracks(
  username: string,
  apiKey: string,
  limit: number = 50
): Promise<LastFMTrack[]> {
  const data = await fetchLastFMData('user.getrecenttracks', username, apiKey, {
    limit: limit.toString(),
  })
  
  const tracks = data.recenttracks?.track || []
  // Handle both single track and array responses
  return Array.isArray(tracks) ? tracks : [tracks]
}

export async function getTopTracks(
  username: string,
  apiKey: string,
  period: '7day' | '1month' | '3month' | '6month' | '12month' | 'overall' = '1month',
  limit: number = 50
) {
  const data = await fetchLastFMData('user.gettoptracks', username, apiKey, {
    period,
    limit: limit.toString(),
  })
  
  return data.toptracks?.track || []
}

export async function getTopArtists(
  username: string,
  apiKey: string,
  period: '7day' | '1month' | '3month' | '6month' | '12month' | 'overall' = '1month',
  limit: number = 50
) {
  const data = await fetchLastFMData('user.gettopartists', username, apiKey, {
    period,
    limit: limit.toString(),
  })
  
  return data.topartists?.artist || []
}

