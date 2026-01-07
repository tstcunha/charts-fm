import type { Metadata } from "next";
import "react-day-picker/dist/style.css";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import Navbar from "@/components/Navbar";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${oswald.variable} ${inter.variable}`}>
        {/* Background elements - fixed to viewport for all pages */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl"></div>
        </div>
        <SessionProvider>
          <NavigationProvider>
            <Navbar />
            {children}
          </NavigationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

