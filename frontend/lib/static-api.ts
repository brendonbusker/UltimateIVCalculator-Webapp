import { withBasePath } from '@/lib/app-config';
import { CHARACTERISTICS, CHARACTERISTICS_RESPONSE, GENERATIONS, NATURE_EFFECTS, NATURES } from '@/lib/static-data';
import {
  CalculatePayload,
  CalculateResponse,
  MetaCharacteristicsResponse,
  MetaGenerationsResponse,
  MetaNaturesResponse,
  PokemonSummary,
  SearchResult,
  STAT_KEYS,
  STAT_LABELS,
  StatKey,
} from '@/lib/types';

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const HISTORICAL_RAW_URL = 'https://raw.githubusercontent.com/zhenga8533/pokedb/data/gen{generation}/pokemon/default/{slug}.json';
const SEARCHABLE_POKEMON_PATH = '/pages-data/searchable-pokemon.json';

const SPECIES_GENERATION_LOOKUP: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
};

const VERSION_GROUP_GENERATION_LOOKUP: Record<string, number> = {
  'red-blue': 1,
  yellow: 1,
  'gold-silver': 2,
  crystal: 2,
  'ruby-sapphire': 3,
  emerald: 3,
  'firered-leafgreen': 3,
  colosseum: 3,
  xd: 3,
  'diamond-pearl': 4,
  platinum: 4,
  'heartgold-soulsilver': 4,
  'black-white': 5,
  'black-2-white-2': 5,
  'x-y': 6,
  'omega-ruby-alpha-sapphire': 6,
  'sun-moon': 7,
  'ultra-sun-ultra-moon': 7,
  'lets-go-pikachu-lets-go-eevee': 7,
  'sword-shield': 8,
  'brilliant-diamond-and-shining-pearl': 8,
  'legends-arceus': 8,
  'scarlet-violet': 9,
};

type ExternalPokemon = {
  name: string;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  types: Array<{ slot: number; type: { name: string } }>;
  abilities: Array<{ is_hidden?: boolean; ability: { name: string } }>;
  forms: Array<{ name: string; url: string }>;
  species: { name: string };
  height: number;
  weight: number;
  sprites: {
    front_default?: string | null;
    front_shiny?: string | null;
  };
};

type ExternalForm = {
  is_battle_only?: boolean;
  is_mega?: boolean;
  version_group?: { name?: string };
};

type ExternalSpecies = {
  generation: { name: string };
};

type HistoricalPayload = {
  stats?: Record<string, number>;
};

const searchIndexPromise: { current: Promise<SearchResult[]> | null } = { current: null };
const pokemonCache = new Map<string, Promise<ExternalPokemon>>();
const pokemonFormCache = new Map<string, Promise<ExternalForm>>();
const speciesCache = new Map<string, Promise<ExternalSpecies>>();
const historicalCache = new Map<string, Promise<Record<StatKey, number> | null>>();

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function titleCaseSlug(value: string): string {
  return value
    .split('-')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join('-');
}

function normalizeHistoricalStats(stats: Record<string, number> | undefined, generation: number): Record<StatKey, number> {
  const hp = Number(stats?.hp ?? 0);
  const attack = Number(stats?.attack ?? 0);
  const defense = Number(stats?.defense ?? 0);
  const speed = Number(stats?.speed ?? 0);
  let specialAttack = Number(stats?.special_attack ?? stats?.['special-attack'] ?? 0);
  let specialDefense = Number(stats?.special_defense ?? stats?.['special-defense'] ?? 0);

  if (generation === 1) {
    const special = specialAttack || specialDefense;
    specialAttack = special;
    specialDefense = special;
  }

  return {
    hp,
    attack,
    defense,
    'special-attack': specialAttack,
    'special-defense': specialDefense,
    speed,
  };
}

async function getSearchIndex(): Promise<SearchResult[]> {
  if (!searchIndexPromise.current) {
    searchIndexPromise.current = fetchJson<SearchResult[]>(withBasePath(SEARCHABLE_POKEMON_PATH), { cache: 'force-cache' });
  }

  return searchIndexPromise.current;
}

async function getPokemonPayload(name: string): Promise<ExternalPokemon> {
  const key = name.toLowerCase().trim();
  if (!pokemonCache.has(key)) {
    pokemonCache.set(key, fetchJson<ExternalPokemon>(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(key)}`));
  }
  return pokemonCache.get(key)!;
}

async function getPokemonForm(name: string): Promise<ExternalForm> {
  const key = name.toLowerCase().trim();
  if (!pokemonFormCache.has(key)) {
    pokemonFormCache.set(
      key,
      (async () => {
        const pokemon = await getPokemonPayload(name);
        const firstForm = pokemon.forms[0]?.url;
        if (!firstForm) {
          return {};
        }
        return fetchJson<ExternalForm>(firstForm);
      })(),
    );
  }
  return pokemonFormCache.get(key)!;
}

async function getSpecies(name: string): Promise<ExternalSpecies> {
  const key = name.toLowerCase().trim();
  if (!speciesCache.has(key)) {
    speciesCache.set(key, fetchJson<ExternalSpecies>(`${POKEAPI_BASE}/pokemon-species/${encodeURIComponent(key)}`));
  }
  return speciesCache.get(key)!;
}

async function getHistoricalBaseStats(name: string, generation: number): Promise<Record<StatKey, number> | null> {
  const key = `${name.toLowerCase().trim()}::${generation}`;
  if (!historicalCache.has(key)) {
    historicalCache.set(
      key,
      (async () => {
        const url = HISTORICAL_RAW_URL
          .replace('{generation}', String(generation))
          .replace('{slug}', name.toLowerCase().trim());

        const response = await fetch(url, { cache: 'force-cache' });
        if (response.status === 404) {
          return null;
        }
        if (!response.ok) {
          throw new Error('Could not load historical Pokemon data.');
        }

        const payload = (await response.json()) as HistoricalPayload;
        return normalizeHistoricalStats(payload.stats, generation);
      })(),
    );
  }
  return historicalCache.get(key)!;
}

async function getIntroducedGeneration(name: string): Promise<number> {
  try {
    const species = await getSpecies(name);
    const roman = species.generation.name.split('-').at(-1) ?? 'ix';
    return SPECIES_GENERATION_LOOKUP[roman] ?? 9;
  } catch {
    const form = await getPokemonForm(name);
    const versionGroupName = form.version_group?.name;
    if (versionGroupName && versionGroupName in VERSION_GROUP_GENERATION_LOOKUP) {
      return VERSION_GROUP_GENERATION_LOOKUP[versionGroupName];
    }

    const pokemon = await getPokemonPayload(name);
    const species = await getSpecies(pokemon.species.name);
    const roman = species.generation.name.split('-').at(-1) ?? 'ix';
    return SPECIES_GENERATION_LOOKUP[roman] ?? 9;
  }
}

function calculateStatModern(statKey: StatKey, baseStat: number, iv: number, ev: number, level: number, natureModifier: number): number {
  const evTerm = Math.floor(ev / 4);
  if (statKey === 'hp') {
    if (baseStat === 1) {
      return 1;
    }
    return Math.floor(((2 * baseStat + iv + evTerm) * level) / 100) + level + 10;
  }

  const raw = Math.floor(((2 * baseStat + iv + evTerm) * level) / 100) + 5;
  return Math.floor(raw * natureModifier);
}

function oldGenEffortTerm(statExp: number): number {
  const bounded = Math.max(0, Math.min(65535, statExp));
  return Math.floor(Math.ceil(Math.sqrt(bounded)) / 4);
}

function calculateStatOld(statKey: StatKey, baseStat: number, dv: number, statExp: number, level: number): number {
  const effortTerm = oldGenEffortTerm(statExp);
  if (statKey === 'hp') {
    return Math.floor((((baseStat + dv) * 2 + effortTerm) * level) / 100) + level + 10;
  }
  return Math.floor((((baseStat + dv) * 2 + effortTerm) * level) / 100) + 5;
}

function hpDvFromTuple(attackDv: number, defenseDv: number, speedDv: number, specialDv: number): number {
  return ((attackDv & 1) << 3) | ((defenseDv & 1) << 2) | ((speedDv & 1) << 1) | (specialDv & 1);
}

function describeQuality(candidates: number[], maxValue: number): string {
  if (!candidates.length) {
    return 'No match';
  }
  if (candidates.length === 1 && candidates[0] === maxValue) {
    return 'Perfect';
  }
  if (candidates.includes(maxValue)) {
    return 'Perfect possible';
  }

  const best = Math.max(...candidates);
  if (candidates.length > 8) {
    return 'Wide range';
  }
  if (best >= Math.round(maxValue * 0.875)) {
    return 'Elite';
  }
  if (best >= Math.round(maxValue * 0.75)) {
    return 'Strong';
  }
  if (best >= Math.round(maxValue * 0.5)) {
    return 'Decent';
  }
  return 'Low';
}

function natureModifiers(natureName: string | null | undefined): Record<StatKey, number> {
  const modifiers = Object.fromEntries(STAT_KEYS.map((key) => [key, 1.0])) as Record<StatKey, number>;
  if (!natureName) {
    return modifiers;
  }

  const effect = NATURE_EFFECTS[natureName];
  if (!effect) {
    return modifiers;
  }
  if (effect.increased) {
    modifiers[effect.increased] = 1.1;
  }
  if (effect.decreased) {
    modifiers[effect.decreased] = 0.9;
  }
  return modifiers;
}

function characteristicMeta(name: string | null | undefined): { stat: StatKey | null; modulo: number | null } {
  const match = CHARACTERISTICS.find((entry) => entry.name === name);
  return match ? { stat: match.stat, modulo: match.modulo } : { stat: null, modulo: null };
}

function filterWithCharacteristic(candidates: Record<StatKey, number[]>, characteristicName: string | null | undefined): Record<StatKey, number[]> {
  const { stat, modulo } = characteristicMeta(characteristicName);
  if (!stat || modulo === null) {
    return candidates;
  }

  const targetCandidates = candidates[stat] ?? [];
  const validTarget = targetCandidates.filter((iv) =>
    iv % 5 === modulo && STAT_KEYS.every((key) => key === stat || (candidates[key] ?? []).some((other) => other <= iv)),
  );

  if (!validTarget.length) {
    return Object.fromEntries(STAT_KEYS.map((key) => [key, []])) as Record<StatKey, number[]>;
  }

  const filtered = { ...candidates };
  filtered[stat] = validTarget;
  for (const key of STAT_KEYS) {
    if (key === stat) {
      continue;
    }
    filtered[key] = (candidates[key] ?? []).filter((value) => validTarget.some((target) => value <= target));
  }
  return filtered;
}

function calculateOldGenerationCandidates(
  generation: number,
  baseStats: Record<StatKey, number>,
  level: number,
  observedStats: Record<StatKey, number>,
  effortValues: Record<StatKey, number>,
): Record<StatKey, number[]> {
  const attackValues = Array.from({ length: 16 }, (_, dv) => dv).filter(
    (dv) => calculateStatOld('attack', baseStats.attack, dv, effortValues.attack, level) === observedStats.attack,
  );
  const defenseValues = Array.from({ length: 16 }, (_, dv) => dv).filter(
    (dv) => calculateStatOld('defense', baseStats.defense, dv, effortValues.defense, level) === observedStats.defense,
  );
  const speedValues = Array.from({ length: 16 }, (_, dv) => dv).filter(
    (dv) => calculateStatOld('speed', baseStats.speed, dv, effortValues.speed, level) === observedStats.speed,
  );

  const specialValues = Array.from({ length: 16 }, (_, dv) => dv).filter((dv) => {
    if (generation === 1) {
      return calculateStatOld('special-attack', baseStats['special-attack'], dv, effortValues['special-attack'], level) === observedStats['special-attack'];
    }

    return (
      calculateStatOld('special-attack', baseStats['special-attack'], dv, effortValues['special-attack'], level) === observedStats['special-attack'] &&
      calculateStatOld('special-defense', baseStats['special-defense'], dv, effortValues['special-defense'], level) === observedStats['special-defense']
    );
  });

  const validTuples: Array<[number, number, number, number, number]> = [];
  const hpValues = new Set<number>();

  for (const attack of attackValues) {
    for (const defense of defenseValues) {
      for (const speed of speedValues) {
        for (const special of specialValues) {
          const hpDv = hpDvFromTuple(attack, defense, speed, special);
          if (calculateStatOld('hp', baseStats.hp, hpDv, effortValues.hp, level) === observedStats.hp) {
            validTuples.push([attack, defense, speed, special, hpDv]);
            hpValues.add(hpDv);
          }
        }
      }
    }
  }

  if (!validTuples.length) {
    return Object.fromEntries(STAT_KEYS.map((key) => [key, []])) as Record<StatKey, number[]>;
  }

  return {
    hp: Array.from(hpValues).sort((left, right) => left - right),
    attack: Array.from(new Set(validTuples.map((tuple) => tuple[0]))).sort((left, right) => left - right),
    defense: Array.from(new Set(validTuples.map((tuple) => tuple[1]))).sort((left, right) => left - right),
    'special-attack': Array.from(new Set(validTuples.map((tuple) => tuple[3]))).sort((left, right) => left - right),
    'special-defense': Array.from(new Set(validTuples.map((tuple) => tuple[3]))).sort((left, right) => left - right),
    speed: Array.from(new Set(validTuples.map((tuple) => tuple[2]))).sort((left, right) => left - right),
  };
}

function statusText(candidates: Record<StatKey, number[]>, name: string, level: number): string {
  const impossibleCount = Object.values(candidates).filter((values) => values.length === 0).length;
  if (impossibleCount) {
    return `Calculated with ${impossibleCount} impossible stat slot(s). Double-check inputs.`;
  }
  return `Calculation complete for ${name} at level ${level}.`;
}

function formatResponse(summary: PokemonSummary, generation: number, candidates: Record<StatKey, number[]>, status: string, generationNotes: string[]): CalculateResponse {
  const usesDvRules = generation <= 2;
  const maxValue = usesDvRules ? 15 : 31;
  const ivRanges = {} as Record<StatKey, string>;
  const quality = {} as Record<StatKey, string>;
  const bars = {} as Record<StatKey, number>;
  const exactValues = {} as Record<StatKey, number[]>;
  const perfectStats: string[] = [];
  let bestStat: string | null = null;
  let bestValue = -1;

  for (const statKey of STAT_KEYS) {
    const values = [...(candidates[statKey] ?? [])].sort((left, right) => left - right);
    exactValues[statKey] = values;
    if (!values.length) {
      ivRanges[statKey] = 'N/A';
      quality[statKey] = 'No match';
      bars[statKey] = 0;
      continue;
    }

    ivRanges[statKey] = values.length === 1 ? String(values[0]) : `${values[0]}-${values[values.length - 1]}`;
    quality[statKey] = describeQuality(values, maxValue);
    bars[statKey] = values[values.length - 1] / maxValue;

    if (values.length === 1 && values[0] === maxValue) {
      perfectStats.push(STAT_LABELS[statKey]);
    }
    if (values[values.length - 1] > bestValue) {
      bestValue = values[values.length - 1];
      bestStat = STAT_LABELS[statKey];
    }
  }

  return {
    generation,
    pokemon: summary,
    iv_ranges: ivRanges,
    quality,
    bars,
    exact_values: exactValues,
    best_match: bestStat ? `${bestStat} at up to ${bestValue}` : 'None',
    perfect_stats: perfectStats,
    status,
    generation_notes: generationNotes,
  };
}

export async function getStaticGenerations(): Promise<MetaGenerationsResponse> {
  return GENERATIONS;
}

export async function getStaticCharacteristics(): Promise<MetaCharacteristicsResponse> {
  return CHARACTERISTICS_RESPONSE;
}

export async function getStaticNatures(): Promise<MetaNaturesResponse> {
  return NATURES;
}

export async function searchStaticPokemon(query: string): Promise<string[]> {
  const names = (await getSearchIndex()).map((entry) => entry.name).sort((left, right) => left.localeCompare(right));
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return names;
  }
  return names.filter((name) => name.toLowerCase().includes(normalizedQuery));
}

export async function getStaticPokemon(name: string, generation?: number): Promise<PokemonSummary> {
  const pokemon = await getPokemonPayload(name);
  const statMap = Object.fromEntries(pokemon.stats.map((entry) => [entry.stat.name, entry.base_stat])) as Record<string, number>;
  let baseStats = Object.fromEntries(STAT_KEYS.map((key) => [key, statMap[key] ?? 0])) as Record<StatKey, number>;

  if (generation !== undefined) {
    const historical = await getHistoricalBaseStats(name, generation);
    if (historical) {
      baseStats = historical;
    }
  }

  return {
    name: titleCaseSlug(pokemon.name),
    types: [...pokemon.types].sort((left, right) => left.slot - right.slot).map((entry) => titleCaseSlug(entry.type.name)),
    abilities: pokemon.abilities.map((ability) => `${titleCaseSlug(ability.ability.name).replace(/-/g, ' ')}${ability.is_hidden ? ' (Hidden)' : ''}`),
    height_m: pokemon.height / 10,
    weight_kg: pokemon.weight / 10,
    forms: pokemon.forms.map((form) => titleCaseSlug(form.name)),
    base_stats: baseStats,
    sprites: {
      default: pokemon.sprites.front_default ?? null,
      shiny: pokemon.sprites.front_shiny ?? null,
    },
  };
}

export async function calculateStaticIVs(payload: CalculatePayload): Promise<CalculateResponse> {
  const introGeneration = await getIntroducedGeneration(payload.pokemon_name);
  if (introGeneration > payload.generation) {
    throw new Error(`${titleCaseSlug(payload.pokemon_name)} was introduced in Generation ${introGeneration}.`);
  }

  const summary = await getStaticPokemon(payload.pokemon_name, payload.generation);
  const observedStats = { ...payload.observed_stats };
  const effortValues = { ...payload.effort_values };
  const generationNotes: string[] = [];
  const usesDvRules = payload.generation <= 2;
  const natureEnabled = payload.generation >= 3;
  const characteristicEnabled = payload.generation >= 4;

  if (payload.generation <= 2) {
    generationNotes.push('Generation 1-2 mode uses DVs (0-15) and Stat Exp (0-65535).');
    generationNotes.push('HP DV is derived from Attack, Defense, Speed, and Special DVs.');
    generationNotes.push('Historical base stats are loaded from static data when available and fetched from public sources otherwise.');
  }
  if (payload.generation === 1) {
    generationNotes.push('Generation 1 uses a single Special stat.');
    observedStats['special-defense'] = observedStats['special-attack'];
    effortValues['special-defense'] = effortValues['special-attack'];
  }
  if (payload.generation < 3) {
    generationNotes.push('Natures are disabled in this generation.');
  }
  if (payload.generation < 4) {
    generationNotes.push('Characteristics are disabled in this generation.');
  }

  const modifiers = natureEnabled ? natureModifiers(payload.nature) : Object.fromEntries(STAT_KEYS.map((key) => [key, 1.0])) as Record<StatKey, number>;
  let candidates: Record<StatKey, number[]>;

  if (usesDvRules) {
    candidates = calculateOldGenerationCandidates(payload.generation, summary.base_stats, payload.level, observedStats, effortValues);
  } else {
    candidates = {} as Record<StatKey, number[]>;
    for (const statKey of STAT_KEYS) {
      const statCandidates: number[] = [];
      for (let candidate = 0; candidate <= 31; candidate += 1) {
        const calculated = calculateStatModern(statKey, summary.base_stats[statKey], candidate, effortValues[statKey], payload.level, modifiers[statKey]);
        if (calculated === observedStats[statKey]) {
          statCandidates.push(candidate);
        }
      }
      candidates[statKey] = statCandidates;
    }

    if (characteristicEnabled && payload.characteristic && payload.characteristic !== 'No Selection') {
      candidates = filterWithCharacteristic(candidates, payload.characteristic);
    }
  }

  return formatResponse(summary, payload.generation, candidates, statusText(candidates, summary.name, payload.level), generationNotes);
}
