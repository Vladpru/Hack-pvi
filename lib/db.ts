import { createClient, Client } from '@libsql/client'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), '.data')
const DB_PATH = path.join(DB_DIR, 'logistics.db')

let dbClient: Client | null = null
let initialized = false

export function getDb(): Client {
  if (!dbClient) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    dbClient = createClient({ url: `file:${DB_PATH}` })
  }
  return dbClient
}

export async function initDb(): Promise<void> {
  if (initialized) return
  const db = getDb()

  await db.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      capacity INTEGER NOT NULL DEFAULT 1000,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pcs',
      category TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      min_threshold INTEGER NOT NULL DEFAULT 10,
      max_threshold INTEGER NOT NULL DEFAULT 500,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(warehouse_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS delivery_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL DEFAULT 0,
      lng REAL NOT NULL DEFAULT 0,
      contact TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_point_id INTEGER REFERENCES delivery_points(id),
      warehouse_id INTEGER REFERENCES warehouses(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      type TEXT NOT NULL DEFAULT 'resupply',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      warehouse_id INTEGER REFERENCES warehouses(id),
      product_id INTEGER REFERENCES products(id),
      severity TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migrate: add is_read if only resolved exists (old schema)
  try {
    await db.execute('ALTER TABLE alerts ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0')
  } catch { /* already exists */ }

  // Migrate: copy resolved -> is_read if needed
  try {
    await db.execute('UPDATE alerts SET is_read = resolved WHERE is_read = 0 AND resolved IS NOT NULL')
  } catch { /* no resolved column */ }

  // Migrate: add delivery_point_id to requests if missing
  try {
    await db.execute('ALTER TABLE requests ADD COLUMN delivery_point_id INTEGER REFERENCES delivery_points(id)')
  } catch { /* already exists */ }

  // Seed if empty
  const { rows } = await db.execute('SELECT COUNT(*) as count FROM warehouses')
  const count = Number((rows[0] as unknown as { count: number }).count)
  if (count > 0) { initialized = true; return }

  await db.executeMultiple(`
    INSERT INTO warehouses (name, location, lat, lng, capacity) VALUES
      ('Central Hub Alpha', 'Kyiv, Ukraine', 50.4501, 30.5234, 5000),
      ('Northern Depot', 'Chernihiv, Ukraine', 51.4982, 31.2893, 3000),
      ('Eastern Supply Base', 'Kharkiv, Ukraine', 49.9935, 36.2304, 4000),
      ('Southern Logistics', 'Odesa, Ukraine', 46.4825, 30.7233, 3500),
      ('Western Forward Base', 'Lviv, Ukraine', 49.8397, 24.0297, 2500);

    INSERT INTO products (name, sku, unit, category) VALUES
      ('Tactical Flashlight', 'TFL-001', 'pcs', 'Equipment'),
      ('First Aid Kit', 'FAK-002', 'kits', 'Medical'),
      ('Water Purification Tablets', 'WPT-003', 'packs', 'Consumables'),
      ('Field Ration Pack', 'FRP-004', 'packs', 'Food'),
      ('Communication Radio', 'CR-005', 'pcs', 'Electronics'),
      ('Thermal Blanket', 'TB-006', 'pcs', 'Equipment'),
      ('Diesel Fuel (200L drum)', 'DFL-007', 'drums', 'Fuel'),
      ('Vehicle Battery', 'VB-008', 'pcs', 'Spare Parts'),
      ('Ammunition Box (9mm)', 'AB-009', 'boxes', 'Munitions'),
      ('Body Armor Vest', 'BAV-010', 'pcs', 'Equipment');

    INSERT INTO inventory (warehouse_id, product_id, quantity, min_threshold, max_threshold) VALUES
      (1,1,250,50,500),(1,2,8,20,100),(1,3,400,100,1000),
      (1,4,120,50,500),(1,5,15,10,50),(1,6,300,100,800),
      (1,7,5,10,30),(1,8,45,20,100),(1,9,200,100,1000),(1,10,60,30,200),
      (2,1,80,50,300),(2,2,35,20,100),(2,3,150,100,500),
      (2,4,7,20,200),(2,5,5,10,30),(2,6,90,50,300),
      (2,7,12,10,30),(2,8,18,10,50),(2,9,400,100,1000),(2,10,25,20,100),
      (3,1,30,50,300),(3,2,60,20,150),(3,3,600,200,2000),
      (3,4,200,50,500),(3,5,22,10,50),(3,6,45,50,300),
      (3,7,20,10,40),(3,8,8,10,40),(3,9,150,100,800),(3,10,40,20,150),
      (4,1,180,50,400),(4,2,12,20,100),(4,3,250,100,800),
      (4,4,95,50,400),(4,5,8,10,30),(4,6,220,80,500),
      (4,7,18,10,35),(4,8,30,15,60),(4,9,80,100,600),(4,10,15,20,120),
      (5,1,60,50,250),(5,2,25,15,80),(5,3,100,80,400),
      (5,4,45,30,200),(5,5,12,8,25),(5,6,130,60,350),
      (5,7,8,8,25),(5,8,22,10,45),(5,9,90,80,400),(5,10,55,25,150);

    INSERT INTO delivery_points (name, address, lat, lng, contact) VALUES
      ('Field Hospital Alpha', 'Zaporizhzhia region', 47.8388, 35.1396, '+380 44 111 0001'),
      ('Forward Command Post 1', 'Donetsk region', 48.0159, 37.8028, '+380 44 111 0002'),
      ('Evacuation Center East', 'Dnipro, Ukraine', 48.4647, 35.0462, '+380 44 111 0003'),
      ('Supply Junction West', 'Vinnytsia, Ukraine', 49.2331, 28.4682, '+380 44 111 0004'),
      ('Mobile Medical Unit 7', 'Kherson region', 46.6354, 32.6169, '+380 44 111 0005');

    INSERT INTO requests (warehouse_id, delivery_point_id, product_id, quantity, priority, status, type, notes) VALUES
      (1, 1, 2, 50, 'critical', 'pending', 'emergency', 'Urgent medical supplies needed'),
      (2, 3, 4, 100, 'high', 'pending', 'resupply', 'Food stocks critically low'),
      (3, 3, 1, 200, 'normal', 'approved', 'resupply', 'Routine restock'),
      (4, 2, 9, 500, 'critical', 'pending', 'emergency', 'Emergency ammunition request'),
      (5, 4, 7, 20, 'high', 'in_transit', 'resupply', 'Fuel for vehicles'),
      (1, 5, 5, 10, 'normal', 'completed', 'resupply', 'Communication devices'),
      (2, 4, 6, 150, 'normal', 'pending', 'resupply', 'Thermal equipment for winter'),
      (3, 1, 10, 30, 'high', 'approved', 'resupply', 'Protective gear');

    INSERT INTO alerts (type, message, warehouse_id, product_id, severity, is_read) VALUES
      ('low_stock', 'First Aid Kit below minimum threshold at Central Hub Alpha', 1, 2, 'critical', 0),
      ('low_stock', 'Field Ration Pack critically low at Northern Depot', 2, 4, 'critical', 0),
      ('low_stock', 'Tactical Flashlight below threshold at Eastern Supply Base', 3, 1, 'warning', 0),
      ('low_stock', 'Body Armor Vest low at Southern Logistics', 4, 10, 'warning', 0),
      ('emergency', 'Emergency ammunition request received', 4, 9, 'critical', 0),
      ('low_stock', 'Diesel Fuel below threshold at Western Forward Base', 5, 7, 'warning', 0);
  `)

  initialized = true
}
