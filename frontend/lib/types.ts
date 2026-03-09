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

export const NATURES = [
  'Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle',
  'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive',
  'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid',
];

export type PokemonSummary = {
  name: string;
  display_name: string;
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

export type StatResult = {
  stat_key: StatKey;
  label: string;
  color: string;
  base_stat: number;
  observed_stat: number;
  ev: number;
  matches: number[];
  range_text: string;
  quality: string;
  best_match: number | null;
  perfect_possible: boolean;
  impossible: boolean;
};

export type CalculateResponse = {
  pokemon: PokemonSummary;
  level: number;
  nature: string;
  best_stat_summary: string;
  perfect_iv_summary: string;
  impossible_count: number;
  status: string;
  results: Record<StatKey, StatResult>;
};
