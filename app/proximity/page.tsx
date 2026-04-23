'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, Search, Warehouse, Package } from 'lucide-react'
import { LocationMap, type MapMarker } from '@/components/location-map'

interface ProximityResult {
  id: number
  name: string
  location: string
  lat: number
  lng: number
  capacity: number
  distance_km: number
  stock_items: Array<{
    product_id: number
    product_name: string
    sku: string
    unit: string
    quantity: number
    min_threshold: number
  }>
}

function ProximityContent() {
  const searchParams = useSearchParams()
  const [lat, setLat] = useState(searchParams.get('lat') ?? '')
  const [lng, setLng] = useState(searchParams.get('lng') ?? '')
  const [radius, setRadius] = useState('50')
  const [productId, setProductId] = useState('')
  const [minQty, setMinQty] = useState('')
  const [results, setResults] = useState<ProximityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku: string }>>([])
  const [deliveryPoints, setDeliveryPoints] = useState<Array<{ id: number; name: string; lat: number; lng: number }>>([])

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts)
    fetch('/api/delivery-points').then(r => r.json()).then(setDeliveryPoints)

    // Auto-search if lat/lng provided via query params
    const qlat = searchParams.get('lat')
    const qlng = searchParams.get('lng')
    if (qlat && qlng) {
      handleSearch(qlat, qlng, '50', '', '')
    }
  }, [])

  const handleSearch = async (
    searchLat = lat,
    searchLng = lng,
    searchRadius = radius,
    searchProduct = productId,
    searchMinQty = minQty,
  ) => {
    setError('')
    if (!searchLat || !searchLng) {
      setError('Latitude and longitude are required.')
      return
    }
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams({
      lat: searchLat,
      lng: searchLng,
      radius: searchRadius,
    })
    if (searchProduct) params.set('product_id', searchProduct)
    if (searchMinQty) params.set('min_quantity', searchMinQty)

    const res = await fetch(`/api/proximity?${params}`)
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const handleDeliveryPointSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dp = deliveryPoints.find(d => d.id === parseInt(e.target.value))
    if (dp) {
      setLat(String(dp.lat))
      setLng(String(dp.lng))
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 pt-20 lg:pt-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Proximity Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find warehouses near a delivery point and check stock availability</p>
      </div>

      {/* Search form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Search Parameters</h2>
        {error && <p className="text-xs text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quick select from delivery point</label>
            <select
              onChange={handleDeliveryPointSelect}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select a delivery point to autofill coordinates --</option>
              {deliveryPoints.map(dp => (
                <option key={dp.id} value={dp.id}>{dp.name} ({dp.lat.toFixed(4)}, {dp.lng.toFixed(4)})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Latitude *</label>
            <input type="number" step="any" placeholder="50.45"
              value={lat} onChange={e => setLat(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Longitude *</label>
            <input type="number" step="any" placeholder="30.52"
              value={lng} onChange={e => setLng(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Radius (km)</label>
            <input type="number" min="1" max="500" placeholder="50"
              value={radius} onChange={e => setRadius(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Filter by Product</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Any product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Minimum Quantity</label>
            <input type="number" min="0" placeholder="0"
              value={minQty} onChange={e => setMinQty(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Search className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
              {loading ? 'Searching...' : 'Search Warehouses'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {loading ? 'Searching...' : `${results.length} warehouse${results.length !== 1 ? 's' : ''} found`}
            </h2>
            {!loading && results.length > 0 && (
              <p className="text-xs text-muted-foreground">Sorted by distance</p>
            )}
          </div>

          {/* Map visualisation */}
          {!loading && (lat || lng) && (
            (() => {
              const mapMarkers: MapMarker[] = []
              if (lat && lng) {
                mapMarkers.push({
                  id: 0,
                  name: 'Search Origin',
                  lat: parseFloat(lat),
                  lng: parseFloat(lng),
                  type: 'search',
                  highlight: true,
                })
              }
              results.forEach(w => {
                mapMarkers.push({
                  id: w.id,
                  name: w.name,
                  lat: w.lat,
                  lng: w.lng,
                  type: 'warehouse',
                  highlight: true,
                  sublabel: `${w.distance_km.toFixed(1)} km`,
                })
              })
              return mapMarkers.length > 0 ? (
                <LocationMap
                  markers={mapMarkers}
                  searchRadiusKm={parseFloat(radius)}
                  height={300}
                />
              ) : null
            })()
          )}

          {!loading && results.length === 0 && (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3">
              <Warehouse className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No warehouses found within {radius}km</p>
              <p className="text-xs text-muted-foreground">Try increasing the search radius</p>
            </div>
          )}

          {results.map(w => (
            <div key={w.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Warehouse header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 shrink-0">
                    <Warehouse className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-sm font-bold text-primary">{w.distance_km.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="text-sm font-bold text-foreground">{w.capacity.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <MapPin className="w-3 h-3" />
                    {w.lat.toFixed(3)}, {w.lng.toFixed(3)}
                  </div>
                </div>
              </div>

              {/* Stock items */}
              {w.stock_items.length > 0 ? (
                <div className="divide-y divide-border">
                  {w.stock_items.map(item => {
                    const isLow = item.quantity < item.min_threshold
                    return (
                      <div key={item.product_id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Package className={`w-3.5 h-3.5 shrink-0 ${isLow ? 'text-amber-400' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="text-sm text-foreground">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular-nums ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {item.quantity.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                          </p>
                          {isLow && <p className="text-xs text-amber-400/70">Below min ({item.min_threshold})</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-4 text-sm text-muted-foreground">No matching stock in this warehouse</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProximityPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProximityContent />
    </Suspense>
  )
}
