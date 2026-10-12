const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const {
  createAuthClient,
  getAuthCookieNames,
  getSupabase,
  missingSupabaseSettings,
  saveAuthCookies,
  supabaseIsConfigured,
} = require('../services/supabase');

const configKeys = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DIGICHA_SUPABASE_URL',
  'DIGICHA_SUPABASE_ANON_KEY',
  'DIGICHA_SUPABASE_SERVICE_ROLE_KEY',
];
const savedEnvironment = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));

after(() => {
  for (const key of configKeys) {
    if (savedEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnvironment[key];
  }
});

test('the DigiCha shop reports which settings are still missing', () => {
  for (const key of configKeys) delete process.env[key];
  assert.equal(supabaseIsConfigured(), false);
  assert.deepEqual(missingSupabaseSettings('digicha'), [
    'SUPABASE_URL or DIGICHA_SUPABASE_URL',
    'SUPABASE_ANON_KEY or DIGICHA_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY or DIGICHA_SUPABASE_SERVICE_ROLE_KEY',
  ]);
});

test('copied example placeholders never count as configured', () => {
  for (const key of configKeys) delete process.env[key];
  process.env.DIGICHA_SUPABASE_URL = 'https://YOUR-DIGICHA-PROJECT-REF.supabase.co';
  process.env.DIGICHA_SUPABASE_ANON_KEY = 'replace_with_digicha_public_anon_or_publishable_key';
  process.env.DIGICHA_SUPABASE_SERVICE_ROLE_KEY = 'replace_with_digicha_server_only_service_role_key';
  assert.equal(supabaseIsConfigured('digicha'), false);
  assert.equal(missingSupabaseSettings('digicha').length, 3);
});

test('shop-specific settings take precedence over the shared ones', () => {
  for (const key of configKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://shared-test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'shared-public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'shared-server-test-key';
  process.env.DIGICHA_SUPABASE_URL = 'https://digicha-test.supabase.co';
  process.env.DIGICHA_SUPABASE_ANON_KEY = 'digicha-public-test-key';
  process.env.DIGICHA_SUPABASE_SERVICE_ROLE_KEY = 'digicha-server-test-key';

  assert.equal(supabaseIsConfigured('digicha'), true);
  assert.deepEqual(missingSupabaseSettings('digicha'), []);
  assert.equal(getSupabase('digicha').supabaseUrl, process.env.DIGICHA_SUPABASE_URL);
  assert.equal(createAuthClient('digicha').supabaseUrl, process.env.DIGICHA_SUPABASE_URL);
});

test('shared Supabase settings configure the shop when no specific ones are set', () => {
  for (const key of configKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://shared-test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'shared-public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'shared-server-test-key';

  assert.equal(supabaseIsConfigured(), true);
  assert.equal(supabaseIsConfigured('digicha'), true);
  assert.equal(getSupabase('digicha').supabaseUrl, process.env.SUPABASE_URL);
  assert.equal(createAuthClient('digicha').supabaseUrl, process.env.SUPABASE_URL);
  assert.deepEqual(missingSupabaseSettings('digicha'), []);
});

test('an unconfigured shop fails loudly instead of borrowing credentials', () => {
  for (const key of configKeys) delete process.env[key];
  assert.throws(
    () => getSupabase('digicha'),
    (error) => error.status === 503 && error.message.includes('SUPABASE_URL'),
  );
});

test('shop sessions use a shop-scoped cookie name', () => {
  assert.deepEqual(getAuthCookieNames('digicha'), {
    access: 'cha-shop-digicha-access',
    refresh: 'cha-shop-digicha-refresh',
  });

  const writtenNames = [];
  const response = { cookie: (name) => writtenNames.push(name) };
  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
  };
  saveAuthCookies(response, session, 'digicha');

  assert.deepEqual(writtenNames, ['cha-shop-digicha-access', 'cha-shop-digicha-refresh']);
});
