'use client'

import { useEffect, useState } from 'react'
import { Warehouse, Package, MapPin, ClipboardList, AlertTriangle, Zap, RefreshCw } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { PriorityBadge, StatusBadge } from '@/components/priority-badge'
import { format } from 'date-fns'

interface DashboardData {
  stats: {
    totalWarehouses: number
    totalProducts: number
    totalDeliveryPoints: number
    pendingRequests: number
    criticalRequests: number
    unreadAlerts: number
  }
  lowStockItems: Array<{
    id: number
    product_name: string
    warehouse_name: string
    quantity: number
    min_threshold: number
  }>
  recentRequests: Array<{
    id: number
    product_name: string
    delivery_point_name: string
    warehouse_name: string
    quantity: number
    priority: string
    status: string
    created_at: string
  }>
  requestsByStatus: Array<{ status: string; count: number }>
  requestsByPriority: Array<{ priority: string; count: number }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcResult, setRecalcResult] = useState<{ processed: number; actions: Array<{ request_id: number; action: string; reason: string; product_name: string; delivery_point_name: string; priority: string; quantity: number }> } | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRecalculate = async () => {
    setRecalcLoading(true)
    setRecalcResult(null)
    const res = await fetch('/api/recalculate', { method: 'POST' })
    const result = await res.json()
    setRecalcResult(result)
    setRecalcLoading(false)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const actionColorMap: Record<string, string> = {
    approve: 'text-emerald-400',
    rerouted: 'text-blue-400',
    shortage: 'text-red-400',
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 pt-20 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Supply chain overview &amp; real-time status</p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalcLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${recalcLoading ? 'animate-spin' : ''}`} />
          {recalcLoading ? 'Recalculating...' : 'Recalculate Supplies'}
        </button>
      </div>

      {/* Recalc result */}
      {recalcResult && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Recalculation Complete — {recalcResult.processed} request(s) processed
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recalcResult.actions.map((a) => (
              <div key={a.request_id} className="flex items-start gap-3 text-xs">
                <span className={`font-semibold uppercase shrink-0 ${actionColorMap[a.action] ?? 'text-muted-foreground'}`}>
                  [{a.action}]
                </span>
                <span className="text-muted-foreground">
                  <span className="text-foreground">{a.product_name}</span> for <span className="text-foreground">{a.delivery_point_name}</span> ({a.quantity} units, <span className="uppercase">{a.priority}</span>) — {a.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Warehouses" value={data.stats.totalWarehouses} icon={Warehouse} iconColor="text-blue-400" />
        <StatCard label="Products" value={data.stats.totalProducts} icon={Package} iconColor="text-emerald-400" />
        <StatCard label="Delivery Points" value={data.stats.totalDeliveryPoints} icon={MapPin} iconColor="text-purple-400" />
        <StatCard label="Pending Requests" value={data.stats.pendingRequests} icon={ClipboardList} iconColor="text-amber-400" />
        <StatCard
          label="Critical Requests"
          value={data.stats.criticalRequests}
          icon={Zap}
          iconColor={data.stats.criticalRequests > 0 ? 'text-red-400' : 'text-muted-foreground'}
        />
        <StatCard
          label="Active Alerts"
          value={data.stats.unreadAlerts}
          icon={AlertTriangle}
          iconColor={data.stats.unreadAlerts > 0 ? 'text-amber-400' : 'text-muted-foreground'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Low Stock Alerts</h2>
            <span className="text-xs text-muted-foreground">{data.lowStockItems.length} items</span>
          </div>
          {data.lowStockItems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.lowStockItems.map(item => {
                const pct = Math.round((item.quantity / item.min_threshold) * 100)
                return (
                  <div key={item.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.warehouse_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-400">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">min: {item.min_threshold}</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent requests */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Requests</h2>
            <a href="/requests" className="text-xs text-primary hover:underline">View all</a>
          </div>
          <div className="divide-y divide-border">
            {data.recentRequests.map(req => (
              <div key={req.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{req.product_name}</p>
                    <PriorityBadge priority={req.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {req.delivery_point_name} {req.warehouse_name ? `← ${req.warehouse_name}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(req.created_at), 'MMM d, HH:mm')} &middot; qty: {req.quantity}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
