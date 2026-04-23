import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const db = getDb()
  const { id } = await params
  const { quantity, min_threshold, max_threshold } = await req.json()

  const { rows: existing } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [id] })
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.execute({
    sql: `UPDATE inventory SET
            quantity = COALESCE(?, quantity),
            min_threshold = COALESCE(?, min_threshold),
            max_threshold = COALESCE(?, max_threshold),
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [quantity ?? null, min_threshold ?? null, max_threshold ?? null, id],
  })

  // Auto-generate low_stock alert if below threshold
  const { rows: updatedRows } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [id] })
  const updated = updatedRows[0] as unknown as { quantity: number; min_threshold: number; warehouse_id: number; product_id: number }

  if (updated.quantity < updated.min_threshold) {
    const { rows: alertRows } = await db.execute({
      sql: `SELECT id FROM alerts WHERE type = 'low_stock' AND warehouse_id = ? AND product_id = ? AND is_read = 0`,
      args: [updated.warehouse_id, updated.product_id],
    })
    if (!alertRows[0]) {
      const { rows: prodRows } = await db.execute({ sql: 'SELECT name FROM products WHERE id = ?', args: [updated.product_id] })
      const { rows: whRows } = await db.execute({ sql: 'SELECT name FROM warehouses WHERE id = ?', args: [updated.warehouse_id] })
      const pName = (prodRows[0] as unknown as { name: string }).name
      const wName = (whRows[0] as unknown as { name: string }).name
      await db.execute({
        sql: `INSERT INTO alerts (type, message, warehouse_id, product_id, severity) VALUES ('low_stock', ?, ?, ?, 'warning')`,
        args: [`${pName} stock below threshold at ${wName} (${updated.quantity} < ${updated.min_threshold})`, updated.warehouse_id, updated.product_id],
      })
    }
  }

  return NextResponse.json({ success: true })
}
