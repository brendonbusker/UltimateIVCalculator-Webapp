import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStaticIVs, getStaticPokemon } from '../lib/static-api';
import { STAT_KEYS, type CalculatePayload } from '../lib/types';

const block = (values: number[]) =>
  Object.fromEntries(
    STAT_KEYS.map((key, i) => [key, values[i]]),
  ) as CalculatePayload['observed_stats'];
const base = [45, 49, 49, 65, 65, 45];
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.includes('pokemon-species'))
    return Response.json({ generation: { name: url.endsWith('rotom') ? 'generation-iv' : 'generation-i' } });
  if (url.includes('raw.githubusercontent') && url.includes('/gen1/')) {
    const historical = url.includes('charizard') ? [78, 84, 78, 85, 85, 100] : base;
    return Response.json({ stats: { hp: historical[0], attack: historical[1], defense: historical[2], speed: historical[5], special: historical[3] } });
  }
  if (url.includes('raw.githubusercontent'))
    return url.includes('shedinja')
      ? new Response(null, { status: 404 })
      : Response.json({ stats: block(url.includes('charizard') ? [78, 84, 78, 85, 85, 100] : base) });
  return Response.json({
    name: url.endsWith('shedinja') ? 'shedinja' : 'bulbasaur',
    stats: STAT_KEYS.map((name, i) => ({
      stat: { name },
      base_stat: url.endsWith('charizard') ? [78, 84, 78, 109, 85, 100][i] : url.endsWith('shedinja') && i === 0 ? 1 : base[i],
    })),
    types: [],
    abilities: [],
    forms: [],
    species: { name: 'bulbasaur' },
    height: 7,
    weight: 69,
    sprites: {},
  });
};
function payload(
  generation: number,
  observed: number[],
  extra: Partial<CalculatePayload> = {},
): CalculatePayload {
  return {
    pokemon_name: 'bulbasaur',
    generation,
    level: 100,
    nature: 'Hardy',
    characteristic: 'No Selection',
    observed_stats: block(observed),
    effort_values: block([0, 0, 0, 0, 0, 0]),
    ...extra,
  };
}
for (const generation of [3, 4, 5, 6, 9]) {
  test(`Gen ${generation}: exact perfect IVs, meters and quality`, async () => {
    const result = await calculateStaticIVs(
      payload(generation, [231, 134, 134, 166, 166, 126]),
    );
    for (const key of STAT_KEYS) {
      assert.deepEqual(result.exact_values[key], [31]);
      assert.equal(result.quality[key], 'Perfect');
      assert.equal(result.bars[key], 1);
    }
  });
}
for (const generation of [1, 2]) {
  test(`Gen ${generation}: perfect DVs and derived HP`, async () => {
    const result = await calculateStaticIVs(
      payload(generation, [
        230,
        133,
        133,
        165,
        generation === 1 ? 0 : 165,
        125,
      ]),
    );
    for (const key of STAT_KEYS)
      assert.deepEqual(result.exact_values[key], [15]);
    const impossible = await calculateStaticIVs(
      payload(generation, [228, 133, 133, 165, 165, 125]),
    );
    assert.deepEqual(impossible.exact_values.hp, []);
  });
}
test('nature rounding and EV quarter term', async () => {
  const result = await calculateStaticIVs(
    payload(9, [231, 216, 134, 149, 166, 126], {
      nature: 'Adamant',
      effort_values: block([0, 252, 0, 0, 0, 0]),
    }),
  );
  assert.deepEqual(result.exact_values.attack, [31]);
  assert.deepEqual(result.exact_values['special-attack'], [31]);
});
test('characteristic constrains highest stat and is ignored before Gen 4', async () => {
  const input = payload(4, [231, 134, 134, 166, 166, 126], {
    characteristic: 'Loves to eat',
  });
  assert.deepEqual((await calculateStaticIVs(input)).exact_values.hp, []);
  assert.deepEqual(
    (await calculateStaticIVs({ ...input, generation: 3 })).exact_values.hp,
    [31],
  );
});
test('maximum Stat Exp contributes 64 and Gen 1 mirrors Special', async () => {
  const result = await calculateStaticIVs(
    payload(1, [294, 197, 197, 229, 0, 189], {
      effort_values: block([65535, 65535, 65535, 65535, 0, 65535]),
    }),
  );
  assert.deepEqual(result.exact_values.hp, [15]);
  assert.deepEqual(result.exact_values['special-defense'], [15]);
});
test('historical base stats are used and Shedinja HP is fixed', async () => {
  assert.deepEqual(
    (await getStaticPokemon('bulbasaur', 1)).base_stats,
    block(base),
  );
  // Gen-less summary verifies the raw Shedinja stat; historical fixture is deliberately absent here.
  assert.equal((await getStaticPokemon('shedinja')).base_stats.hp, 1);
  const result = await calculateStaticIVs(
    payload(9, [1, 134, 134, 166, 166, 126], { pokemon_name: 'shedinja' }),
  );
  assert.equal(result.exact_values.hp.length, 32);
  const impossible = await calculateStaticIVs(
    payload(9, [2, 134, 134, 166, 166, 126], { pokemon_name: 'shedinja' }),
  );
  assert.deepEqual(impossible.exact_values.hp, []);
});
test('non-perfect HP DV uses parity of all four underlying DVs', async () => {
  const result = await calculateStaticIVs(
    payload(2, [210, 131, 129, 157, 157, 119]),
  );
  assert.deepEqual(result.exact_values.hp, [5]);
  assert.deepEqual(result.exact_values.attack, [14]);
  assert.deepEqual(result.exact_values.defense, [13]);
  assert.deepEqual(result.exact_values.speed, [12]);
  assert.deepEqual(result.exact_values['special-attack'], [11]);
});
test('Gen 2 Special stats must agree on a shared DV', async () => {
  const result = await calculateStaticIVs(
    payload(2, [230, 133, 133, 165, 163, 125]),
  );
  assert.deepEqual(result.exact_values['special-defense'], []);
});
test('low-level IV ranges remain wide and impossible slots report no match', async () => {
  const result = await calculateStaticIVs(
    payload(9, [20, 10, 10, 12, 12, 10], { level: 5 }),
  );
  assert.equal(result.iv_ranges.hp, '10-29');
  assert.equal(result.quality.hp, 'Wide range');
  const impossible = await calculateStaticIVs(
    payload(9, [999, 134, 134, 166, 166, 126]),
  );
  assert.equal(impossible.quality.hp, 'No match');
});
test('historical lookup replaces modern Special and rejects later introductions', async () => {
  assert.equal((await getStaticPokemon('charizard')).base_stats['special-attack'], 109);
  assert.equal((await getStaticPokemon('charizard', 1)).base_stats['special-attack'], 85);
  assert.equal((await getStaticPokemon('charizard', 1)).base_stats['special-defense'], 85);
  await assert.rejects(calculateStaticIVs(payload(1, [230, 133, 133, 165, 165, 125], { pokemon_name: 'rotom' })), /introduced in Generation 4/);
});
