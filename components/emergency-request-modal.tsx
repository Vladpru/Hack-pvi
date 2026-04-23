'use client'

import { useEffect, useState, useRef } from 'react'
import { Zap, X } from 'lucide-react'

interface DeliveryPoint { id: number; name: string }
interface Product { id: number; name: string; sku: string }

interface EmergencyRequestModalProps {
  onClose: () => void
  onSubmitted: () => void
}

export function EmergencyRequestModal({ onClose, onSubmitted }: EmergencyRequestModalProps) {
  const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({
    delivery_point_id: '',
    product_id: '',
    quantity: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/delivery-points').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]).then(([dps, prods]) => {
      setDeliveryPoints(dps)
      setProducts(prods)
    })

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.delivery_point_id || !form.product_id || !form.quantity) {
      setError('Destination, product, and quantity are required.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery_point_id: parseInt(form.delivery_point_id),
        product_id: parseInt(form.product_id),
        quantity: parseInt(form.quantity),
        priority: 'critical',
        type: 'emergency',
        notes: form.notes || 'Emergency request submitted from dashboard',
      }),
    })
    setSaving(false)
    if (res.ok) {
      onSubmitted()
      onClose()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to submit emergency request')
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-card border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Emergency Request</p>
              <p className="text-xs text-red-400">Critical priority — immediate processing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Destination *
            </label>
            <select
              value={form.delivery_point_id}
              onChange={e => setForm(f => ({ ...f, delivery_point_id: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            >
              <option value="">Select destination</option>
              {deliveryPoints.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Product *
            </label>
            <select
              value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            >
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Reason / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Briefly describe the emergency..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {saving ? 'Submitting...' : 'Submit Emergency Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
