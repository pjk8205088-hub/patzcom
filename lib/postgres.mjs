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
      CREATE TABLE IF NOT EXISTS patzcom_state (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value JSONB NOT NULL,
        expires_at TIMESTAMPTZ,
        PRIMARY KEY (namespace, key)
      );
      CREATE TABLE IF NOT EXISTS patzcom_images (
        path TEXT PRIMARY KEY,
        data BYTEA NOT NULL
      );
      CREATE TABLE IF NOT EXISTS patzcom_contact_messages (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        vehicle TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT NOT NULL DEFAULT '',
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS patzcom_contact_status_idx ON patzcom_contact_messages(status, created_at DESC);
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'awaiting_fulfillment';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT NOT NULL DEFAULT '';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS buyer_email TEXT NOT NULL DEFAULT '';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS buyer_name TEXT NOT NULL DEFAULT '';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS buyer_phone TEXT NOT NULL DEFAULT '';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS paid_email_at TIMESTAMPTZ;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS shipped_email_at TIMESTAMPTZ;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS email_error TEXT NOT NULL DEFAULT '';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS capture_id TEXT NOT NULL DEFAULT '';
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS payment_fee NUMERIC(12, 2);
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2);
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS refund_debit NUMERIC(12, 2) NOT NULL DEFAULT 0;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS refunds JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS refund_in_progress BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS paypal_refund_request JSONB;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
      ALTER TABLE patzcom_orders ADD COLUMN IF NOT EXISTS settlement_synced_at TIMESTAMPTZ;
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
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for checkout.');
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

export async function readState(namespace, key) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for persistence.');
  const result = await getPool().query('SELECT value FROM patzcom_state WHERE namespace=$1 AND key=$2 AND (expires_at IS NULL OR expires_at>NOW())', [namespace, key]);
  return result.rows[0]?.value ?? null;
}

export async function writeState(namespace, key, value, expiresAt = null) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for persistence.');
  await getPool().query(`INSERT INTO patzcom_state(namespace,key,value,expires_at) VALUES($1,$2,$3::jsonb,$4)
    ON CONFLICT(namespace,key) DO UPDATE SET value=EXCLUDED.value, expires_at=EXCLUDED.expires_at`, [namespace,key,JSON.stringify(value),expiresAt ? new Date(expiresAt) : null]);
}

export async function deleteState(namespace, key) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for persistence.');
  await getPool().query('DELETE FROM patzcom_state WHERE namespace=$1 AND key=$2',[namespace,key]);
}

export async function saveImage(path, data) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for image uploads.');
  await getPool().query('INSERT INTO patzcom_images(path,data) VALUES($1,$2)',[path,data]);
}

export async function readImage(path) {
  if (!(await ensureSchema())) return null;
  return (await getPool().query('SELECT data FROM patzcom_images WHERE path=$1',[path])).rows[0]?.data ?? null;
}

export async function createContactMessage({ name, email, vehicle, message }) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for contact messages.');
  const result = await getPool().query(`INSERT INTO patzcom_contact_messages(name,email,vehicle,message)
    VALUES($1,$2,$3,$4) RETURNING *`, [name, email, vehicle || '', message]);
  return result.rows[0];
}

export async function markContactMessage(id, { status, error = '', sentAt = null }) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for contact messages.');
  const result = await getPool().query(`UPDATE patzcom_contact_messages
    SET status=$1, attempts=attempts+1, last_error=$2, sent_at=COALESCE($3, sent_at), updated_at=NOW()
    WHERE id=$4 RETURNING *`, [status, error.slice(0, 1000), sentAt, id]);
  return result.rows[0] || null;
}

export async function listContactMessages(limit = 200) {
  if (!(await ensureSchema())) return [];
  const result = await getPool().query(
    'SELECT * FROM patzcom_contact_messages ORDER BY created_at DESC LIMIT $1',
    [Math.min(Math.max(Number(limit) || 100, 1), 500)],
  );
  return result.rows;
}

export async function updateContactMessageStatus(id, status) {
  const allowed = new Set(['queued', 'sent', 'read', 'closed', 'email_failed']);
  const messageId = Number(id);
  if (!Number.isSafeInteger(messageId) || messageId < 1) throw new Error('Invalid message ID.');
  if (!allowed.has(status)) throw new Error('Invalid message status.');
  if (!(await ensureSchema())) throw new Error('PostgreSQL is not configured.');
  const result = await getPool().query(`
    UPDATE patzcom_contact_messages
    SET status=$1, updated_at=NOW()
    WHERE id=$2 RETURNING *
  `, [status, messageId]);
  return result.rows[0] || null;
}

export async function updateOrderStatus({ reference, providerOrderId, status }) {
  if (!(await ensureSchema())) return null;
  const database = getPool();
  const result = await database.query(`
    UPDATE patzcom_orders
    SET status = $1, provider_order_id = COALESCE($2, provider_order_id), updated_at = NOW()
    WHERE (reference = $3 OR provider_order_id = $2)
      AND NOT refund_in_progress AND status NOT IN ('refunded', 'partially_refunded', 'refund_pending')
    RETURNING *
  `, [status, providerOrderId || null, reference || '']);
  return result.rows[0] || null;
}

export async function setOrderBuyer(id, buyer = {}) {
  if (!(await ensureSchema()) || !id || !buyer) return null;
  const result = await getPool().query(`
    UPDATE patzcom_orders SET
      buyer_email = CASE WHEN $2 <> '' THEN $2 ELSE buyer_email END,
      buyer_name = CASE WHEN $3 <> '' THEN $3 ELSE buyer_name END,
      buyer_phone = CASE WHEN $4 <> '' THEN $4 ELSE buyer_phone END,
      shipping_address = COALESCE($5::jsonb, shipping_address),
      updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, [id, String(buyer.email || '').slice(0, 320), String(buyer.name || '').slice(0, 200), String(buyer.phone || '').slice(0, 50), buyer.address ? JSON.stringify(buyer.address) : null]);
  return result.rows[0] || null;
}

// Atomically claim an email slot so each email is sent at most once.
export async function claimOrderEmail(id, kind) {
  if (!(await ensureSchema())) return null;
  const column = kind === 'shipped' ? 'shipped_email_at' : 'paid_email_at';
  const result = await getPool().query(`UPDATE patzcom_orders SET ${column} = NOW() WHERE id = $1 AND ${column} IS NULL RETURNING *`, [id]);
  return result.rows[0] || null;
}

export async function releaseOrderEmail(id, kind, error) {
  if (!(await ensureSchema())) return;
  const column = kind === 'shipped' ? 'shipped_email_at' : 'paid_email_at';
  await getPool().query(`UPDATE patzcom_orders SET ${column} = NULL, email_error = $2 WHERE id = $1`, [id, String(error || '').slice(0, 1000)]);
}

export async function setOrderSettlement(id, s = {}) {
  if (!(await ensureSchema()) || !id) return null;
  const result = await getPool().query(`
    UPDATE patzcom_orders SET
      capture_id = CASE WHEN $2 <> '' THEN $2 ELSE capture_id END,
      payment_fee = COALESCE($3, payment_fee),
      net_amount = COALESCE($4, net_amount),
      paid_at = COALESCE(paid_at, $5),
      settlement_synced_at = NOW(), updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, [id, String(s.captureId || ''), s.fee ?? null, s.net ?? null, s.paidAt ? new Date(s.paidAt) : null]);
  return result.rows[0] || null;
}

export async function addOrderRefund(id, refund) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is not configured.');
  const result = await getPool().query(`
    UPDATE patzcom_orders SET
      refunds = refunds || $2::jsonb,
      refunded_amount = refunded_amount + $3,
      refund_debit = refund_debit + $4,
      status = CASE WHEN refunded_amount + $3 >= total - 0.005 THEN 'refunded' ELSE 'partially_refunded' END,
      fulfillment_status = CASE WHEN refunded_amount + $3 >= total - 0.005 AND fulfillment_status NOT IN ('shipped','delivered') THEN 'on_hold' ELSE fulfillment_status END,
      updated_at = NOW()
    WHERE id = $1 RETURNING *
  `, [id, JSON.stringify([refund]), refund.amount, refund.debit]);
  return result.rows[0] || null;
}

export async function withPayPalRefundLock(id, action) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is not configured.');
  if (!/^[1-9][0-9]{0,17}$/.test(String(id))) throw new Error('Invalid order ID.');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  let locked = false;
  try {
    const result = await client.query("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked", [`patzcom-refund:${id}`]);
    locked = result.rows[0].locked;
    if (!locked) throw new Error('A refund request for this order is already being processed.');
    return await action();
  } finally {
    if (locked) {
      try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [`patzcom-refund:${id}`]); }
      catch (error) { await client.end(); throw error; }
    }
    await client.end();
  }
}

export async function savePayPalRefundAttempt(id, attempt) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is not configured.');
  const result = await getPool().query(`UPDATE patzcom_orders SET paypal_refund_request=$2::jsonb,
    refund_in_progress=TRUE, status='refund_pending', updated_at=NOW() WHERE id=$1 RETURNING *`, [id, JSON.stringify(attempt)]);
  return result.rows[0];
}

export async function finishPayPalRefundAttempt(id, attempt, refund) {
  if (!(await ensureSchema())) throw new Error('PostgreSQL is not configured.');
  const completed = refund.status === 'COMPLETED';
  const result = await getPool().query(`UPDATE patzcom_orders SET
    refunds=refunds || $3::jsonb,
    refunded_amount=refunded_amount+$4,
    refund_debit=refund_debit+$5,
    status=CASE WHEN refunded_amount+$4>=total-0.005 THEN 'refunded' WHEN refunded_amount+$4>0 THEN 'partially_refunded' ELSE 'paid' END,
    fulfillment_status=CASE WHEN refunded_amount+$4>=total-0.005 AND fulfillment_status NOT IN ('shipped','delivered') THEN 'on_hold' ELSE fulfillment_status END,
    refund_in_progress=FALSE, paypal_refund_request=NULL, updated_at=NOW()
    WHERE id=$1 AND paypal_refund_request->>'requestId'=$2 RETURNING *`,
    [id, attempt.requestId, JSON.stringify([{ ...refund, reason: attempt.reason, by: attempt.by, at: new Date().toISOString() }]), completed ? refund.amount : 0, completed ? refund.debit : 0]);
  if (!result.rows[0]) throw new Error('Refund state changed. Refresh the order.');
  return result.rows[0];
}

export async function getOrderById(id) {
  if (!(await ensureSchema())) return null;
  return (await getPool().query('SELECT * FROM patzcom_orders WHERE id = $1', [id])).rows[0] || null;
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
  if (!(await ensureSchema())) throw new Error('PostgreSQL is required for catalog changes.');
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
