const assert = require('node:assert/strict');
const { after, beforeEach, test } = require('node:test');
const { requireSameOriginForMutations } = require('../middleware/same-origin');

// The middleware is exercised directly with a request stub, so no server or credentials are needed.
function requestFor({ method = 'POST', host = 'shop.example.test', protocol = 'https', headers = {} } = {}) {
  const lowered = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    method,
    protocol,
    get(name) {
      const key = String(name).toLowerCase();
      if (key === 'host') return host;
      return lowered[key];
    },
  };
}

function run(request) {
  let outcome = null;
  const response = {
    status(code) {
      return {
        json(body) {
          outcome = { code, body };
          return outcome;
        },
      };
    },
  };
  let passed = false;
  requireSameOriginForMutations(request, response, () => {
    passed = true;
  });
  return passed ? { passed: true } : outcome;
}

const savedFrontendOrigin = process.env.FRONTEND_ORIGIN;
beforeEach(() => {
  delete process.env.FRONTEND_ORIGIN;
});
after(() => {
  if (savedFrontendOrigin === undefined) delete process.env.FRONTEND_ORIGIN;
  else process.env.FRONTEND_ORIGIN = savedFrontendOrigin;
});

test('a read request is never blocked', () => {
  const result = run(requestFor({ method: 'GET' }));
  assert.deepEqual(result, { passed: true });
});

test('a matching Origin header is accepted', () => {
  const result = run(requestFor({ headers: { origin: 'https://shop.example.test' } }));
  assert.deepEqual(result, { passed: true });
});

test('Chrome omits Origin on same-origin POSTs, so Sec-Fetch-Site is accepted', () => {
  const result = run(requestFor({ headers: { 'sec-fetch-site': 'same-origin' } }));
  assert.deepEqual(result, { passed: true });
});

test('a direct navigation form post (Sec-Fetch-Site: none) is accepted', () => {
  const result = run(requestFor({ headers: { 'sec-fetch-site': 'none' } }));
  assert.deepEqual(result, { passed: true });
});

test('with no Origin, a same-host Referer is accepted', () => {
  const result = run(requestFor({ headers: { referer: 'https://shop.example.test/digicha-shop/' } }));
  assert.deepEqual(result, { passed: true });
});

test('a cross-site POST carrying its own Origin is rejected', () => {
  const result = run(requestFor({ headers: { origin: 'https://attacker.example' } }));
  assert.equal(result.code, 403);
  assert.equal(result.body.error, 'Cross-origin requests are not allowed.');
});

test('a request with no browser signal at all is rejected', () => {
  const result = run(requestFor());
  assert.equal(result.code, 403);
  assert.equal(result.body.error, 'This request needs a same-origin browser session.');
});

test('a cross-site fetch is rejected even without an Origin header', () => {
  const result = run(requestFor({ headers: { 'sec-fetch-site': 'cross-site', referer: 'https://attacker.example/x' } }));
  assert.equal(result.code, 403);
});

test('a Referer from another host is rejected', () => {
  const result = run(requestFor({ headers: { referer: 'https://attacker.example/x' } }));
  assert.equal(result.code, 403);
});

test('a Referer with the right host but the wrong protocol is rejected', () => {
  const result = run(requestFor({ headers: { referer: 'http://shop.example.test/x' } }));
  assert.equal(result.code, 403);
});

test('a malformed Origin is rejected', () => {
  const result = run(requestFor({ headers: { origin: 'not a url' } }));
  assert.equal(result.code, 403);
  assert.equal(result.body.error, 'Request origin is not valid.');
});

test('FRONTEND_ORIGIN is accepted for a split deployment', () => {
  process.env.FRONTEND_ORIGIN = 'https://app.example.test';
  const result = run(requestFor({ headers: { origin: 'https://app.example.test' } }));
  assert.deepEqual(result, { passed: true });
});

test('FRONTEND_ORIGIN does not open the door to other origins', () => {
  process.env.FRONTEND_ORIGIN = 'https://app.example.test';
  const result = run(requestFor({ headers: { origin: 'https://attacker.example' } }));
  assert.equal(result.code, 403);
});
