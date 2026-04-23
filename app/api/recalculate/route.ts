import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

const PRIORITY_WEIGHTS: Record<string, number> = { critical: 10, high: 5, normal: 1 }

export async function POST() {
  await initDb()
  const db = getDb()

  const { rows: pendingRequests } = await db.execute(`
    SELECT r.*, p.name as product_name, w.name as warehouse_name,
           i.quantity as available_stock
    FROM requests r
    JOIN products p ON p.id = r.product_id
    JOIN warehouses w ON w.id = r.warehouse_id
    LEFT JOIN inventory i ON i.warehouse_id = r.warehouse_id AND i.product_id = r.product_id
    WHERE r.status IN ('pending','approved')
    ORDER BY CASE r.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, r.created_at ASC
  `) as { rows: Array<{
    id: number; product_id: number; warehouse_id: number; quantity: number;
    priority: string; product_name: string; warehouse_name: string; available_stock: number | null
  }> }

  const { rows: allInventory } = await db.execute(
    'SELECT warehouse_id, product_id, quantity FROM inventory'
  ) as { rows: Array<{ warehouse_id: number; product_id: number; quantity: number }> }

  // Build mutable stock snapshot
  const stockMap: Record<string, number> = {}
  for (const inv of allInventory) {
    stockMap[`${inv.warehouse_id}_${inv.product_id}`] = Number(inv.quantity)
  }

  const actions: Array<{
    request_id: number; action: string; reason: string;
    product_name: string; warehouse_name: string; priority: string; quantity: number
  }> = []

  for (const req of pendingRequests) {
    const key = `${req.warehouse_id}_${req.product_id}`
    const currentStock = stockMap[key] ?? 0
    const qty = Number(req.quantity)
    const weight = PRIORITY_WEIGHTS[req.priority] ?? 1

    if (currentStock >= qty) {
      stockMap[key] = currentStock - qty
      actions.push({
        request_id: Number(req.id), action: 'approve',
        reason: `Stock available (${currentStock} units). Priority weight: ${weight}`,
        product_name: req.product_name, warehouse_name: req.warehouse_name,
        priority: req.priority, quantity: qty,
      })
      await db.execute({
        sql: `UPDATE requests SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'`,
        args: [req.id],
      })
    } else {
      // Try alternate warehouse
      const { rows: altRows } = await db.execute({
        sql: `SELECT i.warehouse_id, i.quantity, w.name as warehouse_name
              FROM inventory i JOIN warehouses w ON w.id = i.warehouse_id
              WHERE i.product_id = ? AND i.quantity >= ? AND i.warehouse_id != ?
              ORDER BY i.quantity DESC LIMIT 1`,
        args: [req.product_id, qty, req.warehouse_id ?? 0],
      }) as { rows: Array<{ warehouse_id: number; quantity: number; warehouse_name: string }> }

      if (altRows[0]) {
        const alt = altRows[0]
        const altKey = `${alt.warehouse_id}_${req.product_id}`
        stockMap[altKey] = (stockMap[altKey] ?? Number(alt.quantity)) - qty
        await db.execute({
          sql: `UPDATE requests SET warehouse_id = ?, status = 'approved', updated_at = datetime('now') WHERE id = ?`,
          args: [alt.warehouse_id, req.id],
        })
        actions.push({
          request_id: Number(req.id), action: 'rerouted',
          reason: `Rerouted to ${alt.warehouse_name} with ${alt.quantity} units available`,
          product_name: req.product_name, warehouse_name: alt.warehouse_name,
          priority: req.priority, quantity: qty,
        })
      } else {
        actions.push({
          request_id: Number(req.id), action: 'shortage',
          reason: `Insufficient stock across all warehouses. Available: ${currentStock}/${qty} required`,
          product_name: req.product_name, warehouse_name: req.warehouse_name,
          priority: req.priority, quantity: qty,
        })
        if (req.priority === 'critical') {
          await db.execute({
            sql: `INSERT INTO alerts (type, message, warehouse_id, product_id, severity) VALUES ('low_stock', ?, ?, ?, 'critical')`,
            args: [`CRITICAL SHORTAGE: ${req.product_name} unavailable at ${req.warehouse_name}`, req.warehouse_id, req.product_id],
          })
        }
      }
    }
  }

  return NextResponse.json({ processed: actions.length, actions })
}
