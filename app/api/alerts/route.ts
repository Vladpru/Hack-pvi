import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: Request) {
  await initDb()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const unread = searchParams.get('unread')
  const severity = searchParams.get('severity')

  const conditions: string[] = []
  if (unread === 'true') conditions.push('a.is_read = 0')
  if (severity) conditions.push(`a.severity = '${severity}'`)
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const { rows } = await db.execute(`
    SELECT a.*, w.name as warehouse_name, p.name as product_name
    FROM alerts a
    LEFT JOIN warehouses w ON w.id = a.warehouse_id
    LEFT JOIN products p ON p.id = a.product_id
    ${where}
    ORDER BY a.created_at DESC
  `)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const db = getDb()
  const body = await req.json()
  const { type, message, warehouse_id, product_id, severity } = body
  if (!type || !message) {
    return NextResponse.json({ error: 'type and message are required' }, { status: 400 })
  }
  const result = await db.execute({
    sql: `INSERT INTO alerts (type, message, warehouse_id, product_id, severity, is_read)
          VALUES (?, ?, ?, ?, ?, 0)`,
    args: [type, message, warehouse_id ?? null, product_id ?? null, severity ?? 'info'],
  })
  const { rows } = await db.execute({ sql: 'SELECT * FROM alerts WHERE id = ?', args: [Number(result.lastInsertRowid)] })
  return NextResponse.json(rows[0], { status: 201 })
}
