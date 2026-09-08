import { test } from 'node:test';
import assert from 'node:assert/strict';
test('Pages data URLs retain the repository base path', async () => {
  process.env.NEXT_PUBLIC_BASE_PATH = '/UltimateIVCalculator-Webapp/';
  const { withBasePath } = await import('../lib/app-config');
  assert.equal(
    withBasePath('/pages-data/searchable-pokemon.json'),
    '/UltimateIVCalculator-Webapp/pages-data/searchable-pokemon.json',
  );
  assert.equal(
    withBasePath('asset.png'),
    '/UltimateIVCalculator-Webapp/asset.png',
  );
});
