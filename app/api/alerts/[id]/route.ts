import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const is_read = body.is_read !== undefined ? (body.is_read ? 1 : 0) : 1
  await db.execute({ sql: `UPDATE alerts SET is_read = ? WHERE id = ?`, args: [is_read, id] })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM alerts WHERE id = ?', args: [id] })
  return NextResponse.json({ success: true })
}
