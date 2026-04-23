import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SidebarNav } from '@/components/sidebar-nav'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'LogiFlow — Supply Management',
  description: 'Dynamic logistics and supply management platform for transport companies',
  generator: 'v0.app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-neutral-950">
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100">
          <SidebarNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
