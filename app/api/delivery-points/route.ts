import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const db = getDb()
  const { rows } = await db.execute(`SELECT * FROM delivery_points ORDER BY name`)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const db = getDb()
  const { name, address, lat, lng, contact } = await req.json()
  if (!name || !address) {
    return NextResponse.json({ error: 'Name and address are required' }, { status: 400 })
  }
  const result = await db.execute({
    sql: `INSERT INTO delivery_points (name, address, lat, lng, contact) VALUES (?, ?, ?, ?, ?)`,
    args: [name, address, lat ?? 0, lng ?? 0, contact ?? null],
  })
  const { rows } = await db.execute({ sql: 'SELECT * FROM delivery_points WHERE id = ?', args: [result.lastInsertRowid] })
  return NextResponse.json(rows[0], { status: 201 })
}
