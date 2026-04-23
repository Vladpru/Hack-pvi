import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: Request) {
  await initDb()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const type = searchParams.get('type')

  const conditions: string[] = []
  const args: (string | number)[] = []
  if (status) { conditions.push('r.status = ?'); args.push(status) }
  if (priority) { conditions.push('r.priority = ?'); args.push(priority) }
  if (type) { conditions.push('r.type = ?'); args.push(type) }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const { rows } = await db.execute({
    sql: `SELECT r.*,
                 p.name as product_name, p.unit, p.sku,
                 w.name as warehouse_name, w.location as warehouse_location,
                 dp.name as delivery_point_name, dp.address as delivery_point_address
          FROM requests r
          JOIN products p ON p.id = r.product_id
          LEFT JOIN warehouses w ON w.id = r.warehouse_id
          LEFT JOIN delivery_points dp ON dp.id = r.delivery_point_id
          ${where}
          ORDER BY CASE r.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, r.created_at DESC`,
    args,
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const db = getDb()
  const body = await req.json()
  const { delivery_point_id, warehouse_id, product_id, quantity, priority, type, notes } = body

  if (!product_id || !quantity) {
    return NextResponse.json({ error: 'product_id and quantity are required' }, { status: 400 })
  }

  // Auto-assign warehouse if not provided — pick the one with most stock for this product
  let resolvedWarehouseId = warehouse_id ?? null
  if (!resolvedWarehouseId) {
    const { rows: bestWh } = await db.execute({
      sql: `SELECT i.warehouse_id FROM inventory i
            WHERE i.product_id = ? AND i.quantity >= ?
            ORDER BY i.quantity DESC LIMIT 1`,
      args: [product_id, quantity],
    })
    if (bestWh[0]) {
      resolvedWarehouseId = (bestWh[0] as unknown as { warehouse_id: number }).warehouse_id
    } else {
      // Fall back to any warehouse with the most stock
      const { rows: anyWh } = await db.execute({
        sql: `SELECT i.warehouse_id FROM inventory i WHERE i.product_id = ? ORDER BY i.quantity DESC LIMIT 1`,
        args: [product_id],
      })
      resolvedWarehouseId = anyWh[0] ? (anyWh[0] as unknown as { warehouse_id: number }).warehouse_id : null
    }
  }

  const result = await db.execute({
    sql: `INSERT INTO requests (delivery_point_id, warehouse_id, product_id, quantity, priority, status, type, notes)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    args: [
      delivery_point_id ?? null,
      resolvedWarehouseId,
      product_id,
      quantity,
      priority ?? 'normal',
      type ?? 'resupply',
      notes ?? null,
    ],
  })

  // Generate alert for critical/emergency requests
  if (priority === 'critical' || type === 'emergency') {
    const { rows: prodRows } = await db.execute({ sql: 'SELECT name FROM products WHERE id = ?', args: [product_id] })
    const pName = (prodRows[0] as unknown as { name: string })?.name ?? 'Unknown'
    const wName = resolvedWarehouseId
      ? ((await db.execute({ sql: 'SELECT name FROM warehouses WHERE id = ?', args: [resolvedWarehouseId] })).rows[0] as unknown as { name: string })?.name ?? 'Unknown'
      : 'Unassigned'
    await db.execute({
      sql: `INSERT INTO alerts (type, message, warehouse_id, product_id, severity, is_read) VALUES ('emergency', ?, ?, ?, 'critical', 0)`,
      args: [`${type === 'emergency' ? 'EMERGENCY' : 'Critical'} request: ${pName} x${quantity} from ${wName}`, resolvedWarehouseId, product_id],
    })
  }

  const { rows } = await db.execute({
    sql: `SELECT r.*, p.name as product_name, p.unit, p.sku,
                 w.name as warehouse_name,
                 dp.name as delivery_point_name, dp.address as delivery_point_address
          FROM requests r
          JOIN products p ON p.id = r.product_id
          LEFT JOIN warehouses w ON w.id = r.warehouse_id
          LEFT JOIN delivery_points dp ON dp.id = r.delivery_point_id
          WHERE r.id = ?`,
    args: [Number(result.lastInsertRowid)],
  })
  return NextResponse.json(rows[0], { status: 201 })
}
