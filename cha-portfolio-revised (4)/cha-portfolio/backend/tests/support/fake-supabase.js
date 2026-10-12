#!/usr/bin/env node
/**
 * A stand-in for Supabase, for developing and testing this shop without a real project.
 *
 * It implements the slice of PostgREST (`/rest/v1`) and GoTrue (`/auth/v1`) that the Express
 * backend actually calls, over an in-memory dataset. Nothing here ships to production and nothing
 * here changes how the real API behaves — it is a local stand-in for the owner's Supabase project.
 *
 * Start it, point the API at it, and the storefront behaves as if Supabase were configured:
 *
 *   node tests/support/fake-supabase.js            # listens on 9100
 *   SUPABASE_URL=http://localhost:9100 \
 *   SUPABASE_ANON_KEY=demo-anon-key \
 *   SUPABASE_SERVICE_ROLE_KEY=demo-service-role-key \
 *   ALLOW_SAMPLE_ORDERS=true npm start             # the real API, against the stand-in
 *
 * Sign in with any email and any non-empty password. The data resets when the process restarts.
 * It is deliberately not wired into `npm test`, which must keep running without a server.
 */
'use strict';

const http = require('http');
const { randomUUID } = require('crypto');

const PORT = Number(process.argv[2] || process.env.FAKE_SUPABASE_PORT || 9100);

const SHOP_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const USER_EMAIL = 'owner@example.com';

const iso = () => new Date().toISOString();

// Product option groups use the same shape as database/seed-digicha.sql.
const PRODUCTS = [
  {
    id: 'aaaaaaa1-0000-4000-8000-000000000001',
    shop_id: SHOP_ID,
    category_id: CATEGORY_ID,
    name: 'TEST-DB Vinyl Sticker',
    slug: 'test-db-vinyl-sticker',
    description: 'A product that exists only in the stand-in database.',
    price: 123.45,
    available: true,
    is_active: true,
    is_sample: false,
    is_featured: true,
    image_url: '',
    display_order: 1,
    created_at: iso(),
    options: [
      {
        id: 'size', label: 'Size', type: 'single', required: true, min_selected: 1, max_selected: 1,
        values: [
          { id: 'mini', label: 'Mini', price_delta: 0, display_price: 123.45 },
          { id: 'large', label: 'Large', price_delta: 40, display_price: 163.45 },
        ],
      },
    ],
  },
  {
    id: 'aaaaaaa1-0000-4000-8000-000000000002',
    shop_id: SHOP_ID,
    category_id: CATEGORY_ID,
    name: 'TEST-DB Mug',
    slug: 'test-db-mug',
    description: 'A second product from the stand-in database.',
    price: 250,
    available: true,
    is_active: true,
    is_sample: false,
    is_featured: false,
    image_url: '',
    display_order: 2,
    created_at: iso(),
    options: [],
  },
];

const tables = {
  shops: [{
    id: SHOP_ID, slug: 'digicha', name: 'DigiCha',
    description: 'Custom printing and personalized gifts.',
    currency: 'PHP', is_demo: true, is_active: true,
    fulfillment_options: [
      { id: 'pickup', label: 'Pickup at the shop', enabled: true },
      { id: 'meetup', label: 'Meet-up (Batangas)', enabled: true },
    ],
    payment_methods: [
      { id: 'gcash', label: 'GCash', enabled: true, instructions: 'Pay on pickup.' },
      { id: 'other', label: 'Other', enabled: true },
    ],
    created_at: iso(), updated_at: iso(),
  }],
  categories: [{ id: CATEGORY_ID, shop_id: SHOP_ID, name: 'Stickers', slug: 'stickers', sort_order: 1, is_active: true, created_at: iso() }],
  products: PRODUCTS,
  promotions: [],
  profiles: [{ id: USER_ID, full_name: 'Test Owner', phone: '0900 000 0000', created_at: iso(), updated_at: iso() }],
  staff_members: [{ id: '44444444-4444-4444-8444-444444444444', user_id: USER_ID, shop_id: SHOP_ID, role: 'admin', is_active: true, created_at: iso() }],
  orders: [],
  order_items: [],
  promotion_redemptions: [],
};

const user = {
  id: USER_ID, aud: 'authenticated', role: 'authenticated', email: USER_EMAIL,
  email_confirmed_at: iso(), phone: '',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Test Owner' }, identities: [], created_at: iso(), updated_at: iso(),
  is_anonymous: false,
};

// ------------------------------------------------------------------ PostgREST helpers

const EMBEDDED = { categories: 'category_id', order_items: 'order_id', shops: 'shop_id' };

function splitTop(text) {
  const parts = [];
  let depth = 0;
  let buffer = '';
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { parts.push(buffer); buffer = ''; } else { buffer += char; }
  }
  parts.push(buffer);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    if (value.startsWith('eq.')) {
      const want = value.slice(3).toLowerCase();
      out = out.filter((row) => String(row[key]).toLowerCase() === want);
    } else if (value.startsWith('neq.')) {
      const want = value.slice(4).toLowerCase();
      out = out.filter((row) => String(row[key]).toLowerCase() !== want);
    } else if (value.startsWith('in.(')) {
      const wants = value.slice(4, -1).split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      out = out.filter((row) => wants.includes(String(row[key])));
    } else if (value.startsWith('is.')) {
      const want = value.slice(3).toLowerCase();
      out = out.filter((row) => (
        (want === 'null' && row[key] === null)
        || (want === 'true' && row[key] === true)
        || (want === 'false' && row[key] === false)
      ));
    }
  }
  return out;
}

function project(rows, select) {
  if (!select || select.trim() === '*') return rows;
  return rows.map((row) => {
    const out = {};
    for (const part of splitTop(select)) {
      const embedded = /^([a-z_][a-z0-9_]*)\s*\((.*)\)$/s.exec(part);
      if (embedded) {
        const [relation, inner] = [embedded[1], embedded[2]];
        const foreignKey = EMBEDDED[relation];
        if (tables[relation] && foreignKey && row[foreignKey]) {
          const nested = project(tables[relation].filter((r) => String(r.id) === String(row[foreignKey])), inner);
          out[relation] = nested[0] || null;
        }
        continue;
      }
      const name = part.split(':')[0].trim();
      if (name in row) out[name] = row[name];
    }
    return out;
  });
}

// ------------------------------------------------------------------ RPC stand-ins

function unitPrice(product, options) {
  let price = Number(product.price);
  for (const group of product.options || []) {
    const chosen = (options || {})[group.id];
    for (const value of group.values || []) {
      if (value.id === chosen) price += Number(value.price_delta || 0);
    }
  }
  return price;
}

function quote(body) {
  let subtotal = 0;
  for (const item of body.p_items || []) {
    const product = tables.products.find((p) => String(p.id) === String(item.productId || item.product_id));
    if (!product) continue;
    subtotal += unitPrice(product, item.options || item.selectedOptions || item.selected_options) * Number(item.quantity || 0);
  }
  subtotal = Math.round(subtotal * 100) / 100;
  return [{
    quote_subtotal: subtotal,
    quote_discount: 0,
    quote_total: subtotal,
    applied_promotion_id: null,
    applied_promotion_name: null,
    applied_coupon_code: null,
  }];
}

function createOrder(body) {
  let subtotal = 0;
  const lines = [];
  for (const item of body.p_items || []) {
    const product = tables.products.find((p) => String(p.id) === String(item.productId || item.product_id));
    if (!product) continue;
    const unit = unitPrice(product, item.options || {});
    const quantity = Number(item.quantity || 0);
    subtotal += unit * quantity;
    lines.push({ product, quantity, unit });
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const id = randomUUID();
  const orderNumber = `DC-${1000 + tables.orders.length + 1}`;

  tables.orders.push({
    id, shop_id: body.p_shop_id, customer_id: body.p_customer_id, order_number: orderNumber,
    customer_name: body.p_customer_name, customer_email: body.p_customer_email,
    customer_contact: body.p_customer_contact, fulfillment_method: body.p_fulfillment_method,
    fulfillment_details: body.p_fulfillment_details, payment_method: body.p_payment_method,
    promo_code: body.p_promo_code, subtotal, discount: 0, total: subtotal, currency: 'PHP',
    status: 'pending', payment_status: 'unpaid', is_test_order: Boolean(body.p_allow_sample),
    created_at: iso(), updated_at: iso(),
  });
  for (const line of lines) {
    tables.order_items.push({
      id: randomUUID(), order_id: id, product_id: line.product.id, product_name: line.product.name,
      base_unit_price: Number(line.product.price), unit_price: line.unit, quantity: line.quantity,
      line_total: Math.round(line.unit * line.quantity * 100) / 100, selected_options: {}, created_at: iso(),
    });
  }

  // Mirrors the eight columns create_shop_order() RETURNS TABLE declares.
  return [{
    created_order_id: id,
    created_order_number: orderNumber,
    created_subtotal: subtotal,
    created_discount: 0,
    created_total: subtotal,
    created_status: 'pending',
    created_payment_status: 'unpaid',
    created_promotion_name: null,
  }];
}

// ------------------------------------------------------------------ server

function send(response, status, payload, extraHeaders = {}) {
  const body = payload === null || payload === undefined ? '' : JSON.stringify(payload);
  response.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...extraHeaders });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
  });
}

const wantsObject = (request) => String(request.headers.accept || '').includes('application/vnd.pgrst.object+json');

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const params = [...url.searchParams.entries()];
  const select = url.searchParams.get('select') || '*';

  if (request.method === 'GET' && url.pathname === '/auth/v1/user') {
    const authorization = String(request.headers.authorization || '');
    if (authorization.includes('Bearer')) return send(response, 200, user);
    return send(response, 401, { message: 'invalid claim: missing sub claim' });
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/token') {
    const body = await readBody(request);
    if (url.searchParams.get('grant_type') === 'password' && body.password) {
      return send(response, 200, {
        access_token: 'fake-access-token', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake-refresh-token', user,
      });
    }
    return send(response, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/signup') {
    const body = await readBody(request);
    return send(response, 200, { ...user, email: body.email || USER_EMAIL });
  }

  if (request.method === 'POST' && url.pathname === '/auth/v1/logout') return send(response, 204, null);

  const rpcMatch = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
  if (request.method === 'POST' && rpcMatch) {
    const body = await readBody(request);
    if (rpcMatch[1] === 'quote_shop_cart') return send(response, 200, quote(body));
    if (rpcMatch[1] === 'create_shop_order') return send(response, 200, createOrder(body));
    return send(response, 404, { message: `function ${rpcMatch[1]} not found` });
  }

  const tableMatch = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
  if (tableMatch && tables[tableMatch[1]]) {
    const table = tables[tableMatch[1]];

    if (request.method === 'GET') {
      let rows = applyFilters(table.map((row) => ({ ...row })), params);
      for (const [, value] of params.filter(([key]) => key === 'order')) {
        const [column, direction] = value.split('.');
        rows.sort((a, b) => String(a[column] ?? '').localeCompare(String(b[column] ?? '')) * (direction.startsWith('desc') ? -1 : 1));
      }
      const limit = params.find(([key]) => key === 'limit');
      if (limit) rows = rows.slice(0, Number(limit[1]));
      rows = project(rows, select);
      if (wantsObject(request)) {
        if (!rows.length) {
          return send(response, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'Results contain 0 rows' });
        }
        return send(response, 200, rows[0]);
      }
      return send(response, 200, rows, { 'Content-Range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` });
    }

    if (request.method === 'POST') {
      const body = await readBody(request);
      const incoming = Array.isArray(body) ? body : [body];
      for (const row of incoming) {
        if (!row.id) row.id = randomUUID();
        table.push(row);
      }
      return send(response, 201, wantsObject(request) ? incoming[0] : []);
    }

    if (request.method === 'PATCH') {
      const body = await readBody(request);
      const matched = new Set(applyFilters([...table], params).map((row) => row.id));
      for (const row of table) {
        if (matched.has(row.id)) Object.assign(row, body, { updated_at: iso() });
      }
      const updated = project(table.filter((row) => matched.has(row.id)), select);
      return send(response, 200, wantsObject(request) ? (updated[0] || {}) : updated);
    }
  }

  send(response, 404, { message: `not found: ${request.method} ${url.pathname}` });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fake Supabase listening on http://0.0.0.0:${PORT}`);
  console.log(`  shop   ${SHOP_ID} (digicha)`);
  console.log(`  sign in with ${USER_EMAIL} and any password`);
  console.log('  the stand-in data resets when this process restarts');
});
