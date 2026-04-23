import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET(req: Request) {
  await initDb()
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const unread = searchParams.get('unread')
  const severity = searchParams.get('severity')

  const conditions: string[] = []
  if (unread === 'true') conditions.push('a.resolved = 0')
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
