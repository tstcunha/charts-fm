// Slug generation and normalization utilities for chart entries

export type ChartType = 'artists' | 'tracks' | 'albums'

/**
 * Remove accents and diacritics from a string
 * Converts é -> e, ñ -> n, ü -> u, etc.
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Generate a URL-friendly slug from an entryKey
 * For artists: entryKey is already URL-friendly (just lowercase name)
 * For tracks/albums: entryKey is "name|artist", convert to "name-artist"
 * 
 * Removes accents, special characters, and normalizes to lowercase
 */
export function generateSlug(entryKey: string, chartType: ChartType): string {
  // Start with the entryKey
  let slug = entryKey.trim().toLowerCase()
  
  // Remove accents and diacritics
  slug = removeAccents(slug)
  
  // For tracks/albums, replace pipe with hyphen
  if (chartType !== 'artists') {
    slug = slug.replace(/\|/g, '-')
  }
  
  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-')
  
  // Remove all special characters except hyphens and alphanumeric
  slug = slug.replace(/[^a-z0-9-]/g, '')
  
  // Collapse multiple hyphens into one
  slug = slug.replace(/-+/g, '-')
  
  // Remove leading and trailing hyphens
  slug = slug.replace(/^-|-$/g, '')
  
  return slug.trim()
}

/**
 * Convert entryKey to slug (same logic as generateSlug)
 * This is a convenience alias for consistency
 */
export function entryKeyToSlug(entryKey: string, chartType: ChartType): string {
  return generateSlug(entryKey, chartType)
}

