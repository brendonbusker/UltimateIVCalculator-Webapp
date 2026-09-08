'use client';
import { type CSSProperties } from 'react';
import PokemonSearch from '@/components/PokemonSearch';
import type { CalculatorState } from '@/hooks/useIVCalculator';
import { STAT_KEYS, STAT_LABELS, type StatKey } from '@/lib/types';

const colors: Record<StatKey, string> = {
  hp: '#ff727d',
  attack: '#f8ba82',
  defense: '#f3dc6e',
  'special-attack': '#87c8ff',
  'special-defense': '#96e599',
  speed: '#f0a5d7',
};
export default function CalculatorScreen({
  state: c,
}: {
  state: CalculatorState;
}) {
  const old = c.generation <= 2;
  const effortLabel = old ? 'Stat Exp' : 'EV';
  const total = STAT_KEYS.reduce(
    (sum, key) => sum + Number(c.efforts[key] || 0),
    0,
  );
  const keys = STAT_KEYS.filter(
    (key) => c.generation !== 1 || key !== 'special-defense',
  );
  return (
    <section className="calculator-screen screen" aria-label="IV calculator">
      <header className="calculator-heading">
        <span className="pokeball" aria-hidden="true" />
        <div>
          <h1>Ultimate IV Calculator</h1>
        </div>
        <span className="interface-code">
          {old ? 'DV' : 'IV'}
          <br />
          0–{old ? 15 : 31}
        </span>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void c.calculate();
        }}
      >
        <div className="controls-grid">
          <div className="field-group pokemon-field">
            <label htmlFor="pokemon-input">Pokémon</label>
            <PokemonSearch
              value={c.name}
              onChange={c.changeName}
              onSelect={c.selectPokemon}
            />
          </div>
          <label className="field-group">
            Generation
            <select
              aria-label="Generation"
              value={c.generation}
              onChange={(event) =>
                c.changeGeneration(Number(event.target.value))
              }
            >
              {c.generations.map((gen) => (
                <option key={gen.value} value={gen.value}>
                  Gen {gen.value}
                </option>
              ))}
            </select>
          </label>
          <label className="field-group">
            Level
            <input
              aria-label="Level"
              inputMode="numeric"
              value={c.level}
              onChange={(event) => c.changeLevel(event.target.value)}
              maxLength={3}
            />
          </label>
          <label className="field-group nature-field">
            Nature
            <select
              aria-label="Nature"
              value={c.nature}
              disabled={old}
              onChange={(event) => c.changeNature(event.target.value)}
            >
              {c.natures.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            {old && <span className="field-hint">Available in Gen 3+</span>}
          </label>
          <label className="field-group characteristic-field">
            Characteristic
            <select
              aria-label="Characteristic"
              value={c.characteristic}
              disabled={c.generation <= 3}
              onChange={(event) => c.changeCharacteristic(event.target.value)}
            >
              {c.characteristics.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            {c.generation <= 3 && (
              <span className="field-hint">Available in Gen 4+</span>
            )}
          </label>
        </div>
        <div className="effort-strip">
          <span>{old ? 'STAT EXP' : 'EV SUMMARY'}</span>
          <strong className={total > 510 && !old ? 'invalid' : ''}>
            {old
              ? '0–65,535 per stat · no total cap'
              : `${total} / 510 · ${Math.max(0, 510 - total)} left`}
          </strong>
        </div>
        <div className="calculator-actions">
          <button type="button" onClick={c.clearStats}>
            Clear Stats
          </button>
          <button type="button" onClick={c.clearEfforts}>
            Clear {old ? 'Stat Exp' : 'EVs'}
          </button>
          <button type="submit" className="calculate-button" disabled={c.busy}>
            <span className="pokeball" aria-hidden="true" />
            {c.busy ? 'Calculating…' : `Calculate ${old ? 'DVs' : 'IVs'}`}
          </button>
        </div>
        <div
          className="stat-grid"
          role="table"
          aria-label="Observed stats and results"
        >
          <div className="stat-grid-heading" role="row">
            <span role="columnheader">Stat</span>
            <span role="columnheader">Observed</span>
            <span role="columnheader">{effortLabel}</span>
            <span role="columnheader">Base</span>
            <span role="columnheader">{old ? 'DV' : 'IV'} range</span>
            <span role="columnheader">Quality</span>
          </div>
          {keys.map((key) => {
            const label =
              c.generation === 1 && key === 'special-attack'
                ? 'SPC'
                : STAT_LABELS[key];
            return (
              <div
                role="row"
                className="stat-row"
                key={key}
                style={{ '--stat-color': colors[key] } as CSSProperties}
              >
                <strong className="stat-name" role="rowheader">
                  {label}
                </strong>
                <div role="cell" className="observed-cell">
                  <label className="mobile-label" htmlFor={`observed-${key}`}>
                    Observed
                  </label>
                  <input
                    id={`observed-${key}`}
                    aria-label={`${label} observed`}
                    inputMode="numeric"
                    maxLength={3}
                    value={c.observed[key]}
                    onChange={(event) =>
                      c.changeStat('observed', key, event.target.value)
                    }
                  />
                </div>
                <div role="cell" className="effort-cell">
                  <label className="mobile-label" htmlFor={`effort-${key}`}>
                    {effortLabel}
                  </label>
                  <input
                    id={`effort-${key}`}
                    aria-label={`${label} ${effortLabel}`}
                    inputMode="numeric"
                    maxLength={old ? 5 : 3}
                    value={c.efforts[key]}
                    onChange={(event) =>
                      c.changeStat('effort', key, event.target.value)
                    }
                  />
                </div>
                <span role="cell" className="base-cell">
                  <span className="mobile-label">Base</span>
                  {c.pokemon?.base_stats[key] ?? '—'}
                </span>
                <div role="cell" className="range-cell">
                  <span className="mobile-label">
                    {old ? 'DV' : 'IV'} range
                  </span>
                  <strong>{c.result?.iv_ranges[key] ?? '—'}</strong>
                  <div className="meter" aria-hidden="true">
                    <span
                      style={{
                        transform: `scaleX(${c.result?.bars[key] ?? 0})`,
                      }}
                    />
                  </div>
                </div>
                <span role="cell" className="quality-cell">
                  {c.result?.quality[key] ?? '—'}
                </span>
              </div>
            );
          })}
        </div>
      </form>
      {c.loadError && (
        <div className="inline-error" role="alert">
          {c.loadError} <button onClick={c.retry}>Retry data</button>
        </div>
      )}
      {c.result && (
        <div className="result-summary">
          <span>
            Best match <strong>{c.result.best_match}</strong>
          </span>
          <span>
            Perfect{' '}
            <strong>{c.result.perfect_stats.join(', ') || 'None'}</strong>
          </span>
        </div>
      )}
      <div
        className={`status-display ${c.error ? 'error' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span className="status-led" aria-hidden="true" />
        <div>
          <strong>
            {c.busy
              ? 'CALCULATING'
              : c.error
                ? 'CHECK INPUTS'
                : c.result
                  ? 'COMPLETE'
                  : c.loading
                    ? 'INITIALIZING'
                    : 'READY'}
          </strong>
          <span>{c.status}</span>
        </div>
        <span className="barcode" aria-hidden="true" />
      </div>
      <p className="generation-note">
        {old
          ? `Gen ${c.generation} · DVs / Stat Exp · HP DV is derived from the other DVs.${c.generation === 1 ? ' One shared Special stat.' : ' Special stats share a DV.'}`
          : `Gen ${c.generation} · IVs / EVs · ${c.generation === 3 ? 'No characteristics in this generation.' : 'Characteristic is optional.'}`}
      </p>
    </section>
  );
}
