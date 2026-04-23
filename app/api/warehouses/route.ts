import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const db = getDb()
  const { rows } = await db.execute(`
    SELECT w.*,
      COALESCE(SUM(i.quantity), 0) as total_stock,
      COUNT(DISTINCT i.product_id) as product_count
    FROM warehouses w
    LEFT JOIN inventory i ON i.warehouse_id = w.id
    GROUP BY w.id
    ORDER BY w.name
  `)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const db = getDb()
  const body = await req.json()
  const { name, location, lat, lng, capacity } = body
  if (!name || !location) {
    return NextResponse.json({ error: 'Name and location are required' }, { status: 400 })
  }
  const result = await db.execute({
    sql: `INSERT INTO warehouses (name, location, lat, lng, capacity) VALUES (?, ?, ?, ?, ?)`,
    args: [name, location, lat ?? 0, lng ?? 0, capacity ?? 1000],
  })
  const { rows } = await db.execute({ sql: 'SELECT * FROM warehouses WHERE id = ?', args: [Number(result.lastInsertRowid)] })
  return NextResponse.json(rows[0], { status: 201 })
}
