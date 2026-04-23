'use client'

import { useEffect, useState } from 'react'
import { Warehouse, Plus, X, MapPin, Package, Layers, Map } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { LocationMap, type MapMarker } from '@/components/location-map'

interface WarehouseItem {
  id: number
  name: string
  location: string
  lat: number
  lng: number
  capacity: number
  total_stock: number
  product_count: number
  created_at: string
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', lat: '', lng: '', capacity: '1000' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/warehouses')
      .then(r => r.json())
      .then(setWarehouses)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.location.trim()) {
      setError('Name and location are required.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        location: form.location.trim(),
        lat: parseFloat(form.lat) || 0,
        lng: parseFloat(form.lng) || 0,
        capacity: parseInt(form.capacity) || 1000,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setForm({ name: '', location: '', lat: '', lng: '', capacity: '1000' })
      setShowForm(false)
      load()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to add warehouse')
    }
  }

  const totalCapacity = warehouses.reduce((s, w) => s + w.capacity, 0)
  const totalStock = warehouses.reduce((s, w) => s + w.total_stock, 0)

  return (
    <div className="p-6 lg:p-8 space-y-8 pt-20 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage storage locations and capacity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMap(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${showMap ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}
          >
            <Map className="w-4 h-4" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Warehouse'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Warehouses" value={warehouses.length} icon={Warehouse} iconColor="text-blue-400" />
        <StatCard label="Total Capacity" value={totalCapacity.toLocaleString()} icon={Layers} iconColor="text-purple-400" />
        <StatCard label="Total Stock Units" value={totalStock.toLocaleString()} icon={Package} iconColor="text-emerald-400" />
        <StatCard label="Avg Fill Rate" value={totalCapacity > 0 ? `${Math.round((totalStock / totalCapacity) * 100)}%` : '0%'} icon={MapPin} iconColor="text-amber-400" />
      </div>

      {/* Add warehouse form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">New Warehouse</h2>
          {error && <p className="text-xs text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name *</label>
              <input
                type="text"
                placeholder="e.g. East Depot"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Location *</label>
              <input
                type="text"
                placeholder="e.g. City, Zone"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Capacity (units)</label>
              <input
                type="number"
                min="1"
                placeholder="1000"
                value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Latitude</label>
              <input
                type="number"
                step="any"
                placeholder="50.45"
                value={form.lat}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Longitude</label>
              <input
                type="number"
                step="any"
                placeholder="30.52"
                value={form.lng}
                onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Add Warehouse'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Map view */}
      {showMap && !loading && warehouses.length > 0 && (
        <LocationMap
          markers={warehouses
            .filter(w => w.lat !== 0 || w.lng !== 0)
            .map<MapMarker>(w => ({
              id: w.id,
              name: w.name,
              lat: w.lat,
              lng: w.lng,
              type: 'warehouse',
              sublabel: w.location,
            }))}
          height={300}
        />
      )}

      {/* Warehouse list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {warehouses.map(w => {
            const fillPct = Math.min(Math.round((w.total_stock / w.capacity) * 100), 100)
            const fillColor = fillPct > 80 ? 'bg-red-500' : fillPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
            return (
              <div key={w.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 shrink-0">
                      <Warehouse className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{w.location}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    {w.lat.toFixed(4)}, {w.lng.toFixed(4)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-secondary rounded-lg px-2 py-2.5">
                    <p className="text-sm font-bold text-foreground tabular-nums">{w.total_stock.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Stock</p>
                  </div>
                  <div className="bg-secondary rounded-lg px-2 py-2.5">
                    <p className="text-sm font-bold text-foreground tabular-nums">{w.capacity.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Capacity</p>
                  </div>
                  <div className="bg-secondary rounded-lg px-2 py-2.5">
                    <p className="text-sm font-bold text-foreground tabular-nums">{w.product_count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Products</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">Fill rate</p>
                    <p className="text-xs font-medium text-foreground">{fillPct}%</p>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${fillColor}`} style={{ width: `${fillPct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
