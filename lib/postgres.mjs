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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS patzcom_orders_status_idx ON patzcom_orders (status);
      CREATE INDEX IF NOT EXISTS patzcom_orders_created_idx ON patzcom_orders (created_at DESC);
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
