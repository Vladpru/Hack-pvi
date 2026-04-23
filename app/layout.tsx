import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SidebarNav } from '@/components/sidebar-nav'
import { OfflineIndicator } from '@/components/offline-indicator'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'LogiFlow — Supply Management',
  description: 'Dynamic logistics and supply management platform — warehouse tracking, proximity search, prioritized requests, real-time alerts.',
  generator: 'v0.app',
  keywords: ['logistics', 'supply chain', 'warehouse', 'inventory', 'alerts'],
}

export const viewport = {
  themeColor: '#080b0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          <SidebarNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <OfflineIndicator />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
