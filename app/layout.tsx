import type { Metadata } from "next";
import "react-day-picker/dist/style.css";
import "./globals.css";
import { Oswald, Inter } from "next/font/google";

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

export const metadata: Metadata = {
  title: {
    template: "ChartsFM - %s",
    default: "ChartsFM",
  },
  description: "Create beautiful charts and visualizations from your Last.fm listening data",
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

