'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, CheckCircle2, Clock, XCircle, Package } from 'lucide-react'
import { StatCard } from '@/components/stat-card'

interface AnalyticsData {
  byStatus: Array<{ status: string; count: number }>
  byPriority: Array<{ priority: string; count: number }>
  byCategory: Array<{ category: string; total_quantity: number; product_count: number }>
  warehouseUtil: Array<{ name: string; total_stock: number; capacity: number; fill_pct: number }>
  topProducts: Array<{ product_name: string; sku: string; category: string; unit: string; total_stock: number; request_count: number }>
  recentActivity: Array<{ day: string; requests_created: number }>
  fulfillmentRate: { total: number; delivered: number; in_progress: number; pending: number; cancelled: number }
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#3b82f6',
  in_transit: '#a855f7',
  delivered: '#10b981',
  cancelled: '#6b7280',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
}

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#ec4899']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">{p.name}: <span className="text-foreground font-semibold">{p.value}</span></p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const fr = data.fulfillmentRate
  const fulfillPct = fr.total > 0 ? Math.round((fr.delivered / fr.total) * 100) : 0

  return (
    <div className="p-6 lg:p-8 space-y-8 pt-20 lg:pt-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Supply chain performance and inventory insights</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={fr.total}
          icon={Package}
          iconColor="text-blue-400"
        />
        <StatCard
          label="Delivered"
          value={fr.delivered}
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          trend={`${fulfillPct}% fulfillment rate`}
          trendPositive={fulfillPct >= 70}
        />
        <StatCard
          label="In Progress"
          value={fr.in_progress}
          icon={Clock}
          iconColor="text-purple-400"
        />
        <StatCard
          label="Cancelled"
          value={fr.cancelled}
          icon={XCircle}
          iconColor="text-red-400"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by status — pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Requests by Status</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.byStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.byStatus.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[entry.status] ?? '#64748b' }} />
                    <span className="text-xs text-muted-foreground capitalize">{entry.status.replace('_', ' ')}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums">{Number(entry.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Requests by priority — pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Requests by Priority</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie
                  data={data.byPriority}
                  dataKey="count"
                  nameKey="priority"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.byPriority.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.priority] ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.byPriority.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[entry.priority] ?? '#64748b' }} />
                    <span className="text-xs text-muted-foreground capitalize">{entry.priority}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums">{Number(entry.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Request activity over 30 days */}
      {data.recentActivity.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Request Activity (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.recentActivity} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={v => v.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="requests_created"
                name="Requests"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Warehouse utilization */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Warehouse Utilization</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data.warehouseUtil.map(w => ({
              ...w,
              fill_pct: Number(w.fill_pct),
              total_stock: Number(w.total_stock),
              capacity: Number(w.capacity),
            }))}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 140 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={135} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="fill_pct" name="Fill %" radius={[0, 4, 4, 0]}>
              {data.warehouseUtil.map((entry, i) => {
                const pct = Number(entry.fill_pct)
                return <Cell key={i} fill={pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981'} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Inventory by category */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Inventory by Category</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data.byCategory.map(c => ({ ...c, total_quantity: Number(c.total_quantity) }))}
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total_quantity" name="Total Stock" radius={[4, 4, 0, 0]}>
              {data.byCategory.map((_, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top requested products */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Top Requested Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Stock</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-sm">{p.category}</td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-foreground">
                    {Number(p.total_stock).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-md text-xs font-semibold ${Number(p.request_count) > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-secondary text-muted-foreground'}`}>
                      {Number(p.request_count)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fulfillment progress */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Overall Fulfillment Progress</h2>
          <span className="text-2xl font-bold text-foreground tabular-nums">{fulfillPct}%</span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${fulfillPct}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          {[
            { label: 'Delivered', value: fr.delivered, color: 'text-emerald-400' },
            { label: 'In Progress', value: fr.in_progress, color: 'text-purple-400' },
            { label: 'Pending', value: fr.pending, color: 'text-amber-400' },
            { label: 'Cancelled', value: fr.cancelled, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-sm font-bold ${color} tabular-nums`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
