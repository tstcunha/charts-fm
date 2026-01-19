import SessionProvider from "@/components/SessionProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { getDefaultOgImage, defaultOgImage } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('site');
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  
  return {
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
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <>
      {/* Set html lang attribute based on locale */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang = '${locale}';`,
        }}
      />
      {/* Background elements - fixed to viewport for all pages */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl"></div>
      </div>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <SessionProvider>
          <NavigationProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="flex-grow">
                {children}
              </div>
              <Footer />
            </div>
          </NavigationProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    </>
  );
}

