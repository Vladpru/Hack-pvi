import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  await db.execute({ sql: `UPDATE alerts SET resolved = 1 WHERE id = ?`, args: [id] })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM alerts WHERE id = ?', args: [id] })
  return NextResponse.json({ success: true })
}
