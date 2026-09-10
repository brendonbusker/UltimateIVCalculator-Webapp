import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE, applicationJsonLd } from '../lib/site-config';
import sitemap from '../app/sitemap';

test('canonical and sitemap preserve the real Pages project path', () => {
  const url = new URL(SITE.url);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.host, 'brendonbusker.github.io');
  assert.equal(url.pathname, '/UltimateIVCalculator-Webapp/');
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
  assert.deepEqual(sitemap(), [{ url: SITE.url }]);
});

test('structured data describes the free tool without invented endorsements', () => {
  const data = JSON.parse(JSON.stringify(applicationJsonLd));
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data['@type'], 'WebApplication');
  assert.equal(data.url, SITE.url);
  assert.equal(data.offers.price, 0);
  assert.equal(data.offers['@type'], 'Offer');
  assert.equal(data.isAccessibleForFree, true);
  for (const key of ['aggregateRating', 'review', 'author', 'award']) {
    assert.equal(key in data, false);
  }
});
