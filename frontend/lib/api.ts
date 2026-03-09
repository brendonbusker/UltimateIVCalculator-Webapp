import { CalculateResponse, PokemonSummary, StatKey } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';

export async function searchPokemon(query: string): Promise<string[]> {
  const params = new URLSearchParams({ q: query, limit: '10' });
  const response = await fetch(`${API_BASE_URL}/pokemon/search?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not search Pokémon.');
  }
  const payload = (await response.json()) as { results: string[] };
  return payload.results;
}

export async function getPokemon(name: string): Promise<PokemonSummary> {
  const response = await fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(name)}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load Pokémon details.');
  }
  return (await response.json()) as PokemonSummary;
}

export async function calculateIVs(payload: {
  pokemon_name: string;
  level: number;
  nature: string;
  observed_stats: Record<StatKey, number>;
  evs: Record<StatKey, number>;
}): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE_URL}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Could not calculate IVs.');
  }

  return (await response.json()) as CalculateResponse;
}
