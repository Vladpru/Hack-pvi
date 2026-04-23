'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Plus, X, Filter } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/priority-badge'
import { format } from 'date-fns'

interface RequestItem {
  id: number
  delivery_point_id: number
  product_id: number
  warehouse_id: number | null
  quantity: number
  priority: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  product_name: string
  unit: string
  sku: string
  delivery_point_name: string
  delivery_point_address: string
  warehouse_name: string | null
}

interface DeliveryPoint { id: number; name: string }
interface Product { id: number; name: string; sku: string }
interface Warehouse { id: number; name: string }

const STATUSES = ['pending', 'approved', 'in_transit', 'delivered', 'cancelled']
const PRIORITIES = ['normal', 'high', 'critical']

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    delivery_point_id: '', product_id: '', warehouse_id: '', quantity: '',
    priority: 'normal', notes: '',
  })
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterPriority) params.set('priority', filterPriority)
    Promise.all([
      fetch(`/api/requests?${params}`).then(r => r.json()),
      fetch('/api/delivery-points').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
    ]).then(([reqs, dps, prods, whs]) => {
      setRequests(reqs)
      setDeliveryPoints(dps)
      setProducts(prods)
      setWarehouses(whs)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus, filterPriority])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.delivery_point_id || !form.product_id || !form.quantity) {
      setError('Delivery point, product, and quantity are required.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_point_id: parseInt(form.delivery_point_id),
        product_id: parseInt(form.product_id),
        warehouse_id: form.warehouse_id ? parseInt(form.warehouse_id) : undefined,
        quantity: parseInt(form.quantity),
        priority: form.priority,
        notes: form.notes || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setForm({ delivery_point_id: '', product_id: '', warehouse_id: '', quantity: '', priority: 'normal', notes: '' })
      setShowForm(false)
      load()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to create request')
    }
  }

  const handleStatusUpdate = async (id: number, status: string) => {
    setUpdatingId(id)
    await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdatingId(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Cancel this request?')) return
    await fetch(`/api/requests/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 pt-20 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supply Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track all supply requests</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Request'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Create Supply Request</h2>
          {error && <p className="text-xs text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Delivery Point *</label>
              <select value={form.delivery_point_id} onChange={e => setForm(f => ({ ...f, delivery_point_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select destination</option>
                {deliveryPoints.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Product *</label>
              <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Source Warehouse (optional)</label>
              <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Auto-assign</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quantity *</label>
              <input type="number" min="1" placeholder="0"
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
              <input type="text" placeholder="Optional notes..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : 'Create Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        {(filterStatus || filterPriority) && (
          <button onClick={() => { setFilterStatus(''); setFilterPriority('') }} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Request cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 gap-3">
          <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className={`bg-card border rounded-xl p-5 ${req.priority === 'critical' ? 'border-red-500/30' : req.priority === 'high' ? 'border-amber-500/20' : 'border-border'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{req.product_name}</span>
                    <PriorityBadge priority={req.priority} />
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground/80">{req.quantity} {req.unit}</span>
                    {' '}&rarr; <span className="text-foreground/80">{req.delivery_point_name}</span>
                    {req.warehouse_name && <span> from {req.warehouse_name}</span>}
                  </p>
                  {req.notes && <p className="text-xs text-muted-foreground italic">{req.notes}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(req.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {req.status !== 'delivered' && req.status !== 'cancelled' && (
                    <select
                      disabled={updatingId === req.id}
                      value={req.status}
                      onChange={e => handleStatusUpdate(req.id, e.target.value)}
                      className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {STATUSES.filter(s => s !== 'cancelled').map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  )}
                  {req.status !== 'delivered' && req.status !== 'in_transit' && (
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                      title="Cancel request"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
