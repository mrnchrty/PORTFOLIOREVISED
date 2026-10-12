/**
 * Storefront account-header checks.
 *
 * Loads the real DigiCha and Mochajaki pages in jsdom against a temporary
 * static server and verifies the header account area:
 *   - signed out  -> "Log In | Create Account", one form at a time
 *   - signed in   -> the account image with "My Account" and the profile dashboard
 *
 * The signed-in path is simulated by stubbing window.fetch, so no Supabase
 * project is required. Run with: cd backend && npm install && npm test
 */
const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let JSDOM;
let VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch {
  JSDOM = null;
}

const SHOP_ROOT = path.resolve(__dirname, '..', '..');
const SHOPS = [
  { slug: 'digicha', label: 'DigiCha', page: '/digicha-shop/' },
  { slug: 'mochajaki', label: 'Mochajaki', page: '/mochajaki-shop/' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

let server;
let baseUrl;

before(async () => {
  if (!JSDOM) return;
  server = http.createServer((request, response) => {
    const requested = decodeURIComponent(String(request.url).split('?')[0]);
    let target = path.join(SHOP_ROOT, requested);
    if (target.startsWith(SHOP_ROOT) && fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    if (!target.startsWith(SHOP_ROOT) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': MIME[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
});

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function signedInFetch() {
  return async (url) => {
    const target = String(url);
    if (target.includes('/api/health')) {
      return jsonResponse({
        status: 'ok',
        supabaseProjects: { digicha: true, mochajaki: true },
        supabaseMissingSettings: {},
      });
    }
    if (target.includes('/auth/me')) {
      return jsonResponse({
        user: {
          id: 'user-1',
          email: 'cha@example.com',
          user_metadata: { avatar_url: 'https://cdn.example.com/cha-photo.png' },
        },
        profile: { full_name: 'Maroine Charity De Roy', phone: '0917 000 0000' },
        staff_memberships: [],
      });
    }
    if (target.includes('/dashboard')) {
      return jsonResponse({ profile: { full_name: 'Maroine Charity De Roy', phone: '' }, orders: [], deals: [] });
    }
    if (target.includes('/checkout')) return jsonResponse({ shop: { fulfillment_options: [] }, payment_methods: [] });
    if (target.includes('/deals')) return jsonResponse({ deals: [] });
    return jsonResponse({ products: [], categories: [] });
  };
}

function waitFor(read, timeout = 10000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let value;
      try {
        value = read();
      } catch (error) {
        return reject(error);
      }
      if (value) return resolve(value);
      if (Date.now() - started > timeout) return reject(new Error('Timed out waiting for the storefront to settle.'));
      setTimeout(tick, 40);
    };
    tick();
  });
}

async function openShop(page, { signedIn = false } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  const dom = await JSDOM.fromURL(`${baseUrl}${page}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      // jsdom has no layout engine, so this browser API is missing.
      window.Element.prototype.scrollIntoView = () => {};
      if (signedIn) window.fetch = signedInFetch();
    },
  });
  const { document } = dom.window;
  await waitFor(() => document.querySelector('[data-shop-app]')?.dataset.initialized === 'true');
  await waitFor(() => document.querySelector('#account-session-label'));
  if (signedIn) {
    await waitFor(() => document.querySelector('[data-account-member]')?.hidden === false);
  } else {
    // Let the failed /auth/me request settle so the signed-out state is final.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return { dom, document, errors };
}

for (const shop of SHOPS) {
  test(`${shop.label} shows Log In | Create Account while signed out`, async (t) => {
    if (!JSDOM) return t.skip('jsdom is not installed (run npm install in backend/)');
    const { dom, document } = await openShop(shop.page);
    const guest = document.querySelector('[data-account-guest]');
    const member = document.querySelector('[data-account-member]');

    assert.equal(guest.hidden, false, 'the guest links should be visible');
    assert.equal(member.hidden, true, 'the account chip should stay hidden');
    assert.match(guest.textContent, /Log In/);
    assert.match(guest.textContent, /Create Account/);
    assert.ok(guest.querySelector('.store-account-sep'), 'the two links should be separated by a divider');
    assert.equal(guest.querySelector('[data-auth-mode="login"]').getAttribute('href'), '#account');
    assert.equal(guest.querySelector('[data-auth-mode="register"]').getAttribute('href'), '#account');

    const avatar = document.querySelector('#store-account-avatar');
    assert.match(avatar.getAttribute('src'), /account-avatar-default\.svg$/);
    assert.equal(avatar.getAttribute('alt'), '', 'the chip label already names the link');
    dom.window.close();
  });

  test(`${shop.label} switches between the log-in and create-account forms`, async (t) => {
    if (!JSDOM) return t.skip('jsdom is not installed (run npm install in backend/)');
    const { dom, document } = await openShop(shop.page);
    const forms = document.querySelector('#account-forms');
    const loginForm = document.querySelector('#login-form');
    const registerForm = document.querySelector('#register-form');

    assert.equal(loginForm.hidden, false, 'the log-in form shows first');
    assert.equal(registerForm.hidden, true, 'the create-account form starts hidden');
    assert.equal(forms.dataset.authMode, 'login');

    const registerLink = document.querySelector('[data-account-guest] [data-auth-mode="register"]');
    registerLink.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await waitFor(() => registerForm.hidden === false);
    assert.equal(loginForm.hidden, true, 'only one form is shown at a time');
    assert.equal(forms.dataset.authMode, 'register');

    document.querySelector('#register-form [data-auth-mode="login"]')
      .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await waitFor(() => loginForm.hidden === false);
    assert.equal(registerForm.hidden, true);
    assert.equal(forms.dataset.authMode, 'login');
    dom.window.close();
  });

  test(`${shop.label} shows the account image and opens the profile when signed in`, async (t) => {
    if (!JSDOM) return t.skip('jsdom is not installed (run npm install in backend/)');
    const { dom, document } = await openShop(shop.page, { signedIn: true });
    const guest = document.querySelector('[data-account-guest]');
    const member = document.querySelector('[data-account-member]');
    const dashboard = document.querySelector('#customer-dashboard');

    assert.equal(guest.hidden, true, 'the guest links hide once signed in');
    assert.equal(member.hidden, false, 'the account chip replaces them');
    assert.match(member.textContent, /My Account/);
    assert.equal(document.querySelector('#store-account-avatar').getAttribute('src'), 'https://cdn.example.com/cha-photo.png');
    assert.match(member.title, /Maroine Charity De Roy/);

    assert.equal(dashboard.hidden, false, 'the profile dashboard is revealed');
    assert.equal(document.querySelector('[data-dashboard-avatar]').getAttribute('src'), 'https://cdn.example.com/cha-photo.png');
    assert.match(document.querySelector('#dashboard-welcome').textContent, /Maroine Charity De Roy/);
    assert.equal(document.querySelector('#account-session-label').textContent, 'cha@example.com');
    dom.window.close();
  });

  test(`${shop.label} keeps owner-directed instruction text off the page`, async (t) => {
    if (!JSDOM) return t.skip('jsdom is not installed (run npm install in backend/)');
    const { dom, document } = await openShop(shop.page);
    const text = document.body.textContent;

    assert.equal(document.querySelectorAll('.store-hero-actions').length, 0, 'the hero buttons are gone');
    for (const phrase of [
      /browse the shop/i,
      /owner review/i,
      /before accepting (real |live )?orders/i,
      /you provided/i,
      /backend\/\.env/i,
      /sign in or create an account/i,
    ]) {
      assert.doesNotMatch(text, phrase, `"${phrase}" should not appear on the shop page`);
    }
    dom.window.close();
  });
}
