import { cachedJson } from './request-cache';
import { STAT_LABELS, type StatKey } from './types';

type Named = { name: string };
type FrontSprites = {
  front_default?: string | null;
  front_shiny?: string | null;
};
export type PokemonPayload = {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience?: number | null;
  stats: Array<{ base_stat: number; effort?: number; stat: Named }>;
  types: Array<{ slot: number; type: Named }>;
  abilities: Array<{ is_hidden?: boolean; ability: Named }>;
  forms: Array<{ name: string; url: string }>;
  species: Named;
  cries?: { latest?: string | null; legacy?: string | null };
  sprites: FrontSprites & {
    versions?: {
      'generation-v'?: {
        'black-white'?: FrontSprites & { animated?: FrontSprites };
      };
    };
    other?: { 'official-artwork'?: FrontSprites };
  };
};
export type SpeciesPayload = {
  id?: number;
  generation: Named;
  capture_rate?: number;
  base_happiness?: number;
  growth_rate?: Named;
  egg_groups?: Named[];
  gender_rate?: number;
  genera?: Array<{ genus: string; language: Named }>;
  flavor_text_entries?: Array<{ flavor_text: string; language: Named }>;
  varieties?: Array<{ pokemon: Named }>;
};
export type SpriteSource = {
  url: string;
  pixel: boolean;
  animated: boolean;
  shiny: boolean;
};
export type PokemonDisplayData = {
  number: number | null;
  name: string;
  genus?: string;
  types: string[];
  height: number;
  weight: number;
  abilities: Array<{ name: string; hidden: boolean }>;
  forms: string[];
  generation?: string;
  captureRate?: number;
  experience?: number | null;
  friendship?: number;
  growth?: string;
  eggGroups?: string;
  gender?: string;
  yield: string[];
  flavor?: string;
  sprites: { default: SpriteSource[]; shiny: SpriteSource[] };
  cries: string[];
  partial: boolean;
};
export const displayName = (slug: string) =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
export const getPokemonPayload = (name: string) =>
  cachedJson<PokemonPayload>(
    `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name.trim().toLowerCase())}`,
  );
export const getSpeciesPayload = (name: string) =>
  cachedJson<SpeciesPayload>(
    `https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(name.trim().toLowerCase())}`,
  );

export function spriteSources(
  pokemon: PokemonPayload,
  shiny: boolean,
): SpriteSource[] {
  const bw = pokemon.sprites.versions?.['generation-v']?.['black-white'];
  const collect = (variant: boolean): SpriteSource[] => {
    const key = variant ? 'front_shiny' : 'front_default';
    return [
      { url: bw?.animated?.[key], pixel: true, animated: true },
      { url: pokemon.sprites[key], pixel: true, animated: false },
      { url: bw?.[key], pixel: true, animated: false },
      {
        url: pokemon.sprites.other?.['official-artwork']?.[key],
        pixel: false,
        animated: false,
      },
    ].flatMap((source) =>
      source.url ? [{ ...source, url: source.url, shiny: variant }] : [],
    );
  };
  return [...collect(shiny), ...(shiny ? collect(false) : [])].filter(
    (source, i, all) =>
      all.findIndex((other) => other.url === source.url) === i,
  );
}
export function normalizeDisplay(
  pokemon: PokemonPayload,
  species: SpeciesPayload | null,
  supported: string[],
): PokemonDisplayData {
  const allowed = new Set(supported.map((name) => name.toLowerCase()));
  const gender = species?.gender_rate;
  return {
    number: species?.id ?? (pokemon.id <= 1025 ? pokemon.id : null),
    name: displayName(pokemon.name),
    genus: species?.genera?.find((entry) => entry.language.name === 'en')
      ?.genus,
    types: pokemon.types.map((entry) => displayName(entry.type.name)),
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    abilities: pokemon.abilities.map((entry) => ({
      name: displayName(entry.ability.name),
      hidden: !!entry.is_hidden,
    })),
    forms: (species?.varieties ?? [])
      .map((entry) => entry.pokemon.name)
      .filter((name) => allowed.has(name.toLowerCase())),
    generation: species?.generation.name
      .replace('generation-', '')
      .toUpperCase(),
    captureRate: species?.capture_rate,
    experience: pokemon.base_experience,
    friendship: species?.base_happiness,
    growth: species?.growth_rate && displayName(species.growth_rate.name),
    eggGroups: species?.egg_groups
      ?.map((entry) => displayName(entry.name))
      .join(' / '),
    gender:
      gender === -1
        ? 'Genderless'
        : gender == null
          ? undefined
          : `${100 - gender * 12.5}% ♂ / ${gender * 12.5}% ♀`,
    yield: pokemon.stats
      .filter((entry) => (entry.effort ?? 0) > 0)
      .map(
        (entry) =>
          `${STAT_LABELS[entry.stat.name as StatKey] ?? entry.stat.name} +${entry.effort}`,
      ),
    flavor: species?.flavor_text_entries
      ?.find((entry) => entry.language.name === 'en')
      ?.flavor_text.replace(/[\s\f]+/g, ' ')
      .trim(),
    sprites: {
      default: spriteSources(pokemon, false),
      shiny: spriteSources(pokemon, true),
    },
    cries: [
      ...new Set(
        [pokemon.cries?.latest, pokemon.cries?.legacy].filter(
          (url): url is string => !!url,
        ),
      ),
    ],
    partial: !species,
  };
}
export async function getDisplayData(
  name: string,
  names: Promise<string[]>,
): Promise<PokemonDisplayData> {
  const supportedRequest = names.catch(() => null);
  const pokemon = await getPokemonPayload(name);
  const [species, supported] = await Promise.all([
    getSpeciesPayload(pokemon.species.name).catch(() => null),
    supportedRequest,
  ]);
  const result = normalizeDisplay(pokemon, species, supported ?? []);
  return { ...result, partial: !species || !supported };
}
