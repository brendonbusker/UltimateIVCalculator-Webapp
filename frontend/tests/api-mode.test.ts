import { test } from 'node:test';
import assert from 'node:assert/strict';

test('backend mode retains request contract, cancellation and validation error text', async () => {
  process.env.NEXT_PUBLIC_DATA_MODE = 'api';
  process.env.NEXT_PUBLIC_API_URL = 'https://backend.example/api';
  const api = await import('../lib/api');
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith('/calculate'))
      return Response.json(
        { detail: [{ msg: 'Total EVs cannot exceed 510.' }] },
        { status: 422 },
      );
    return Response.json({ name: 'Bulbasaur' });
  };
  const controller = new AbortController();
  await api.getPokemon('Bulbasaur', 1, controller.signal);
  assert.equal(
    requests[0].url,
    'https://backend.example/api/pokemon/Bulbasaur?generation=1',
  );
  assert.equal(requests[0].init?.signal, controller.signal);
  const { STAT_KEYS } = await import('../lib/types');
  const block = Object.fromEntries(STAT_KEYS.map((key) => [key, 0])) as Record<
    (typeof STAT_KEYS)[number],
    number
  >;
  await assert.rejects(
    api.calculateIVs(
      {
        pokemon_name: 'Bulbasaur',
        generation: 9,
        level: 100,
        observed_stats: block,
        effort_values: block,
      },
      controller.signal,
    ),
    /Total EVs cannot exceed 510/,
  );
  assert.equal(requests[1].init?.method, 'POST');
  assert.equal(requests[1].init?.signal, controller.signal);
  assert.equal(
    JSON.parse(String(requests[1].init?.body)).pokemon_name,
    'Bulbasaur',
  );
});
