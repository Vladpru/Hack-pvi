import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: Request) {
  await initDb()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const warehouseId = searchParams.get('warehouse_id')
  const lowStock = searchParams.get('low_stock')

  const conditions: string[] = []
  const args: (string | number)[] = []

  if (warehouseId) { conditions.push('i.warehouse_id = ?'); args.push(warehouseId) }
  if (lowStock === 'true') conditions.push('i.quantity < i.min_threshold')

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const { rows } = await db.execute({
    sql: `SELECT i.*, p.name as product_name, p.sku, p.unit, p.category,
                 w.name as warehouse_name
          FROM inventory i
          JOIN products p ON p.id = i.product_id
          JOIN warehouses w ON w.id = i.warehouse_id
          ${where}
          ORDER BY w.name, p.category, p.name`,
    args,
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const db = getDb()
  const { warehouse_id, product_id, quantity, min_threshold, max_threshold } = await req.json()
  if (!warehouse_id || !product_id) {
    return NextResponse.json({ error: 'warehouse_id and product_id required' }, { status: 400 })
  }
  const result = await db.execute({
    sql: `INSERT INTO inventory (warehouse_id, product_id, quantity, min_threshold, max_threshold)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(warehouse_id, product_id) DO UPDATE SET
            quantity = excluded.quantity,
            min_threshold = excluded.min_threshold,
            max_threshold = excluded.max_threshold,
            updated_at = datetime('now')`,
    args: [warehouse_id, product_id, quantity ?? 0, min_threshold ?? 10, max_threshold ?? 500],
  })
  return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 })
}
