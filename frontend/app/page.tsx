'use client';

import { useEffect, useMemo, useState } from 'react';

import { PokemonSearch } from '@/components/PokemonSearch';
import { Sidebar } from '@/components/Sidebar';
import { StatTable } from '@/components/StatTable';
import { SummaryRail } from '@/components/SummaryRail';
import { calculateIVs, getPokemon } from '@/lib/api';
import { CalculateResponse, NATURES, PokemonSummary, STAT_KEYS, StatKey } from '@/lib/types';

const DEFAULT_STATS = Object.fromEntries(STAT_KEYS.map((key) => [key, ''])) as Record<StatKey, string>;
const DEFAULT_EVS = Object.fromEntries(STAT_KEYS.map((key) => [key, '0'])) as Record<StatKey, string>;
const THEME_STORAGE_KEY = 'ultimate-iv-theme';

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function HomePage() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [pokemonName, setPokemonName] = useState('Bulbasaur');
  const [level, setLevel] = useState('100');
  const [nature, setNature] = useState('Adamant');
  const [observedStats, setObservedStats] = useState<Record<StatKey, string>>(DEFAULT_STATS);
  const [evs, setEvs] = useState<Record<StatKey, string>>(DEFAULT_EVS);
  const [pokemon, setPokemon] = useState<PokemonSummary | undefined>(undefined);
  const [result, setResult] = useState<CalculateResponse | undefined>(undefined);
  const [status, setStatus] = useState('Ready. Load a Pokémon and calculate IVs.');
  const [loadingPokemon, setLoadingPokemon] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = theme === 'system' ? getSystemTheme() : theme;
      setResolvedTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    };

    applyTheme();
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    return undefined;
  }, [theme]);

  useEffect(() => {
    const loadBulbasaur = async () => {
      setLoadingPokemon(true);
      try {
        const summary = await getPokemon('bulbasaur');
        setPokemon(summary);
      } catch {
        setStatus('Could not load default Pokémon data.');
      } finally {
        setLoadingPokemon(false);
      }
    };

    void loadBulbasaur();
  }, []);

  const baseStats = useMemo(() => pokemon?.base_stats ?? {}, [pokemon]);

  const evTotal = useMemo(() => STAT_KEYS.reduce((sum, key) => sum + (Number(evs[key]) || 0), 0), [evs]);
  const evSummary = `EV Total: ${evTotal} / 510${evTotal > 510 ? ' • Over cap' : ` • ${Math.max(0, 510 - evTotal)} left`}`;

  async function handleLoadPokemon(name: string) {
    if (!name.trim()) return;
    setLoadingPokemon(true);
    try {
      const summary = await getPokemon(name);
      setPokemon(summary);
      setPokemonName(summary.display_name);
      setStatus(`Loaded ${summary.display_name}.`);
    } catch {
      setStatus('Could not load that Pokémon from the API.');
    } finally {
      setLoadingPokemon(false);
    }
  }

  async function handleCalculate() {
    setCalculating(true);
    try {
      const payload = {
        pokemon_name: pokemonName,
        level: Number(level),
        nature,
        observed_stats: Object.fromEntries(STAT_KEYS.map((key) => [key, Number(observedStats[key])])) as Record<StatKey, number>,
        evs: Object.fromEntries(STAT_KEYS.map((key) => [key, Number(evs[key])])) as Record<StatKey, number>,
      };
      const nextResult = await calculateIVs(payload);
      setPokemon(nextResult.pokemon);
      setResult(nextResult);
      setStatus(nextResult.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not calculate IVs.';
      setStatus(message);
    } finally {
      setCalculating(false);
    }
  }

  return (
    <main className={`app-shell ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <Sidebar theme={theme} onThemeChange={setTheme} />

      <section className="main-shell">
        <div className="hero-card panel-card">
          <div>
            <p className="eyebrow">{pokemon?.types.join(' / ') || 'Pokémon IV Calculator'}</p>
            <h1 className="hero-title">{pokemon?.display_name ?? 'Ultimate IV Calculator'}</h1>
            <p className="hero-subtitle">{pokemon?.abilities.join(', ') || 'Exact IV matching with a professional web dashboard.'}</p>
          </div>
          <div className="hero-meta">
            <span>{result?.best_stat_summary ?? 'Best Match: -'}</span>
            <span>{result?.perfect_iv_summary ?? '31 IV Stats: -'}</span>
          </div>
        </div>

        <div className="controls-card panel-card">
          <div className="control-group">
            <label className="control-label">Pokémon</label>
            <PokemonSearch value={pokemonName} onChange={setPokemonName} />
          </div>
          <div className="control-group">
            <label className="control-label">Level</label>
            <input className="app-input" inputMode="numeric" value={level} onChange={(event) => setLevel(event.target.value)} />
          </div>
          <div className="control-group">
            <label className="control-label">Nature</label>
            <select className="app-input app-select" value={nature} onChange={(event) => setNature(event.target.value)}>
              {NATURES.map((natureOption) => (
                <option key={natureOption} value={natureOption}>{natureOption}</option>
              ))}
            </select>
          </div>
          <div className="control-group control-summary">
            <label className="control-label">EV Summary</label>
            <div className="read-only-chip summary-chip">{evSummary}</div>
          </div>
          <div className="control-actions">
            <button type="button" className="primary-button" onClick={() => void handleLoadPokemon(pokemonName)} disabled={loadingPokemon}>
              {loadingPokemon ? 'Loading...' : 'Load Pokémon'}
            </button>
            <button type="button" className="primary-button secondary-button" onClick={() => setObservedStats(DEFAULT_STATS)}>
              Clear Stats
            </button>
            <button type="button" className="primary-button secondary-button" onClick={() => setEvs(DEFAULT_EVS)}>
              Clear EVs
            </button>
            <button type="button" className="primary-button" onClick={() => void handleCalculate()} disabled={calculating}>
              {calculating ? 'Calculating...' : 'Calculate IVs'}
            </button>
          </div>
        </div>

        <div className="content-grid">
          <div>
            <StatTable
              observedStats={observedStats}
              evs={evs}
              baseStats={baseStats}
              results={result?.results}
              onObservedChange={(statKey, value) => setObservedStats((current) => ({ ...current, [statKey]: value.replace(/[^0-9]/g, '') }))}
              onEvChange={(statKey, value) => setEvs((current) => ({ ...current, [statKey]: value.replace(/[^0-9]/g, '') }))}
            />
            <div className="status-banner">{status}</div>
          </div>
          <SummaryRail pokemon={pokemon} />
        </div>
      </section>
    </main>
  );
}
