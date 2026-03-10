import { CalculateResponse, PokemonSummary, SearchResult, StatKey } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type CalculatePayload = {
  pokemon_name: string;
  generation: number;
  level: number;
  nature?: string | null;
  characteristic?: string | null;
  observed_stats: Record<StatKey, number>;
  effort_values: Record<StatKey, number>;
};

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || fallback;
  }

  const text = await response.text();
  return text || fallback;
}

export async function searchPokemon(query: string): Promise<string[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE_URL}/pokemon/search?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not search Pokemon.'));
  }

  const payload = (await response.json()) as SearchResult[];
  return payload.map((entry) => entry.name);
}

export async function getPokemon(name: string, generation?: number): Promise<PokemonSummary> {
  const params = new URLSearchParams();
  if (generation !== undefined) {
    params.set('generation', String(generation));
  }

  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(name)}${suffix}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not load Pokemon details.'));
  }

  return (await response.json()) as PokemonSummary;
}

export async function calculateIVs(payload: CalculatePayload): Promise<CalculateResponse> {
  const response = await fetch(`${API_BASE_URL}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not calculate IVs.'));
  }

  return (await response.json()) as CalculateResponse;
}
