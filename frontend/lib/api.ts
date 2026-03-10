import { DATA_MODE } from '@/lib/app-config';
import { calculateStaticIVs, getStaticCharacteristics, getStaticGenerations, getStaticNatures, getStaticPokemon, searchStaticPokemon } from '@/lib/static-api';
import {
  CalculatePayload,
  CalculateResponse,
  MetaCharacteristicsResponse,
  MetaGenerationsResponse,
  MetaNaturesResponse,
  PokemonSummary,
  SearchResult,
} from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || fallback;
  }

  const text = await response.text();
  return text || fallback;
}

export async function getGenerationsMeta(): Promise<MetaGenerationsResponse> {
  if (DATA_MODE === 'static') {
    return getStaticGenerations();
  }

  const response = await fetch(`${API_BASE_URL}/meta/generations`, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not load generations.'));
  }
  return (await response.json()) as MetaGenerationsResponse;
}

export async function getCharacteristicsMeta(): Promise<MetaCharacteristicsResponse> {
  if (DATA_MODE === 'static') {
    return getStaticCharacteristics();
  }

  const response = await fetch(`${API_BASE_URL}/meta/characteristics`, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not load characteristics.'));
  }
  return (await response.json()) as MetaCharacteristicsResponse;
}

export async function getNaturesMeta(): Promise<MetaNaturesResponse> {
  if (DATA_MODE === 'static') {
    return getStaticNatures();
  }

  const response = await fetch(`${API_BASE_URL}/meta/natures`, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not load natures.'));
  }
  return (await response.json()) as MetaNaturesResponse;
}

export async function searchPokemon(query: string): Promise<string[]> {
  if (DATA_MODE === 'static') {
    return searchStaticPokemon(query);
  }

  const params = new URLSearchParams({ q: query, limit: '0' });
  const response = await fetch(`${API_BASE_URL}/pokemon/search?${params.toString()}`, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Could not search Pokemon.'));
  }

  const payload = (await response.json()) as SearchResult[];
  return payload.map((entry) => entry.name);
}

export async function getPokemon(name: string, generation?: number): Promise<PokemonSummary> {
  if (DATA_MODE === 'static') {
    return getStaticPokemon(name, generation);
  }

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
  if (DATA_MODE === 'static') {
    return calculateStaticIVs(payload);
  }

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
