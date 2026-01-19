import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { readFile } from 'fs/promises'
import { join } from 'path'
import AboutContent from '@/components/AboutContent'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  const tSite = await getTranslations({ locale, namespace: 'site' })
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'
  const defaultOgImage = `${siteUrl}/social-preview.png`
  
  return {
    title: t('title'),
    description: tSite('description'),
    openGraph: {
      type: 'website',
      locale: locale === 'pt' ? 'pt_BR' : 'en_US',
      url: `${siteUrl}/${locale}/about`,
      siteName: tSite('name'),
      title: t('title'),
      description: tSite('description'),
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: tSite('name'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: tSite('description'),
      images: [defaultOgImage],
    },
  }
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  
  // Read markdown file based on locale
  let markdownContent = ''
  try {
    const filePath = join(process.cwd(), 'content', `about-${locale}.md`)
    markdownContent = await readFile(filePath, 'utf-8')
  } catch (error) {
    console.error('Error reading about markdown file:', error)
    // Fallback to English if locale file doesn't exist
    if (locale !== 'en') {
      try {
        const fallbackPath = join(process.cwd(), 'content', 'about-en.md')
        markdownContent = await readFile(fallbackPath, 'utf-8')
      } catch (fallbackError) {
        console.error('Error reading fallback about file:', fallbackError)
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col pt-4 sm:pt-6 md:pt-8 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 relative">
      <div className="max-w-4xl w-full mx-auto relative z-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">
          {t('title')}
        </h1>
        <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
          <AboutContent content={markdownContent} />
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
            <a
              href="https://github.com/reidosbares/charts-fm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm sm:text-base font-semibold rounded-full transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{t('viewOnGitHub')}</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

