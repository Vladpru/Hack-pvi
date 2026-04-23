import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: Request) {
  await initDb()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '50.4501')
  const lng = parseFloat(searchParams.get('lng') ?? '30.5234')
  const radiusKm = parseFloat(searchParams.get('radius') ?? '500')
  const productId = searchParams.get('product_id')
  const minQuantity = parseInt(searchParams.get('min_quantity') ?? '0')

  const { rows: warehouseRows } = await db.execute('SELECT * FROM warehouses')
  const warehouses = warehouseRows as unknown as Array<{ id: number; name: string; location: string; lat: number; lng: number; capacity: number }>

  const nearby = warehouses
    .map(w => ({ ...w, distance_km: Math.round(haversine(lat, lng, Number(w.lat), Number(w.lng)) * 10) / 10 }))
    .filter(w => w.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)

  const results = await Promise.all(nearby.map(async (w) => {
    const conditions: string[] = ['i.warehouse_id = ?']
    const args: (string | number)[] = [w.id]
    if (productId) { conditions.push('i.product_id = ?'); args.push(productId) }
    if (minQuantity > 0) { conditions.push('i.quantity >= ?'); args.push(minQuantity) }

    const { rows: stock_items } = await db.execute({
      sql: `SELECT i.product_id, p.name as product_name, p.sku, p.unit, p.category,
                   i.quantity, i.min_threshold
            FROM inventory i JOIN products p ON p.id = i.product_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY p.category, p.name`,
      args,
    })
    return { ...w, stock_items }
  }))

  return NextResponse.json(results)
}
