'use client';
import { useEffect, useState } from 'react';
import {
  getDisplayData,
  type PokemonDisplayData,
} from '@/lib/pokemon-display-data';
import { searchPokemon } from '@/lib/api';

export function usePokemonDisplayData(name: string) {
  const [data, setData] = useState<PokemonDisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setData(null);
    void getDisplayData(name || 'bulbasaur', searchPokemon(''))
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setError('Display data unavailable.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [name, revision]);
  return {
    data,
    loading,
    error,
    retry: () => setRevision((value) => value + 1),
  };
}
