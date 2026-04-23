'use client'

import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, CheckCircle, Package, Zap, X } from 'lucide-react'
import { format } from 'date-fns'

interface Alert {
  id: number
  type: 'low_stock' | 'critical_request' | 'restock'
  message: string
  warehouse_id: number | null
  product_id: number | null
  request_id: number | null
  is_read: number
  created_at: string
  warehouse_name?: string
  product_name?: string
}

const typeConfig = {
  low_stock: {
    label: 'Low Stock',
    icon: Package,
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iconColor: 'text-amber-400',
  },
  critical_request: {
    label: 'Critical Request',
    icon: Zap,
    classes: 'bg-red-500/10 text-red-400 border-red-500/20',
    iconColor: 'text-red-400',
  },
  restock: {
    label: 'Restock',
    icon: CheckCircle,
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/alerts')
      .then(r => r.json())
      .then(setAlerts)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleMarkRead = async (id: number) => {
    setDismissing(id)
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    })
    setDismissing(null)
    load()
  }

  const handleMarkAllRead = async () => {
    const unread = alerts.filter(a => !a.is_read)
    await Promise.all(unread.map(a => fetch(`/api/alerts/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    })))
    load()
  }

  const unreadCount = alerts.filter(a => !a.is_read).length
  const unread = alerts.filter(a => !a.is_read)
  const read = alerts.filter(a => a.is_read)

  return (
    <div className="p-6 lg:p-8 space-y-6 pt-20 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? <span className="text-amber-400">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</span>
              : 'All alerts have been reviewed'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 gap-3">
          <Bell className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No alerts to show</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unread */}
          {unread.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Unread</p>
              {unread.map(alert => {
                const cfg = typeConfig[alert.type] ?? typeConfig.low_stock
                const Icon = cfg.icon
                return (
                  <div key={alert.id} className={`bg-card border rounded-xl p-5 flex items-start gap-4 ${cfg.classes}`}>
                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-current/10 shrink-0`}>
                      <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.classes}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>
                      {(alert.warehouse_name || alert.product_name) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.warehouse_name && <span>Warehouse: {alert.warehouse_name}</span>}
                          {alert.warehouse_name && alert.product_name && ' &middot; '}
                          {alert.product_name && <span>Product: {alert.product_name}</span>}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      disabled={dismissing === alert.id}
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                      title="Mark as read"
                    >
                      {dismissing === alert.id ? (
                        <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Read */}
          {read.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Read</p>
              {read.map(alert => {
                const cfg = typeConfig[alert.type] ?? typeConfig.low_stock
                const Icon = cfg.icon
                return (
                  <div key={alert.id} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 opacity-50">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-500/60 shrink-0 mt-0.5" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
