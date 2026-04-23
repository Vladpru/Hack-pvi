import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const db = getDb()
  const { rows } = await db.execute(`
    SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100
  `)
  return NextResponse.json(rows)
}
