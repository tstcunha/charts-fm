import SessionProvider from "@/components/SessionProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import Navbar from "@/components/Navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

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
            <Navbar />
            {children}
          </NavigationProvider>
        </SessionProvider>
      </NextIntlClientProvider>
    </>
  );
}

