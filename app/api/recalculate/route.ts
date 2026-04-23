import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

const PRIORITY_WEIGHTS: Record<string, number> = { critical: 10, high: 5, normal: 1 }

export async function POST() {
  await initDb()
  const db = getDb()

  const { rows: pendingRequests } = await db.execute(`
    SELECT r.*, p.name as product_name, p.unit,
           w.name as warehouse_name,
           dp.name as delivery_point_name,
           i.quantity as available_stock
    FROM requests r
    JOIN products p ON p.id = r.product_id
    LEFT JOIN warehouses w ON w.id = r.warehouse_id
    LEFT JOIN delivery_points dp ON dp.id = r.delivery_point_id
    LEFT JOIN inventory i ON i.warehouse_id = r.warehouse_id AND i.product_id = r.product_id
    WHERE r.status IN ('pending')
    ORDER BY CASE r.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, r.created_at ASC
  `) as {
    rows: Array<{
      id: number; product_id: number; warehouse_id: number | null; quantity: number;
      priority: string; product_name: string; unit: string; warehouse_name: string | null;
      delivery_point_name: string | null; available_stock: number | null
    }>
  }

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
    product_name: string; delivery_point_name: string; priority: string; quantity: number
  }> = []

  for (const req of pendingRequests) {
    const key = `${req.warehouse_id}_${req.product_id}`
    const currentStock = req.warehouse_id ? (stockMap[key] ?? 0) : 0
    const qty = Number(req.quantity)
    const weight = PRIORITY_WEIGHTS[req.priority] ?? 1
    const dpName = req.delivery_point_name ?? 'Unknown destination'

    if (req.warehouse_id && currentStock >= qty) {
      // Approve: deduct from stock snapshot
      stockMap[key] = currentStock - qty
      actions.push({
        request_id: Number(req.id), action: 'approve',
        reason: `Stock available (${currentStock} units, priority weight: ${weight})`,
        product_name: req.product_name, delivery_point_name: dpName,
        priority: req.priority, quantity: qty,
      })
      await db.execute({
        sql: `UPDATE requests SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'`,
        args: [req.id],
      })
      // Log
      await db.execute({
        sql: `INSERT INTO audit_log (action, entity, entity_id, details) VALUES ('auto_approved', 'request', ?, ?)`,
        args: [req.id, JSON.stringify({ qty, warehouse_id: req.warehouse_id, product_id: req.product_id })],
      })
    } else {
      // Try alternate warehouse — sorted by proximity if delivery_point coords available
      const { rows: altRows } = await db.execute({
        sql: `SELECT i.warehouse_id, i.quantity, w.name as warehouse_name, w.lat, w.lng
              FROM inventory i JOIN warehouses w ON w.id = i.warehouse_id
              WHERE i.product_id = ? AND i.quantity >= ? AND i.warehouse_id != ?
              ORDER BY i.quantity DESC LIMIT 5`,
        args: [req.product_id, qty, req.warehouse_id ?? 0],
      }) as { rows: Array<{ warehouse_id: number; quantity: number; warehouse_name: string; lat: number; lng: number }> }

      const alt = altRows[0]
      if (alt) {
        const altKey = `${alt.warehouse_id}_${req.product_id}`
        stockMap[altKey] = (stockMap[altKey] ?? Number(alt.quantity)) - qty
        await db.execute({
          sql: `UPDATE requests SET warehouse_id = ?, status = 'approved', updated_at = datetime('now') WHERE id = ?`,
          args: [alt.warehouse_id, req.id],
        })
        actions.push({
          request_id: Number(req.id), action: 'rerouted',
          reason: `Rerouted to ${alt.warehouse_name} (${alt.quantity} units available)`,
          product_name: req.product_name, delivery_point_name: dpName,
          priority: req.priority, quantity: qty,
        })
        await db.execute({
          sql: `INSERT INTO audit_log (action, entity, entity_id, details) VALUES ('rerouted', 'request', ?, ?)`,
          args: [req.id, JSON.stringify({ to_warehouse_id: alt.warehouse_id, qty, product_id: req.product_id })],
        })
      } else {
        actions.push({
          request_id: Number(req.id), action: 'shortage',
          reason: `Insufficient stock across all warehouses (available: ${currentStock}, required: ${qty})`,
          product_name: req.product_name, delivery_point_name: dpName,
          priority: req.priority, quantity: qty,
        })
        if (req.priority === 'critical') {
          await db.execute({
            sql: `INSERT INTO alerts (type, message, warehouse_id, product_id, severity, is_read) VALUES ('low_stock', ?, ?, ?, 'critical', 0)`,
            args: [`CRITICAL SHORTAGE: ${req.product_name} unavailable for ${dpName}`, req.warehouse_id ?? null, req.product_id],
          })
        }
        await db.execute({
          sql: `INSERT INTO audit_log (action, entity, entity_id, details) VALUES ('shortage', 'request', ?, ?)`,
          args: [req.id, JSON.stringify({ available: currentStock, required: qty, product_id: req.product_id })],
        })
      }
    }
  }

  return NextResponse.json({ processed: pendingRequests.length, actions })
}
