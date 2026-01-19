import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
export const defaultOgImage = `${siteUrl}/social-preview.png`;

/**
 * Returns the default Open Graph image metadata that should be used on all pages
 */
export function getDefaultOgImage(): { url: string; width: number; height: number; alt: string } {
  return {
    url: defaultOgImage,
    width: 1200,
    height: 630,
    alt: 'ChartsFM',
  };
}

/**
 * Returns default Open Graph metadata with the standard image
 */
export function getDefaultOpenGraph(locale: string = 'en'): Metadata['openGraph'] {
  return {
    images: [getDefaultOgImage()],
    locale: locale === 'pt' ? 'pt_BR' : 'en_US',
  };
}

/**
 * Returns default Twitter Card metadata with the standard image
 */
export function getDefaultTwitter(): Metadata['twitter'] {
  return {
    card: 'summary_large_image',
    images: [defaultOgImage],
  };
}

/**
 * Helper to add default OG image to any metadata object
 */
export function withDefaultOgImage<T extends Metadata>(metadata: T): T {
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [getDefaultOgImage()],
    },
    twitter: {
      ...metadata.twitter,
      images: [defaultOgImage],
    },
  };
}
