import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LandingPageClient from '@/app/LandingPageClient'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { withDefaultOgImage, getDefaultOgImage, defaultOgImage } from '@/lib/metadata'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const t = await getTranslations('site');
  
  return withDefaultOgImage({
    title: t('name'),
    description: t('description'),
    openGraph: {
      type: 'website',
      locale: locale === 'pt' ? 'pt_BR' : 'en_US',
      url: siteUrl,
      siteName: t('name'),
      title: t('name'),
      description: t('description'),
      images: [getDefaultOgImage()],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('name'),
      description: t('description'),
      images: [defaultOgImage],
    },
  });
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession()

  // Only redirect if we have a valid session with email
  // This prevents redirect loops if session exists but user was deleted
  if (session?.user?.email) {
    // Verify user still exists in database before redirecting
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })
    
    if (user) {
      // Use locale from params to construct the redirect path
      redirect(`/${locale}/dashboard`)
    }
    // If user doesn't exist, don't redirect - let them see the home page
  }

  return <LandingPageClient />
}

