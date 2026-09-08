import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoRequest } from '../lib/request-cache';
import {
  normalizeDisplay,
  spriteSources,
  type PokemonPayload,
  type SpeciesPayload,
} from '../lib/pokemon-display-data';

const pokemon: PokemonPayload = {
  id: 10001,
  name: 'deoxys-attack',
  height: 17,
  weight: 608,
  stats: [{ base_stat: 180, effort: 2, stat: { name: 'attack' } }],
  types: [{ slot: 1, type: { name: 'psychic' } }],
  abilities: [{ ability: { name: 'pressure' }, is_hidden: true }],
  forms: [],
  species: { name: 'deoxys' },
  sprites: {
    front_default: 'default.png',
    front_shiny: 'shiny.png',
    versions: {
      'generation-v': {
        'black-white': {
          animated: { front_default: 'default.gif', front_shiny: 'shiny.gif' },
        },
      },
    },
  },
  cries: { latest: 'latest.ogg', legacy: 'legacy.ogg' },
};
const species: SpeciesPayload = {
  id: 386,
  generation: { name: 'generation-iii' },
  gender_rate: -1,
  varieties: [
    { pokemon: { name: 'deoxys-normal' } },
    { pokemon: { name: 'deoxys-attack' } },
    { pokemon: { name: 'excluded-form' } },
  ],
  flavor_text_entries: [
    { flavor_text: 'A\nDNA\fPokémon.  Test.', language: { name: 'en' } },
  ],
};
test('requests share in-flight and successful work, but failures can retry', async () => {
  const cache = new Map<string, Promise<number>>();
  let calls = 0;
  const request = async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return 42;
  };
  const first = memoRequest(cache, 'key', request);
  assert.equal(memoRequest(cache, 'key', request), first);
  await assert.rejects(first);
  assert.equal(await memoRequest(cache, 'key', request), 42);
  assert.equal(await memoRequest(cache, 'key', request), 42);
  assert.equal(calls, 2);
});
test('request caches are bounded', async () => {
  const cache = new Map<string, Promise<number>>();
  for (let i = 0; i < 150; i++)
    await memoRequest(cache, String(i), async () => i);
  assert.equal(cache.size, 128);
});
test('animated sprites precede static; shiny never silently uses default first', () => {
  assert.equal(spriteSources(pokemon, false)[0].url, 'default.gif');
  assert.equal(spriteSources(pokemon, true)[0].url, 'shiny.gif');
  assert.equal(
    spriteSources(
      { ...pokemon, sprites: { front_default: 'new.png' } },
      false,
    )[0].url,
    'new.png',
  );
  assert.deepEqual(spriteSources({ ...pokemon, sprites: {} }, false), []);
});
test('species number, hidden ability, flavor normalization, gender and supported varieties', () => {
  const data = normalizeDisplay(pokemon, species, [
    'Deoxys-Normal',
    'Deoxys-Attack',
  ]);
  assert.equal(data.number, 386);
  assert.equal(data.gender, 'Genderless');
  assert.equal(data.flavor, 'A DNA Pokémon. Test.');
  assert.equal(data.abilities[0].hidden, true);
  assert.deepEqual(data.forms, ['deoxys-normal', 'deoxys-attack']);
  assert.deepEqual(data.yield, ['ATK +2']);
  assert.equal(
    normalizeDisplay(pokemon, { ...species, gender_rate: 1 }, []).gender,
    '87.5% ♂ / 12.5% ♀',
  );
});
test('optional species and cry failures leave usable sprite data', () => {
  const data = normalizeDisplay({ ...pokemon, cries: undefined }, null, []);
  assert.equal(data.partial, true);
  assert.equal(data.sprites.default[0].url, 'default.gif');
  assert.deepEqual(data.cries, []);
  assert.equal(data.number, null);
});
