import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { routing } from '@/i18n/routing'

/**
 * Detects the appropriate locale for a request in API routes.
 * Tries multiple strategies in order:
 * 1. Locale cookie (set during auth flow)
 * 2. User's saved locale preference (if logged in)
 * 3. Referer header (extract locale from previous page URL)
 * 4. Accept-Language header from request
 * 5. Default locale
 * 
 * @param request - The incoming request object
 * @returns A valid locale string
 */
export async function detectLocale(request: Request): Promise<string> {
  // Strategy 1: Check for locale cookie (set during auth flow)
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get('lastfm_auth_locale')
    if (localeCookie?.value && routing.locales.includes(localeCookie.value)) {
      return localeCookie.value
    }
  } catch (error) {
    // Continue to next strategy
  }

  // Strategy 2: Try to get locale from user's profile (if logged in)
  try {
    const session = await getSession()
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { locale: true },
      })
      
      if (user?.locale && routing.locales.includes(user.locale)) {
        return user.locale
      }
    }
  } catch (error) {
    // If there's an error, continue to next strategy
    console.error('Error getting user locale:', error)
  }

  // Strategy 3: Try to extract locale from referer header
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const pathParts = refererUrl.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0 && routing.locales.includes(pathParts[0])) {
        return pathParts[0]
      }
    } catch (error) {
      // Invalid referer URL, continue to next strategy
    }
  }

  // Strategy 4: Try to detect from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,pt;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code] = lang.trim().split(';')
        return code.toLowerCase().split('-')[0] // Get base language code
      })
    
    // Find first matching locale
    for (const lang of languages) {
      if (routing.locales.includes(lang)) {
        return lang
      }
    }
  }

  // Strategy 5: Fall back to default locale
  return routing.defaultLocale
}

/**
 * Constructs a locale-aware URL path.
 * Handles paths with query strings correctly.
 * 
 * @param path - The path without locale (e.g., '/auth/signup' or '/?error=no_token')
 * @param locale - The locale to prepend
 * @returns The locale-aware path (e.g., '/en/auth/signup' or '/en?error=no_token')
 */
export function getLocalizedPath(path: string, locale: string): string {
  // Split path and query string
  const [pathPart, queryString] = path.split('?')
  
  // Normalize path
  let normalizedPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
  
  // If path is just '/', use locale root, otherwise prepend locale
  const localizedPath = normalizedPath === '/' 
    ? `/${locale}` 
    : `/${locale}${normalizedPath}`
  
  // Reattach query string if present
  return queryString ? `${localizedPath}?${queryString}` : localizedPath
}

