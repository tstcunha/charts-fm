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

/**
 * Get artist image from MusicBrainz API
 * Returns image URL from Wikimedia Commons, or null if not available
 */
async function getArtistImageFromMusicBrainz(artist: string): Promise<string | null> {
  try {
    // Step 1: Search for artist in MusicBrainz
    const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artist)}&fmt=json&limit=1`
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'ChartsFM/1.0 (https://chartsfm.com)',
      },
    })

    if (!searchResponse.ok) {
      return null
    }

    const searchData = await searchResponse.json()
    const artists = searchData.artists
    if (!artists || artists.length === 0) {
      return null
    }

    const mbid = artists[0].id
    if (!mbid) {
      return null
    }

    // Step 2: Get artist info with relations (includes image links)
    const artistUrl = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`
    const artistResponse = await fetch(artistUrl, {
      headers: {
        'User-Agent': 'ChartsFM/1.0 (https://chartsfm.com)',
      },
    })

    if (!artistResponse.ok) {
      return null
    }

    const artistData = await artistResponse.json()
    console.log('MusicBrainz API Response (Artist):', JSON.stringify(artistData, null, 2))
    
    // Step 3: Look for image sources
    const relations = artistData.relations || []
    
    // First, try to find a direct Wikimedia Commons image relation
    const wikimediaRelation = relations.find(
      (rel: any) => rel.type === 'image' && rel.url?.resource?.includes('commons.wikimedia.org')
    )

    if (wikimediaRelation?.url?.resource) {
      // Convert Wikimedia Commons page URL to direct image URL
      const commonsUrl = wikimediaRelation.url.resource
      if (commonsUrl.includes('/wiki/File:')) {
        const filename = encodeURIComponent(commonsUrl.split('/wiki/File:')[1])
        const directImageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`
        
        try {
          const imageCheck = await fetch(directImageUrl, { 
            method: 'HEAD', 
            redirect: 'follow',
            signal: AbortSignal.timeout(5000)
          })
          if (imageCheck.ok) {
            const finalUrl = imageCheck.url
            console.log('MusicBrainz API Image Response (Artist):', { artist, imageUrl: finalUrl })
            return finalUrl
          }
        } catch {
          console.log('MusicBrainz API Image Response (Artist):', { artist, imageUrl: directImageUrl })
          return directImageUrl
        }
      }
    }

    // If no direct image relation, try Wikidata
    const wikidataRelation = relations.find(
      (rel: any) => rel.type === 'wikidata' && rel.url?.resource?.includes('wikidata.org')
    )

    if (wikidataRelation?.url?.resource) {
      // Extract Wikidata QID from URL (e.g., Q28843759 from https://www.wikidata.org/wiki/Q28843759)
      const wikidataUrl = wikidataRelation.url.resource
      const qidMatch = wikidataUrl.match(/\/wiki\/(Q\d+)/)
      
      if (qidMatch && qidMatch[1]) {
        const qid = qidMatch[1]
        // Query Wikidata API for image
        try {
          const wikidataApiUrl = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`
          const wikidataResponse = await fetch(wikidataApiUrl, {
            headers: {
              'User-Agent': 'ChartsFM/1.0 (https://chartsfm.com)',
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (wikidataResponse.ok) {
            const wikidataData = await wikidataResponse.json()
            const entities = wikidataData.entities?.[qid]
            
            // Look for P18 property (image property in Wikidata)
            if (entities?.claims?.P18) {
              const imageClaim = entities.claims.P18[0]
              if (imageClaim?.mainsnak?.datavalue?.value) {
                const imageFilename = imageClaim.mainsnak.datavalue.value
                // Convert to Wikimedia Commons direct image URL
                const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFilename)}`
                console.log('MusicBrainz API Image Response (Artist via Wikidata):', { artist, imageUrl })
                return imageUrl
              }
            }
          }
        } catch (error) {
          console.error('Error fetching image from Wikidata:', error)
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching artist image from MusicBrainz:', error)
    return null
  }
}

/**
 * Get artist image from MusicBrainz API
 * Returns image URL from Wikimedia Commons, or null if not available
 */
export async function getArtistImage(
  artist: string,
  apiKey: string
): Promise<string | null> {
  return await getArtistImageFromMusicBrainz(artist)
}

/**
 * Get album image from Last.fm API
 * Returns the largest available image URL, or null if not available
 */
export async function getAlbumImage(
  artist: string,
  album: string,
  apiKey: string
): Promise<string | null> {
  try {
    const queryParams = new URLSearchParams({
      method: 'album.getInfo',
      artist,
      album,
      api_key: apiKey,
      format: 'json',
    })

    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    console.log('LAST.FM API Image Response (Album):', JSON.stringify(data, null, 2))
    
    if (data.error) {
      return null
    }

    const albumInfo = data.album
    if (!albumInfo || !albumInfo.image) {
      return null
    }

    // Last.fm returns an array of images with different sizes
    // Order: small, medium, large, extralarge, mega
    const images = Array.isArray(albumInfo.image) ? albumInfo.image : []
    
    // Prefer mega, then extralarge, then large
    const megaImage = images.find((img: any) => img.size === 'mega' || img.size === 'extralarge')
    if (megaImage?.['#text']) {
      return megaImage['#text']
    }

    const extralargeImage = images.find((img: any) => img.size === 'extralarge')
    if (extralargeImage?.['#text']) {
      return extralargeImage['#text']
    }

    const largeImage = images.find((img: any) => img.size === 'large')
    if (largeImage?.['#text']) {
      return largeImage['#text']
    }

    // Fallback to any image with text
    const anyImage = images.find((img: any) => img['#text'] && img['#text'].trim() !== '')
    if (anyImage?.['#text']) {
      return anyImage['#text']
    }

    return null
  } catch (error) {
    console.error('Error fetching album image from Last.fm:', error)
    return null
  }
}

