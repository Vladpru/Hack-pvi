import { NextResponse } from 'next/server'
import { getDb, initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const db = getDb()

  const [
    { rows: byStatus },
    { rows: byPriority },
    { rows: byCategory },
    { rows: warehouseUtil },
    { rows: topProducts },
    { rows: recentActivity },
    { rows: fulfillmentRate },
  ] = await Promise.all([
    db.execute(`SELECT status, COUNT(*) as count FROM requests GROUP BY status`),
    db.execute(`SELECT priority, COUNT(*) as count FROM requests GROUP BY priority`),
    db.execute(`
      SELECT p.category, SUM(i.quantity) as total_quantity, COUNT(DISTINCT p.id) as product_count
      FROM inventory i JOIN products p ON p.id = i.product_id
      GROUP BY p.category ORDER BY total_quantity DESC
    `),
    db.execute(`
      SELECT w.name,
             COALESCE(SUM(i.quantity), 0) as total_stock,
             w.capacity,
             ROUND(COALESCE(SUM(i.quantity), 0) * 100.0 / w.capacity, 1) as fill_pct
      FROM warehouses w LEFT JOIN inventory i ON i.warehouse_id = w.id
      GROUP BY w.id ORDER BY fill_pct DESC
    `),
    db.execute(`
      SELECT p.name as product_name, p.sku, p.category, p.unit,
             COALESCE(SUM(i.quantity), 0) as total_stock,
             COUNT(DISTINCT r.id) as request_count
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN requests r ON r.product_id = p.id
      GROUP BY p.id ORDER BY request_count DESC LIMIT 10
    `),
    db.execute(`
      SELECT date(created_at) as day, COUNT(*) as requests_created
      FROM requests
      WHERE created_at >= date('now', '-30 days')
      GROUP BY day ORDER BY day ASC
    `),
    db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('delivered') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status IN ('approved','in_transit') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM requests
    `),
  ])

  return NextResponse.json({
    byStatus,
    byPriority,
    byCategory,
    warehouseUtil,
    topProducts,
    recentActivity,
    fulfillmentRate: fulfillmentRate[0],
  })
}
