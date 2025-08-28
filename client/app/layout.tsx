'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Header from './components/header';
import { usePathname } from 'next/navigation';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const noHeaderPages = ['/sign-in', '/sign-up'];

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {!noHeaderPages.includes(pathname) && <Header />}
          <main className="min-h-[calc(100vh-60px)]">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
