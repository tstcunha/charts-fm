import type { Metadata, Viewport } from "next";
import "react-day-picker/dist/style.css";
import "./globals.css";
import { Oswald, Inter } from "next/font/google";
import { getDefaultOgImage, defaultOgImage } from "@/lib/metadata";
import enMessages from "@/messages/en.json";

const oswald = Oswald({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
});

const inter = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';

// Use English translations as fallback for root layout
// (locale-specific metadata is handled in app/[locale]/layout.tsx)
const siteName = enMessages.site.name;
const siteDescription = enMessages.site.description;

export const metadata: Metadata = {
  title: {
    template: "ChartsFM - %s",
    default: siteName,
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: siteName,
    title: siteName,
    description: siteDescription,
    images: [getDefaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: siteDescription,
    images: [defaultOgImage],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// Root layout - must have html and body tags
// The locale-specific content is in app/[locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased ${oswald.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}

