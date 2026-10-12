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

test('the shop client rejects copied placeholder values', () => {
  for (const key of configKeys) delete process.env[key];
  assert.equal(supabaseIsConfigured(), false);
  assert.deepEqual(missingSupabaseSettings('digicha'), [
    'SUPABASE_URL or DIGICHA_SUPABASE_URL',
    'SUPABASE_ANON_KEY or DIGICHA_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY or DIGICHA_SUPABASE_SERVICE_ROLE_KEY',
  ]);
  process.env.DIGICHA_SUPABASE_URL = 'https://YOUR-DIGICHA-PROJECT-REF.supabase.co';
  process.env.DIGICHA_SUPABASE_ANON_KEY = 'replace_with_digicha_public_anon_or_publishable_key';
  process.env.DIGICHA_SUPABASE_SERVICE_ROLE_KEY = 'replace_with_digicha_server_only_service_role_key';
  assert.equal(supabaseIsConfigured('digicha'), false, 'copied example placeholders must not look configured');

  process.env.DIGICHA_SUPABASE_URL = 'https://digicha-test.supabase.co';
  process.env.DIGICHA_SUPABASE_ANON_KEY = 'digicha-public-test-key';
  process.env.DIGICHA_SUPABASE_SERVICE_ROLE_KEY = 'digicha-server-test-key';

  assert.equal(supabaseIsConfigured('digicha'), true);
  assert.deepEqual(missingSupabaseSettings('digicha'), []);
  assert.equal(supabaseIsConfigured(), true, 'DigiCha is now the only shop, so the global check follows it');
});

test('an unknown shop slug is rejected rather than defaulting to the configured shop', () => {
  for (const key of configKeys) delete process.env[key];
  process.env.DIGICHA_SUPABASE_URL = 'https://digicha-test.supabase.co';
  process.env.DIGICHA_SUPABASE_ANON_KEY = 'digicha-public-test-key';
  process.env.DIGICHA_SUPABASE_SERVICE_ROLE_KEY = 'digicha-server-test-key';

  const digiDatabase = getSupabase('digicha');
  assert.equal(digiDatabase.supabaseUrl, process.env.DIGICHA_SUPABASE_URL);
  assert.equal(createAuthClient('digicha').supabaseUrl, process.env.DIGICHA_SUPABASE_URL);
  // a storefront slug that is no longer part of the project must 404, never fall back
  assert.throws(
    () => getSupabase('removed-shop'),
    (error) => error.status === 404,
    'a shop slug that no longer exists must 404, never fall back to another shop',
  );
});

test('shared Supabase settings configure the shop', () => {
  for (const key of configKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://shared-test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'shared-public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'shared-server-test-key';

  assert.equal(supabaseIsConfigured(), true);
  assert.equal(getSupabase('digicha').supabaseUrl, process.env.SUPABASE_URL);
  assert.equal(createAuthClient('digicha').supabaseUrl, process.env.SUPABASE_URL);
  assert.deepEqual(missingSupabaseSettings('digicha'), []);
});

test('shop sessions use shop-scoped cookie names', () => {
  const digichaCookies = getAuthCookieNames('digicha');
  assert.deepEqual(digichaCookies, {
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

  assert.deepEqual(writtenNames, [
    'cha-shop-digicha-access',
    'cha-shop-digicha-refresh',
  ]);
});
