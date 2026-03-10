export const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SPATK',
  'special-defense': 'SPDEF',
  speed: 'SPD',
};

export type SearchResult = {
  name: string;
};

export type Option = {
  label: string;
  value: string | number;
};

export type PokemonSummary = {
  name: string;
  base_stats: Record<StatKey, number>;
  types: string[];
  abilities: string[];
  forms: string[];
  height_m: number;
  weight_kg: number;
  sprites: {
    default?: string | null;
    shiny?: string | null;
  };
};

export type CalculateResponse = {
  generation: number;
  pokemon: PokemonSummary;
  iv_ranges: Record<StatKey, string>;
  quality: Record<StatKey, string>;
  bars: Record<StatKey, number>;
  exact_values: Record<StatKey, number[]>;
  best_match: string;
  perfect_stats: string[];
  status: string;
  generation_notes: string[];
};

export type CalculatePayload = {
  pokemon_name: string;
  generation: number;
  level: number;
  nature?: string | null;
  characteristic?: string | null;
  observed_stats: Record<StatKey, number>;
  effort_values: Record<StatKey, number>;
};

export type MetaGenerationsResponse = {
  generations: Array<{ value: number; label: string }>;
};

export type MetaCharacteristicsResponse = {
  characteristics: string[];
};

export type MetaNaturesResponse = {
  natures: string[];
};
