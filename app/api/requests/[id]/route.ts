import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const { rows } = await db.execute({
    sql: `SELECT r.*, p.name as product_name, p.unit, p.sku,
                 w.name as warehouse_name, w.location as warehouse_location,
                 dp.name as delivery_point_name, dp.address as delivery_point_address
          FROM requests r
          JOIN products p ON p.id = r.product_id
          LEFT JOIN warehouses w ON w.id = r.warehouse_id
          LEFT JOIN delivery_points dp ON dp.id = r.delivery_point_id
          WHERE r.id = ?`,
    args: [id],
  })
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const body = await req.json()
  const { status, priority, warehouse_id, notes } = body

  const { rows: reqRows } = await db.execute({ sql: 'SELECT * FROM requests WHERE id = ?', args: [id] })
  const request = reqRows[0] as {
    id: number; product_id: number; warehouse_id: number; quantity: number; status: string
  } | undefined
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // When marking delivered, deduct from inventory
  if (status === 'delivered' && request.status !== 'delivered') {
    const wid = warehouse_id ?? request.warehouse_id
    if (wid) {
      await db.execute({
        sql: `UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = datetime('now')
              WHERE warehouse_id = ? AND product_id = ?`,
        args: [request.quantity, wid, request.product_id],
      })
    }
    // Log in audit
    await db.execute({
      sql: `INSERT INTO audit_log (action, entity, entity_id, details) VALUES ('delivered', 'request', ?, ?)`,
      args: [id, JSON.stringify({ quantity: request.quantity, product_id: request.product_id, warehouse_id: wid })],
    })
  }

  await db.execute({
    sql: `UPDATE requests SET
            status = COALESCE(?, status),
            priority = COALESCE(?, priority),
            warehouse_id = COALESCE(?, warehouse_id),
            notes = COALESCE(?, notes),
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [status ?? null, priority ?? null, warehouse_id ?? null, notes ?? null, id],
  })

  const { rows } = await db.execute({
    sql: `SELECT r.*, p.name as product_name, p.unit, p.sku,
                 w.name as warehouse_name,
                 dp.name as delivery_point_name
          FROM requests r
          JOIN products p ON p.id = r.product_id
          LEFT JOIN warehouses w ON w.id = r.warehouse_id
          LEFT JOIN delivery_points dp ON dp.id = r.delivery_point_id
          WHERE r.id = ?`,
    args: [id],
  })
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM requests WHERE id = ?', args: [id] })
  return NextResponse.json({ success: true })
}
