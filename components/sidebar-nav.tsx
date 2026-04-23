'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Warehouse, Package, ClipboardList,
  MapPin, Bell, Menu, X, Truck, Search, BarChart2, Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/products', label: 'Products', icon: Tag },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/delivery-points', label: 'Delivery Points', icon: MapPin },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/proximity', label: 'Proximity Search', icon: Search },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)

  const fetchAlerts = useCallback(() => {
    fetch('/api/alerts?unread=true')
      .then(r => r.json())
      .then(data => setAlertCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchAlerts()
    // Poll every 30s for new alerts
    const interval = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(interval)
  }, [pathname, fetchAlerts])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-foreground tracking-wide">LogiFlow</span>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <Link href="/alerts" className="relative p-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-0.5">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            </Link>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-60 bg-card border-r border-border transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-none">LogiFlow</p>
            <p className="text-xs text-muted-foreground mt-0.5">Supply Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground px-3 py-2 uppercase tracking-widest">Navigation</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {label === 'Alerts' && alertCount > 0 && (
                  <span className="flex items-center justify-center min-w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold px-1">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs text-muted-foreground">Live &mdash; v1.1.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile content offset */}
      <div className="lg:hidden h-14 shrink-0" />
    </>
  )
}
