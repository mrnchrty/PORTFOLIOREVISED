#!/usr/bin/env node
/**
 * One-command integration check: boots the stand-in database and the real API,
 * then walks the whole shop loop over HTTP — health, catalog, deals, sign-in,
 * quote with a promo code, order placement, dashboard read-back, the admin
 * gate, an admin order-status write, and the cross-site write guard.
 *
 *   npm run test:integration
 *
 * It needs no Supabase account, no browser, and no network beyond localhost.
 * Exit code 0 means every step passed. It is intentionally NOT part of
 * `npm test` (which must stay runnable without spawning servers).
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const DB_PORT = 9210;
const API_PORT = 9211;
const API = `http://localhost:${API_PORT}`;
const ORIGIN_OK = { Origin: `http://localhost:${API_PORT}` };
const ORIGIN_EVIL = { Origin: 'https://evil.example' };

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? '  ok ' : 'FAIL '} ${name}${condition || !detail ? '' : `  — ${detail}`}`);
}

function startProcess(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  return child;
}

async function waitForHttp(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`${url} did not come up`);
}

async function main() {
  const db = startProcess('fake-db', process.execPath, ['tests/support/fake-supabase.js', String(DB_PORT)]);
  const api = startProcess('api', process.execPath, ['server.js'], {
    PORT: String(API_PORT),
    NODE_ENV: 'development',
    ALLOW_SAMPLE_ORDERS: 'true',
    SUPABASE_URL: `http://localhost:${DB_PORT}`,
    SUPABASE_ANON_KEY: 'integration-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'integration-service-role-key',
  });

  const stop = () => { db.kill('SIGTERM'); api.kill('SIGTERM'); };
  process.on('exit', stop);

  try {
    await waitForHttp(`http://localhost:${DB_PORT}/rest/v1/shops`);
    await waitForHttp(`${API}/api/health`);

    // 1. health reports a configured project
    const health = await (await fetch(`${API}/api/health`)).json();
    check('health reports supabaseConfigured', health.supabaseConfigured === true);

    // 2. the catalog comes from the database
    const catalog = await (await fetch(`${API}/api/shops/digicha/products`)).json();
    const names = (catalog.products || []).map((product) => product.name);
    check('catalog lists the stand-in products', names.includes('TEST-DB Vinyl Sticker') && names.includes('TEST-DB Mug'), names.join(', '));

    // 3. the deals feed carries the seeded promotion
    const deals = await (await fetch(`${API}/api/shops/digicha/deals`)).json();
    check('deals feed carries LAUNCH10', (deals.deals || []).some((deal) => deal.code === 'LAUNCH10'));

    // 4. an unknown shop is a 404
    check('unknown shop slug answers 404', (await fetch(`${API}/api/shops/unknown/products`)).status === 404);

    // 5. a cross-site write is refused
    const crossSite = await fetch(`${API}/api/shops/digicha/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ORIGIN_EVIL },
      body: JSON.stringify({ email: 'owner@example.com', password: 'pw' }),
    });
    check('cross-site login attempt answers 403', crossSite.status === 403);

    // 6. a same-origin sign-in works and sets the session cookies
    const login = await fetch(`${API}/api/shops/digicha/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ORIGIN_OK },
      body: JSON.stringify({ email: 'owner@example.com', password: 'pw' }),
    });
    const loginBody = await login.json();
    const cookies = (login.headers.getSetCookie?.() || [])
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
    check('sign-in answers 200 authenticated', login.status === 200 && loginBody.authenticated === true);
    check('sign-in sets the session cookies', cookies.includes('cha-shop-digicha-access'));
    const asUser = { 'Content-Type': 'application/json', Cookie: cookies, ...ORIGIN_OK };

    // 7. the session resolves
    const me = await fetch(`${API}/api/shops/digicha/auth/me`, { headers: { Cookie: cookies } });
    check('auth/me answers 200 with the session cookie', me.status === 200);

    // 8. the quote applies the promo code server-side
    const items = [{ productId: 'aaaaaaa1-0000-4000-8000-000000000002', quantity: 2, options: {} }];
    const quote = await (await fetch(`${API}/api/shops/digicha/quote`, {
      method: 'POST', headers: asUser, body: JSON.stringify({ items, promoCode: 'LAUNCH10' }),
    })).json();
    check('quote applies LAUNCH10 (500 - 50 = 450)', quote.subtotal === 500 && quote.discount === 50 && quote.total === 450,
      JSON.stringify(quote));

    // 9. the order saves with the discount
    const orderResponse = await fetch(`${API}/api/shops/digicha/orders`, {
      method: 'POST',
      headers: asUser,
      body: JSON.stringify({
        customerName: 'Integration Check', customerContact: '0900 000 0000',
        fulfillmentMethod: 'pickup', fulfillmentDetails: '', paymentMethod: 'gcash',
        promoCode: 'LAUNCH10', items,
      }),
    });
    const orderBody = await orderResponse.json();
    const order = orderBody.order || {};
    check('order answers 201 with the discount applied', orderResponse.status === 201 && order.discount === 50 && order.total === 450,
      `status ${orderResponse.status}, ${JSON.stringify(order).slice(0, 120)}`);

    // 10. the dashboard reads the order back out of the database
    const dashboard = await (await fetch(`${API}/api/shops/digicha/dashboard`, { headers: { Cookie: cookies } })).json();
    const listed = (dashboard.orders || []).some((entry) => entry.order_number === order.order_number);
    check('dashboard lists the saved order', listed, `looking for ${order.order_number}`);

    // 11. the admin overview is gated, then opens for the staff account
    check('admin overview signed out answers 401', (await fetch(`${API}/api/admin/shops/digicha/overview`)).status === 401);
    const overview = await fetch(`${API}/api/admin/shops/digicha/overview`, { headers: { Cookie: cookies } });
    check('admin overview for the staff account answers 200', overview.status === 200);

    // 12. an admin order-status write lands in the database
    const statusPatch = await fetch(`${API}/api/admin/shops/digicha/orders/${order.id}/status`, {
      method: 'PATCH', headers: asUser, body: JSON.stringify({ status: 'confirmed' }),
    });
    const patched = await statusPatch.json();
    check('admin order-status write answers 200 confirmed', statusPatch.status === 200 && patched.order?.status === 'confirmed');
  } catch (error) {
    check(`unexpected error: ${error.message}`, false);
  } finally {
    stop();
  }

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length} of ${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main();
