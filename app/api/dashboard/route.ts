import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const db = getDb()

  const [
    { rows: r1 }, { rows: r2 }, { rows: r3 },
    { rows: r4 }, { rows: r5 }, { rows: r6 },
  ] = await Promise.all([
    db.execute("SELECT COUNT(*) as c FROM warehouses"),
    db.execute("SELECT COUNT(*) as c FROM products"),
    db.execute("SELECT COUNT(*) as c FROM delivery_points"),
    db.execute("SELECT COUNT(*) as c FROM requests WHERE status = 'pending'"),
    db.execute("SELECT COUNT(*) as c FROM requests WHERE priority = 'critical' AND status NOT IN ('delivered','cancelled')"),
    db.execute("SELECT COUNT(*) as c FROM alerts WHERE is_read = 0"),
  ])

  const { rows: lowStockItems } = await db.execute(`
    SELECT i.id, p.name as product_name, w.name as warehouse_name,
           i.quantity, i.min_threshold
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    JOIN warehouses w ON w.id = i.warehouse_id
    WHERE i.quantity < i.min_threshold
    ORDER BY (i.quantity * 1.0 / i.min_threshold) ASC
    LIMIT 8
  `)

  const { rows: recentRequests } = await db.execute(`
    SELECT r.id, r.quantity, r.priority, r.status, r.created_at, r.type,
           p.name as product_name, p.unit,
           w.name as warehouse_name,
           dp.name as delivery_point_name
    FROM requests r
    JOIN products p ON p.id = r.product_id
    LEFT JOIN warehouses w ON w.id = r.warehouse_id
    LEFT JOIN delivery_points dp ON dp.id = r.delivery_point_id
    ORDER BY r.created_at DESC
    LIMIT 8
  `)

  const { rows: requestsByStatus } = await db.execute(
    `SELECT status, COUNT(*) as count FROM requests GROUP BY status`
  )

  const { rows: requestsByPriority } = await db.execute(`
    SELECT priority, COUNT(*) as count FROM requests
    WHERE status NOT IN ('delivered','cancelled') GROUP BY priority
  `)

  const { rows: inventoryByCategory } = await db.execute(`
    SELECT p.category, SUM(i.quantity) as total_quantity, COUNT(DISTINCT p.id) as product_count
    FROM inventory i JOIN products p ON p.id = i.product_id
    GROUP BY p.category
    ORDER BY total_quantity DESC
  `)

  const { rows: warehouseUtilization } = await db.execute(`
    SELECT w.name, w.capacity,
           COALESCE(SUM(i.quantity), 0) as total_stock
    FROM warehouses w
    LEFT JOIN inventory i ON i.warehouse_id = w.id
    GROUP BY w.id
    ORDER BY total_stock DESC
  `)

  const { rows: recentAlerts } = await db.execute(`
    SELECT a.*, w.name as warehouse_name, p.name as product_name
    FROM alerts a
    LEFT JOIN warehouses w ON w.id = a.warehouse_id
    LEFT JOIN products p ON p.id = a.product_id
    WHERE a.is_read = 0
    ORDER BY a.created_at DESC
    LIMIT 5
  `)

  return NextResponse.json({
    stats: {
      totalWarehouses: Number((r1[0] as unknown as { c: number }).c),
      totalProducts: Number((r2[0] as unknown as { c: number }).c),
      totalDeliveryPoints: Number((r3[0] as unknown as { c: number }).c),
      pendingRequests: Number((r4[0] as unknown as { c: number }).c),
      criticalRequests: Number((r5[0] as unknown as { c: number }).c),
      unreadAlerts: Number((r6[0] as unknown as { c: number }).c),
    },
    lowStockItems,
    recentRequests,
    requestsByStatus,
    requestsByPriority,
    inventoryByCategory,
    warehouseUtilization,
    recentAlerts,
  })
}
