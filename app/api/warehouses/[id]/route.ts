import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const { rows } = await db.execute({
    sql: `SELECT w.*, COALESCE(SUM(i.quantity), 0) as total_stock
          FROM warehouses w LEFT JOIN inventory i ON i.warehouse_id = w.id
          WHERE w.id = ? GROUP BY w.id`,
    args: [id],
  })
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const { name, location, lat, lng, capacity } = await req.json()
  await db.execute({
    sql: `UPDATE warehouses SET
            name = COALESCE(?, name), location = COALESCE(?, location),
            lat = COALESCE(?, lat), lng = COALESCE(?, lng),
            capacity = COALESCE(?, capacity)
          WHERE id = ?`,
    args: [name ?? null, location ?? null, lat ?? null, lng ?? null, capacity ?? null, id],
  })
  const { rows } = await db.execute({ sql: 'SELECT * FROM warehouses WHERE id = ?', args: [id] })
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM warehouses WHERE id = ?', args: [id] })
  return NextResponse.json({ success: true })
}
