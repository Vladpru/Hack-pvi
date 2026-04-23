import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const body = await req.json()
  const { name, sku, unit, category } = body

  const { rows: existing } = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] })
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await db.execute({
      sql: `UPDATE products SET
              name = COALESCE(?, name),
              sku = COALESCE(?, sku),
              unit = COALESCE(?, unit),
              category = COALESCE(?, category)
            WHERE id = ?`,
      args: [name ?? null, sku ?? null, unit ?? null, category ?? null, id],
    })
  } catch {
    return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
  }

  const { rows } = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] })
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  try {
    await db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Cannot delete product with existing inventory' }, { status: 409 })
  }
}
