import pg from 'pg';

const { Pool } = pg;
let pool;
let schemaPromise;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PG_POOL_MAX || 5),
    });
  }
  return pool;
}

async function ensureSchema() {
  const database = getPool();
  if (!database) return false;
  if (!schemaPromise) {
    schemaPromise = database.query(`
      CREATE TABLE IF NOT EXISTS patzcom_orders (
        id BIGSERIAL PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL CHECK (provider IN ('paypal', 'stripe')),
        provider_order_id TEXT,
        status TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        subtotal NUMERIC(12, 2) NOT NULL,
        shipping NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total NUMERIC(12, 2) NOT NULL,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_fulfillment',
        tracking_number TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS patzcom_orders_status_idx ON patzcom_orders (status);
      CREATE INDEX IF NOT EXISTS patzcom_orders_created_idx ON patzcom_orders (created_at DESC);
      CREATE TABLE IF NOT EXISTS patzcom_catalog (
        id SMALLINT PRIMARY KEY CHECK (id = 1),
        products JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_fulfillment';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT NOT NULL DEFAULT '';
    `).then(() => true).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function initializeDatabase() {
  return ensureSchema();
}

export async function recordOrder({ reference, provider, providerOrderId = null, status, cart }) {
  if (!(await ensureSchema())) return null;
  const database = getPool();
  const result = await database.query(`
    INSERT INTO patzcom_orders (reference, provider, provider_order_id, status, currency, subtotal, shipping, total, items)
    VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, $8::jsonb)
    ON CONFLICT (reference) DO UPDATE SET
      provider_order_id = COALESCE(EXCLUDED.provider_order_id, patzcom_orders.provider_order_id),
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *
  `, [reference, provider, providerOrderId, status, cart.subtotal, cart.shipping, cart.total, JSON.stringify(cart.lines)]);
  return result.rows[0];
}

export async function updateOrderStatus({ reference, providerOrderId, status }) {
  if (!(await ensureSchema())) return null;
  const database = getPool();
  const result = await database.query(`
    UPDATE patzcom_orders
    SET status = $1, provider_order_id = COALESCE($2, provider_order_id), updated_at = NOW()
    WHERE reference = $3 OR provider_order_id = $2
    RETURNING *
  `, [status, providerOrderId || null, reference || '']);
  return result.rows[0] || null;
}

export async function listOrders(limit = 100) {
  if (!(await ensureSchema())) return [];
  const database = getPool();
  const result = await database.query('SELECT * FROM patzcom_orders ORDER BY created_at DESC LIMIT $1', [Math.min(Math.max(Number(limit) || 100, 1), 500)]);
  return result.rows;
}

export async function getCatalogSnapshot() {
  if (!(await ensureSchema())) return null;
  const result = await getPool().query('SELECT products FROM patzcom_catalog WHERE id = 1');
  return result.rows[0]?.products ?? null;
}

export async function saveCatalogSnapshotToDatabase(products) {
  if (!(await ensureSchema())) return false;
  await getPool().query(`
    INSERT INTO patzcom_catalog (id, products) VALUES (1, $1::jsonb)
    ON CONFLICT (id) DO UPDATE SET products = EXCLUDED.products, updated_at = NOW()
  `, [JSON.stringify(products)]);
  return true;
}

export async function updateOrderFulfillment(id, fulfillmentStatus, trackingNumber = '') {
  const allowed = new Set(['awaiting_fulfillment', 'packing', 'shipped', 'delivered', 'on_hold']);
  const orderId = Number(id);
  const tracking = String(trackingNumber || '').trim().slice(0, 120);
  if (!Number.isSafeInteger(orderId) || orderId < 1) throw new Error('Invalid order ID.');
  if (!allowed.has(fulfillmentStatus)) throw new Error('Invalid fulfillment status.');
  if (fulfillmentStatus === 'shipped' && !tracking) throw new Error('Add a tracking number before marking an order as shipped.');
  if (!(await ensureSchema())) throw new Error('PostgreSQL is not configured.');
  const result = await getPool().query(`
    UPDATE patzcom_orders SET fulfillment_status = $1, tracking_number = $2, updated_at = NOW()
    WHERE id = $3 RETURNING *
  `, [fulfillmentStatus, tracking, orderId]);
  if (!result.rows[0]) throw new Error('Order not found.');
  return result.rows[0];
}
