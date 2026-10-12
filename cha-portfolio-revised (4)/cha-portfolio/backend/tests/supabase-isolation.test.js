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
  'MOCHAJAKI_SUPABASE_URL',
  'MOCHAJAKI_SUPABASE_ANON_KEY',
  'MOCHAJAKI_SUPABASE_SERVICE_ROLE_KEY',
];
const savedEnvironment = Object.fromEntries(configKeys.map((key) => [key, process.env[key]]));

after(() => {
  for (const key of configKeys) {
    if (savedEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnvironment[key];
  }
});

test('shop clients remain isolated when configured separately', () => {
  for (const key of configKeys) delete process.env[key];
  assert.equal(supabaseIsConfigured(), false);
  assert.deepEqual(missingSupabaseSettings('digicha'), [
    'SUPABASE_URL or DIGICHA_SUPABASE_URL',
    'SUPABASE_ANON_KEY or DIGICHA_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY or DIGICHA_SUPABASE_SERVICE_ROLE_KEY',
  ]);
  assert.deepEqual(missingSupabaseSettings('mochajaki'), [
    'SUPABASE_URL or MOCHAJAKI_SUPABASE_URL',
    'SUPABASE_ANON_KEY or MOCHAJAKI_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY or MOCHAJAKI_SUPABASE_SERVICE_ROLE_KEY',
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
  assert.equal(supabaseIsConfigured('mochajaki'), false);
  assert.deepEqual(missingSupabaseSettings('mochajaki'), [
    'SUPABASE_URL or MOCHAJAKI_SUPABASE_URL',
    'SUPABASE_ANON_KEY or MOCHAJAKI_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY or MOCHAJAKI_SUPABASE_SERVICE_ROLE_KEY',
  ]);
  assert.equal(supabaseIsConfigured(), false);
  assert.throws(
    () => getSupabase('mochajaki'),
    (error) => error.status === 503 && error.message.includes('MOCHAJAKI_SUPABASE_URL'),
    'Mochajaki must not silently fall back to DigiCha credentials',
  );

  process.env.MOCHAJAKI_SUPABASE_URL = 'https://mochajaki-test.supabase.co';
  process.env.MOCHAJAKI_SUPABASE_ANON_KEY = 'mochajaki-public-test-key';
  process.env.MOCHAJAKI_SUPABASE_SERVICE_ROLE_KEY = 'mochajaki-server-test-key';

  const digiDatabase = getSupabase('digicha');
  const mochaDatabase = getSupabase('mochajaki');
  assert.notEqual(digiDatabase, mochaDatabase);
  assert.equal(digiDatabase.supabaseUrl, process.env.DIGICHA_SUPABASE_URL);
  assert.equal(mochaDatabase.supabaseUrl, process.env.MOCHAJAKI_SUPABASE_URL);
  assert.equal(createAuthClient('digicha').supabaseUrl, process.env.DIGICHA_SUPABASE_URL);
  assert.equal(createAuthClient('mochajaki').supabaseUrl, process.env.MOCHAJAKI_SUPABASE_URL);
  assert.equal(supabaseIsConfigured(), true);
  assert.deepEqual(missingSupabaseSettings('digicha'), []);
  assert.deepEqual(missingSupabaseSettings('mochajaki'), []);
});

test('shared Supabase settings configure both shops', () => {
  for (const key of configKeys) delete process.env[key];
  process.env.SUPABASE_URL = 'https://shared-test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'shared-public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'shared-server-test-key';

  assert.equal(supabaseIsConfigured(), true);
  assert.equal(getSupabase('digicha').supabaseUrl, process.env.SUPABASE_URL);
  assert.equal(getSupabase('mochajaki').supabaseUrl, process.env.SUPABASE_URL);
  assert.equal(createAuthClient('digicha').supabaseUrl, process.env.SUPABASE_URL);
  assert.equal(createAuthClient('mochajaki').supabaseUrl, process.env.SUPABASE_URL);
});

test('shop sessions use separate cookie names', () => {
  const digichaCookies = getAuthCookieNames('digicha');
  const mochajakiCookies = getAuthCookieNames('mochajaki');
  assert.notDeepEqual(digichaCookies, mochajakiCookies);

  const writtenNames = [];
  const response = { cookie: (name) => writtenNames.push(name) };
  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
  };
  saveAuthCookies(response, session, 'digicha');
  saveAuthCookies(response, session, 'mochajaki');

  assert.deepEqual(writtenNames, [
    'cha-shop-digicha-access',
    'cha-shop-digicha-refresh',
    'cha-shop-mochajaki-access',
    'cha-shop-mochajaki-refresh',
  ]);
});
