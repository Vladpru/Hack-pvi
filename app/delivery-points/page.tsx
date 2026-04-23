'use client'

import { useEffect, useState } from 'react'
import { MapPin, Plus, X, Phone } from 'lucide-react'

interface DeliveryPoint {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  contact: string | null
  created_at: string
}

export default function DeliveryPointsPage() {
  const [points, setPoints] = useState<DeliveryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', contact: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/delivery-points')
      .then(r => r.json())
      .then(setPoints)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and address are required.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/delivery-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        address: form.address.trim(),
        lat: parseFloat(form.lat) || 0,
        lng: parseFloat(form.lng) || 0,
        contact: form.contact.trim() || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setForm({ name: '', address: '', lat: '', lng: '', contact: '' })
      setShowForm(false)
      load()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to add delivery point')
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 pt-20 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delivery Points</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage destination stops and contacts</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Delivery Point'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">New Delivery Point</h2>
          {error && <p className="text-xs text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name *</label>
              <input type="text" placeholder="e.g. Stop 12"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Address *</label>
              <input type="text" placeholder="Full address"
                value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact</label>
              <input type="text" placeholder="+380 XX XXX XXXX"
                value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Latitude</label>
              <input type="number" step="any" placeholder="50.45"
                value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Longitude</label>
              <input type="number" step="any" placeholder="30.52"
                value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Point'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {points.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 shrink-0">
                  <MapPin className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.address}</p>
                </div>
              </div>

              <div className="space-y-2">
                {p.contact && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{p.contact}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <a
                  href={`/proximity?lat=${p.lat}&lng=${p.lng}&name=${encodeURIComponent(p.name)}`}
                  className="text-xs text-primary hover:underline"
                >
                  Find nearby warehouses &rarr;
                </a>
              </div>
            </div>
          ))}

          {points.length === 0 && (
            <div className="sm:col-span-2 xl:col-span-3 flex flex-col items-center justify-center py-20 gap-3 bg-card border border-border rounded-xl">
              <MapPin className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No delivery points yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
