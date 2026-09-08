'use client';

import { useEffect, useRef, useState } from 'react';
import {
  calculateIVs,
  getPokemon,
  getGenerationsMeta,
  getNaturesMeta,
  getCharacteristicsMeta,
} from '@/lib/api';
import {
  GENERATIONS,
  NATURES,
  CHARACTERISTICS_RESPONSE,
} from '@/lib/static-data';
import {
  STAT_KEYS,
  STAT_LABELS,
  type StatKey,
  type CalculatePayload,
  type CalculateResponse,
  type PokemonSummary,
} from '@/lib/types';

const statBlock = (value: string) =>
  Object.fromEntries(STAT_KEYS.map((key) => [key, value])) as Record<
    StatKey,
    string
  >;
export function useIVCalculator() {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [generation, setGeneration] = useState(9);
  const [level, setLevel] = useState('100');
  const [nature, setNature] = useState('Adamant');
  const [characteristic, setCharacteristic] = useState('No Selection');
  const [observed, setObserved] = useState(statBlock(''));
  const [efforts, setEfforts] = useState(statBlock('0'));
  const [pokemon, setPokemon] = useState<PokemonSummary | null>(null);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('Select a Pokémon and enter its stats.');
  const [retry, setRetry] = useState(0);
  const [generations, setGenerations] = useState(GENERATIONS.generations);
  const [natures, setNatures] = useState(NATURES.natures);
  const [characteristics, setCharacteristics] = useState(
    CHARACTERISTICS_RESPONSE.characteristics,
  );
  const version = useRef(0);
  const calculation = useRef<AbortController | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    let alive = true;
    const owner = version;
    // These lists have local fallbacks; a metadata outage must not disable the calculator.
    void getGenerationsMeta()
      .then((data) => {
        if (alive) setGenerations(data.generations);
      })
      .catch(() => {});
    void getNaturesMeta()
      .then((data) => {
        if (alive) setNatures(data.natures);
      })
      .catch(() => {});
    void getCharacteristicsMeta()
      .then((data) => {
        if (alive) setCharacteristics(data.characteristics);
      })
      .catch(() => {});
    return () => {
      alive = false;
      owner.current++;
      calculation.current?.abort();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setPokemon(null);
    setLoading(true);
    setLoadError('');
    void getPokemon(selected || 'bulbasaur', generation, controller.signal)
      .then((data) => {
        if (alive) setPokemon(data);
      })
      .catch((reason: unknown) => {
        if (alive)
          setLoadError(
            reason instanceof Error
              ? reason.message
              : 'Could not load Pokémon data.',
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [selected, generation, retry]);

  function invalidate() {
    version.current++;
    calculation.current?.abort();
    pending.current = false;
    setBusy(false);
    setResult(null);
    setError(false);
    setStatus('Ready. Calculate with the current inputs.');
  }
  function selectPokemon(value: string) {
    if (selected === value.trim().toLowerCase() && name === value) return;
    invalidate();
    setName(value);
    setSelected(value.trim().toLowerCase());
  }
  function changeGeneration(value: number) {
    invalidate();
    setGeneration(value);
    if (value <= 3) setCharacteristic('No Selection');
    if (value === 1) {
      setObserved((prev) => ({
        ...prev,
        'special-defense': prev['special-attack'],
      }));
      setEfforts((prev) => ({
        ...prev,
        'special-defense': prev['special-attack'],
      }));
    }
  }
  function changeStat(
    kind: 'observed' | 'effort',
    key: StatKey,
    value: string,
  ) {
    invalidate();
    const clean = value.replace(/[^0-9]/g, '');
    (kind === 'observed' ? setObserved : setEfforts)((prev) => ({
      ...prev,
      [key]: clean,
      ...(generation === 1 && key === 'special-attack'
        ? { 'special-defense': clean }
        : {}),
    }));
  }
  async function calculate() {
    if (pending.current) return;
    const fail = (message: string) => {
      setError(true);
      setStatus(message);
      setResult(null);
    };
    if (!name.trim()) return fail('Select or enter a Pokémon first.');
    if (
      !Number.isInteger(Number(level)) ||
      Number(level) < 1 ||
      Number(level) > 100
    )
      return fail('Level must be between 1 and 100.');
    const effortValues = {} as Record<StatKey, number>;
    const observedStats = {} as Record<StatKey, number>;
    for (const key of STAT_KEYS) {
      const source =
        generation === 1 && key === 'special-defense' ? 'special-attack' : key;
      const obs = Number(observed[source] || '0');
      const eff = Number(efforts[source] || '0');
      const max = generation <= 2 ? 65535 : 255;
      if (!Number.isInteger(obs) || obs < 0 || obs > 999)
        return fail(`Observed ${STAT_LABELS[key]} must be between 0 and 999.`);
      if (!Number.isInteger(eff) || eff < 0 || eff > max)
        return fail(
          `${generation <= 2 ? 'Stat Exp' : 'EV'} for ${STAT_LABELS[key]} must be between 0 and ${max}.`,
        );
      effortValues[key] = eff;
      observedStats[key] = obs;
    }
    if (
      generation >= 3 &&
      Object.values(effortValues).reduce((a, b) => a + b, 0) > 510
    )
      return fail('Total EVs cannot exceed 510.');
    const payload: CalculatePayload = {
      pokemon_name: name.trim(),
      generation,
      level: Number(level),
      nature: generation >= 3 ? nature : null,
      characteristic: generation >= 4 ? characteristic : null,
      observed_stats: observedStats,
      effort_values: effortValues,
    };
    setSelected(name.trim().toLowerCase());
    const current = ++version.current;
    const controller = new AbortController();
    calculation.current = controller;
    pending.current = true;
    setBusy(true);
    setError(false);
    setStatus('Calculating…');
    setResult(null);
    try {
      const data = await calculateIVs(payload, controller.signal);
      if (version.current !== current) return;
      setResult(data);
      setPokemon(data.pokemon);
      setLoadError('');
      setStatus(data.status);
      setError(
        Object.values(data.exact_values).some((values) => !values.length),
      );
    } catch (reason) {
      if (version.current === current)
        fail(
          reason instanceof Error
            ? reason.message
            : 'Calculation failed. Please retry.',
        );
    } finally {
      if (version.current === current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return {
    name,
    selected,
    generation,
    level,
    nature,
    characteristic,
    observed,
    efforts,
    pokemon,
    result,
    loading,
    busy,
    error,
    status,
    loadError,
    generations,
    natures,
    characteristics,
    selectPokemon,
    changeGeneration,
    changeStat,
    calculate,
    retry: () => setRetry((value) => value + 1),
    changeName: (value: string) => {
      invalidate();
      setName(value);
    },
    changeLevel: (value: string) => {
      invalidate();
      setLevel(value.replace(/[^0-9]/g, ''));
    },
    changeNature: (value: string) => {
      invalidate();
      setNature(value);
    },
    changeCharacteristic: (value: string) => {
      invalidate();
      setCharacteristic(value);
    },
    clearStats: () => {
      invalidate();
      setObserved(statBlock(''));
    },
    clearEfforts: () => {
      invalidate();
      setEfforts(statBlock('0'));
    },
  };
}
export type CalculatorState = ReturnType<typeof useIVCalculator>;
