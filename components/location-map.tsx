'use client'

import { useMemo } from 'react'

export interface MapMarker {
  id: number
  name: string
  lat: number
  lng: number
  type: 'warehouse' | 'delivery_point' | 'search'
  highlight?: boolean
  sublabel?: string
}

interface LocationMapProps {
  markers: MapMarker[]
  /** Optional: if provided, a radius circle is drawn around the first 'search' marker */
  searchRadiusKm?: number
  className?: string
  height?: number
}

// Ukraine-centered bounding box
const BOUNDS = {
  minLat: 44.0,
  maxLat: 53.5,
  minLng: 22.0,
  maxLng: 41.0,
}

function latLngToSvg(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width
  // SVG y is inverted: top = high lat
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height
  return { x, y }
}

const MARKER_COLORS = {
  warehouse: '#3b82f6',
  delivery_point: '#a855f7',
  search: '#f59e0b',
}

const MARKER_LABELS = {
  warehouse: 'W',
  delivery_point: 'D',
  search: 'S',
}

export function LocationMap({ markers, searchRadiusKm, className = '', height = 360 }: LocationMapProps) {
  const width = 640

  const svgMarkers = useMemo(
    () =>
      markers.map(m => ({
        ...m,
        ...latLngToSvg(m.lat, m.lng, width, height),
      })),
    [markers, height]
  )

  // Convert km radius to SVG units (approx: 1 degree lat ~ 111km)
  const radiusCircle = useMemo(() => {
    const searchMarker = svgMarkers.find(m => m.type === 'search')
    if (!searchMarker || !searchRadiusKm) return null
    const degreesLat = searchRadiusKm / 111
    const svgRadius = (degreesLat / (BOUNDS.maxLat - BOUNDS.minLat)) * height
    return { cx: searchMarker.x, cy: searchMarker.y, r: svgRadius }
  }, [svgMarkers, searchRadiusKm, height])

  return (
    <div className={`relative bg-secondary/40 border border-border rounded-xl overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: 'block' }}
        role="img"
        aria-label="Map showing warehouse and delivery point locations"
      >
        {/* Grid lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0} y1={(i / 7) * height}
            x2={width} y2={(i / 7) * height}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={(i / 9) * width} y1={0}
            x2={(i / 9) * width} y2={height}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Radius circle */}
        {radiusCircle && (
          <circle
            cx={radiusCircle.cx}
            cy={radiusCircle.cy}
            r={radiusCircle.r}
            fill="rgba(251,191,36,0.06)"
            stroke="rgba(251,191,36,0.3)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Connector lines from search to warehouses */}
        {svgMarkers.filter(m => m.type === 'search').map(searchM =>
          svgMarkers
            .filter(m => m.type === 'warehouse' && m.highlight)
            .map(warehouseM => (
              <line
                key={`conn-${searchM.id}-${warehouseM.id}`}
                x1={searchM.x} y1={searchM.y}
                x2={warehouseM.x} y2={warehouseM.y}
                stroke="rgba(59,130,246,0.25)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))
        )}

        {/* Markers */}
        {svgMarkers.map(m => {
          const color = MARKER_COLORS[m.type]
          const label = MARKER_LABELS[m.type]
          const size = m.highlight ? 14 : 10
          return (
            <g key={`${m.type}-${m.id}`}>
              {/* Pulse ring for highlighted */}
              {m.highlight && (
                <circle
                  cx={m.x} cy={m.y} r={size + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.3}
                />
              )}
              {/* Marker circle */}
              <circle
                cx={m.x} cy={m.y} r={size}
                fill={`${color}22`}
                stroke={color}
                strokeWidth={m.highlight ? 2 : 1.5}
              />
              {/* Label letter */}
              <text
                x={m.x} y={m.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.9}
                fontWeight="700"
                fill={color}
                style={{ userSelect: 'none', fontFamily: 'monospace' }}
              >
                {label}
              </text>
              {/* Name tooltip on hover via title */}
              <title>{m.name}{m.sublabel ? ` — ${m.sublabel}` : ''}</title>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1">
        {(['warehouse', 'delivery_point', 'search'] as const)
          .filter(type => svgMarkers.some(m => m.type === type))
          .map(type => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground backdrop-blur-sm bg-background/60 px-2 py-0.5 rounded">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MARKER_COLORS[type] }} />
              {type === 'warehouse' ? 'Warehouse' : type === 'delivery_point' ? 'Delivery Point' : 'Search Origin'}
            </div>
          ))}
      </div>

      {/* Marker count */}
      <div className="absolute top-3 right-3 text-xs text-muted-foreground bg-background/60 backdrop-blur-sm px-2 py-1 rounded border border-border">
        {markers.length} location{markers.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
