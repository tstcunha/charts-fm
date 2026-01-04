// Last.fm Authentication utilities
// Based on: https://www.last.fm/api/authspec

import crypto from 'crypto'

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'
const LASTFM_AUTH_URL = 'https://www.last.fm/api/auth'

/**
 * Generate MD5 hash for API signature
 * According to Last.fm spec: md5(sorted_params + secret)
 */
function generateApiSignature(
  params: Record<string, string>,
  secret: string
): string {
  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort()
  
  // Concatenate in format: key1value1key2value2...
  const paramString = sortedKeys
    .map(key => `${key}${params[key]}`)
    .join('')
  
  // Append secret
  const stringToHash = paramString + secret
  
  // Generate MD5 hash
  return crypto.createHash('md5').update(stringToHash, 'utf8').digest('hex')
}

/**
 * Get the Last.fm authorization URL
 * User should be redirected here to authorize the application
 */
export function getLastFMAuthUrl(apiKey: string): string {
  return `${LASTFM_AUTH_URL}/?api_key=${apiKey}`
}

/**
 * Create a Last.fm session from an authentication token
 * This is called after user authorizes and we receive the token
 */
export async function createLastFMSession(
  token: string,
  apiKey: string,
  apiSecret: string
): Promise<{ sessionKey: string; username: string }> {
  const params: Record<string, string> = {
    method: 'auth.getSession',
    api_key: apiKey,
    token: token,
  }

  // Generate API signature
  const apiSig = generateApiSignature(params, apiSecret)
  params.api_sig = apiSig

  // Build query string
  const queryParams = new URLSearchParams({
    ...params,
    format: 'json',
  })

  const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Last.fm API error: ${data.message || data.error}`)
  }

  return {
    sessionKey: data.session.key,
    username: data.session.name,
  }
}

/**
 * Make an authenticated Last.fm API call
 * Requires session key from createLastFMSession
 */
export async function authenticatedLastFMCall(
  method: string,
  sessionKey: string,
  apiKey: string,
  apiSecret: string,
  additionalParams: Record<string, string> = {}
): Promise<any> {
  const params: Record<string, string> = {
    method,
    api_key: apiKey,
    sk: sessionKey, // Session key
    ...additionalParams,
  }

  // Generate API signature
  const apiSig = generateApiSignature(params, apiSecret)
  params.api_sig = apiSig

  // Build query string
  const queryParams = new URLSearchParams({
    ...params,
    format: 'json',
  })

  const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Last.fm API error: ${data.message || data.error}`)
  }

  return data
}

