const assert = require('node:assert/strict');
const test = require('node:test');
const { dirname, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const configPath = require.resolve('../../next-sitemap.config.js');

function loadConfig(siteUrl, legacyUrl) {
  const previousSite = process.env.SITE_URL;
  const previousLegacy = process.env.NEXT_PUBLIC_APP_URL;
  try {
    if (siteUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = siteUrl;
    if (legacyUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = legacyUrl;
    delete require.cache[configPath];
    return require(configPath);
  } finally {
    if (previousSite === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousSite;
    if (previousLegacy === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousLegacy;
    delete require.cache[configPath];
  }
}

test('SITE_URL is the sole configured sitemap origin', () => {
  const config = loadConfig('https://current.example', 'https://old.example');
  assert.equal(config.siteUrl, 'https://current.example');
  assert.equal(loadConfig(undefined, 'https://old.example').siteUrl, 'http://localhost:3000');
  assert.throws(() => loadConfig('https://current.example/private'), /SITE_URL/);
  assert.throws(() => loadConfig('not-a-url'), /SITE_URL/);
});

test('localized private and Auth routes stay out of the sitemap', async () => {
  const config = loadConfig('https://current.example');
  for (const path of [
    '/es/dashboard',
    '/fr/dashboard/account',
    '/en/auth/callback',
    '/pt/login',
    '/signup',
    '/es/forgot-password',
    '/fr/reset-password',
    '/en/confirmation',
  ]) {
    assert.equal(await config.transform(config, path), null, path);
  }
  assert.equal((await config.transform(config, '/es/pricing')).loc, '/es/pricing');
  assert.equal((await config.transform(config, '/pt/legal/privacy')).loc, '/pt/legal/privacy');
});

test('dynamic locale manifests still emit public pages in every locale', async () => {
  const builderPath = resolve(
    dirname(require.resolve('next-sitemap')),
    '../esm/builders/url-set-builder.js',
  );
  const { UrlSetBuilder } = await import(pathToFileURL(builderPath).href);
  const config = loadConfig('https://current.example');
  const urls = await new UrlSetBuilder(config, {
    build: { pages: { '/[locale]': [], '/[locale]/pricing': [] } },
    preRender: { routes: {}, notFoundRoutes: [] },
    routes: {},
  }).createUrlSet();
  const locations = urls.map((entry) => entry.loc);
  assert.equal(locations.length, 28);
  assert.equal(new Set(locations).size, 28);
  for (const locale of ['en', 'es', 'pt', 'fr']) {
    for (const suffix of [
      '',
      '/product',
      '/solutions',
      '/pricing',
      '/contact',
      '/legal/terms',
      '/legal/privacy',
    ]) {
      assert.ok(locations.includes(`https://current.example/${locale}${suffix}`));
    }
  }
  assert.ok(
    locations.every((loc) => !/dashboard|login|signup|confirmation|reset-password/.test(loc)),
  );
});
