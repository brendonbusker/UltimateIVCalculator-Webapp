import type { MetaCharacteristicsResponse, MetaGenerationsResponse, MetaNaturesResponse, StatKey } from '@/lib/types';

export const GENERATIONS: MetaGenerationsResponse = {
  generations: Array.from({ length: 9 }, (_, index) => ({
    value: index + 1,
    label: `Generation ${index + 1}`,
  })),
};

export const NATURES: MetaNaturesResponse = {
  natures: [
    'Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle',
    'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive',
    'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid',
  ],
};

export const CHARACTERISTICS: Array<{ name: string; stat: StatKey | null; modulo: number | null }> = [
  { name: 'No Selection', stat: null, modulo: null },
  { name: 'Loves to eat', stat: 'hp', modulo: 0 },
  { name: 'Takes plenty of siestas', stat: 'hp', modulo: 1 },
  { name: 'Nods off a lot', stat: 'hp', modulo: 2 },
  { name: 'Scatters things often', stat: 'hp', modulo: 3 },
  { name: 'Likes to relax', stat: 'hp', modulo: 4 },
  { name: 'Proud of its power', stat: 'attack', modulo: 0 },
  { name: 'Likes to thrash about', stat: 'attack', modulo: 1 },
  { name: 'A little quick tempered', stat: 'attack', modulo: 2 },
  { name: 'Likes to fight', stat: 'attack', modulo: 3 },
  { name: 'Quick tempered', stat: 'attack', modulo: 4 },
  { name: 'Sturdy body', stat: 'defense', modulo: 0 },
  { name: 'Capable of taking hits', stat: 'defense', modulo: 1 },
  { name: 'Highly persistent', stat: 'defense', modulo: 2 },
  { name: 'Good endurance', stat: 'defense', modulo: 3 },
  { name: 'Good perseverance', stat: 'defense', modulo: 4 },
  { name: 'Highly curious', stat: 'special-attack', modulo: 0 },
  { name: 'Mischievous', stat: 'special-attack', modulo: 1 },
  { name: 'Thoroughly cunning', stat: 'special-attack', modulo: 2 },
  { name: 'Often lost in thought', stat: 'special-attack', modulo: 3 },
  { name: 'Very finicky', stat: 'special-attack', modulo: 4 },
  { name: 'Strong willed', stat: 'special-defense', modulo: 0 },
  { name: 'Somewhat vain', stat: 'special-defense', modulo: 1 },
  { name: 'Strongly defiant', stat: 'special-defense', modulo: 2 },
  { name: 'Hates to lose', stat: 'special-defense', modulo: 3 },
  { name: 'Somewhat stubborn', stat: 'special-defense', modulo: 4 },
  { name: 'Likes to run', stat: 'speed', modulo: 0 },
  { name: 'Alert to sounds', stat: 'speed', modulo: 1 },
  { name: 'Impetuous and silly', stat: 'speed', modulo: 2 },
  { name: 'Somewhat of a clown', stat: 'speed', modulo: 3 },
  { name: 'Quick to flee', stat: 'speed', modulo: 4 },
];

export const CHARACTERISTICS_RESPONSE: MetaCharacteristicsResponse = {
  characteristics: CHARACTERISTICS.map((entry) => entry.name),
};

export const NATURE_EFFECTS: Record<string, { increased?: StatKey; decreased?: StatKey }> = {
  Adamant: { increased: 'attack', decreased: 'special-attack' },
  Bashful: {},
  Bold: { increased: 'defense', decreased: 'attack' },
  Brave: { increased: 'attack', decreased: 'speed' },
  Calm: { increased: 'special-defense', decreased: 'attack' },
  Careful: { increased: 'special-defense', decreased: 'special-attack' },
  Docile: {},
  Gentle: { increased: 'special-defense', decreased: 'defense' },
  Hardy: {},
  Hasty: { increased: 'speed', decreased: 'defense' },
  Impish: { increased: 'defense', decreased: 'special-attack' },
  Jolly: { increased: 'speed', decreased: 'special-attack' },
  Lax: { increased: 'defense', decreased: 'special-defense' },
  Lonely: { increased: 'attack', decreased: 'defense' },
  Mild: { increased: 'special-attack', decreased: 'defense' },
  Modest: { increased: 'special-attack', decreased: 'attack' },
  Naive: { increased: 'speed', decreased: 'special-defense' },
  Naughty: { increased: 'attack', decreased: 'special-defense' },
  Quiet: { increased: 'special-attack', decreased: 'speed' },
  Quirky: {},
  Rash: { increased: 'special-attack', decreased: 'special-defense' },
  Relaxed: { increased: 'defense', decreased: 'speed' },
  Sassy: { increased: 'special-defense', decreased: 'speed' },
  Serious: {},
  Timid: { increased: 'speed', decreased: 'attack' },
};
