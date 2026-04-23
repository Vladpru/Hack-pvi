'use client'

import { useEffect, useState } from 'react'
import { Package, AlertTriangle, Filter, Plus, X, Download } from 'lucide-react'

interface InventoryItem {
  id: number
  warehouse_id: number
  product_id: number
  quantity: number
  min_threshold: number
  updated_at: string
  product_name: string
  sku: string
  unit: string
  category: string
  warehouse_name: string
}

interface Warehouse { id: number; name: string }
interface Product { id: number; name: string; sku: string; unit: string }

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ warehouse_id: '', product_id: '', quantity: '', min_threshold: '10' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editMin, setEditMin] = useState('')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterWarehouse) params.set('warehouse_id', filterWarehouse)
    if (filterLow) params.set('low_stock', 'true')
    Promise.all([
      fetch(`/api/inventory?${params}`).then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]).then(([inv, wh, prod]) => {
      setItems(inv)
      setWarehouses(wh)
      setProducts(prod)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterWarehouse, filterLow])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.warehouse_id || !form.product_id) { setError('Warehouse and product are required.'); return }
    setSaving(true)
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_id: parseInt(form.warehouse_id),
        product_id: parseInt(form.product_id),
        quantity: parseInt(form.quantity) || 0,
        min_threshold: parseInt(form.min_threshold) || 10,
      }),
    })
    setSaving(false)
    if (res.ok) { setForm({ warehouse_id: '', product_id: '', quantity: '', min_threshold: '10' }); setShowForm(false); load() }
    else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
  }

  const handleUpdate = async (id: number) => {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: parseInt(editQty), min_threshold: parseInt(editMin) }),
    })
    if (res.ok) { setEditId(null); load() }
  }

  const handleExportCsv = () => {
    const headers = ['Product', 'SKU', 'Category', 'Warehouse', 'Quantity', 'Unit', 'Min Threshold', 'Status', 'Last Updated']
    const rows = items.map(i => [
      `"${i.product_name}"`,
      i.sku,
      i.category,
      `"${i.warehouse_name}"`,
      i.quantity,
      i.unit,
      i.min_threshold,
      i.quantity < i.min_threshold * 0.5 ? 'Critical' : i.quantity < i.min_threshold ? 'Low' : 'OK',
      i.updated_at,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lowCount = items.filter(i => i.quantity < i.min_threshold).length

  return (
    <div className="p-6 lg:p-8 space-y-6 pt-20 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stock levels across all warehouses
            {lowCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                {lowCount} below threshold
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add / Update Stock'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Add or Update Stock Entry</h2>
          {error && <p className="text-xs text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Warehouse *</label>
              <select
                value={form.warehouse_id}
                onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Product *</label>
              <select
                value={form.product_id}
                onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quantity</label>
              <input
                type="number" min="0" placeholder="0"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Min Threshold</label>
              <input
                type="number" min="0" placeholder="10"
                value={form.min_threshold}
                onChange={e => setForm(f => ({ ...f, min_threshold: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filter:</span>
        </div>
        <select
          value={filterWarehouse}
          onChange={e => setFilterWarehouse(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button
          onClick={() => setFilterLow(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterLow ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low stock only
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warehouse</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No inventory records found</td>
                  </tr>
                )}
                {items.map(item => {
                  const isLow = item.quantity < item.min_threshold
                  const isCritical = item.quantity < item.min_threshold * 0.5
                  const isEditing = editId === item.id
                  return (
                    <tr key={item.id} className={`hover:bg-secondary/30 transition-colors ${isLow ? 'bg-red-500/5' : ''}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{item.category}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{item.warehouse_name}</td>
                      <td className="px-5 py-3.5 text-right">
                        {isEditing ? (
                          <input
                            type="number" min="0"
                            value={editQty}
                            onChange={e => setEditQty(e.target.value)}
                            className="w-24 bg-secondary border border-primary rounded px-2 py-1 text-sm text-right text-foreground focus:outline-none"
                          />
                        ) : (
                          <span className={`font-semibold tabular-nums ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-foreground'}`}>
                            {item.quantity.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isEditing ? (
                          <input
                            type="number" min="0"
                            value={editMin}
                            onChange={e => setEditMin(e.target.value)}
                            className="w-20 bg-secondary border border-border rounded px-2 py-1 text-sm text-right text-foreground focus:outline-none"
                          />
                        ) : (
                          <span className="tabular-nums text-muted-foreground">{item.min_threshold}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" /> Critical
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleUpdate(item.id)} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 transition-colors">Save</button>
                            <button onClick={() => setEditId(null)} className="px-3 py-1 bg-secondary text-muted-foreground rounded text-xs font-medium hover:text-foreground transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditId(item.id); setEditQty(String(item.quantity)); setEditMin(String(item.min_threshold)) }}
                            className="px-3 py-1 bg-secondary text-muted-foreground rounded text-xs font-medium hover:text-foreground transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
