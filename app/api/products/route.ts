import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const db = getDb()
  const { rows } = await db.execute(`
    SELECT p.*, COALESCE(SUM(i.quantity), 0) as total_stock
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    GROUP BY p.id
    ORDER BY p.category, p.name
  `)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const db = getDb()
  const { name, sku, unit, category } = await req.json()
  if (!name || !sku) {
    return NextResponse.json({ error: 'Name and SKU are required' }, { status: 400 })
  }
  try {
    const result = await db.execute({
      sql: `INSERT INTO products (name, sku, unit, category) VALUES (?, ?, ?, ?)`,
      args: [name, sku, unit ?? 'pcs', category ?? 'General'],
    })
    const { rows } = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [Number(result.lastInsertRowid)] })
    return NextResponse.json(rows[0], { status: 201 })
  } catch {
    return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
  }
}
