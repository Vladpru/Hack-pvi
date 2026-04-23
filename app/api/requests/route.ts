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
  const args: string[] = []
  if (status) { conditions.push('r.status = ?'); args.push(status) }
  if (priority) { conditions.push('r.priority = ?'); args.push(priority) }
  if (type) { conditions.push('r.type = ?'); args.push(type) }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const { rows } = await db.execute({
    sql: `SELECT r.*, p.name as product_name, p.unit, p.sku,
                 w.name as warehouse_name, w.location as warehouse_location
          FROM requests r
          JOIN products p ON p.id = r.product_id
          JOIN warehouses w ON w.id = r.warehouse_id
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
  const { warehouse_id, product_id, quantity, priority, type, notes } = body
  if (!warehouse_id || !product_id || !quantity) {
    return NextResponse.json({ error: 'warehouse_id, product_id, and quantity are required' }, { status: 400 })
  }

  const result = await db.execute({
    sql: `INSERT INTO requests (warehouse_id, product_id, quantity, priority, status, type, notes)
          VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    args: [warehouse_id, product_id, quantity, priority ?? 'normal', type ?? 'resupply', notes ?? null],
  })

  // Generate alert for critical/emergency requests
  if (priority === 'critical' || type === 'emergency') {
    const { rows: prodRows } = await db.execute({ sql: 'SELECT name FROM products WHERE id = ?', args: [product_id] })
    const { rows: whRows } = await db.execute({ sql: 'SELECT name FROM warehouses WHERE id = ?', args: [warehouse_id] })
    const pName = (prodRows[0] as { name: string })?.name ?? 'Unknown'
    const wName = (whRows[0] as { name: string })?.name ?? 'Unknown'
    await db.execute({
      sql: `INSERT INTO alerts (type, message, warehouse_id, product_id, severity) VALUES ('emergency', ?, ?, ?, 'critical')`,
      args: [`${type === 'emergency' ? 'EMERGENCY' : 'Critical'} request: ${pName} x${quantity} from ${wName}`, warehouse_id, product_id],
    })
  }

  const { rows } = await db.execute({
    sql: `SELECT r.*, p.name as product_name, p.unit, w.name as warehouse_name
          FROM requests r
          JOIN products p ON p.id = r.product_id
          JOIN warehouses w ON w.id = r.warehouse_id
          WHERE r.id = ?`,
    args: [result.lastInsertRowid],
  })
  return NextResponse.json(rows[0], { status: 201 })
}
