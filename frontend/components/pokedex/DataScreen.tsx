'use client';
import { useEffect, useRef } from 'react';
import type { PokemonDisplayData } from '@/lib/pokemon-display-data';
import { displayName } from '@/lib/pokemon-display-data';
import type { PokemonSummary } from '@/lib/types';

export default function DataScreen({
  data,
  summary,
  reset,
  loading,
  error,
  retry,
}: {
  data: PokemonDisplayData | null;
  summary: PokemonSummary | null;
  reset: number;
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reset) viewport.current?.focus();
  }, [reset]);
  const rows: Array<[string, string | number | undefined | null]> = [
    ['Height', data ? `${data.height} m` : summary && `${summary.height_m} m`],
    [
      'Weight',
      data ? `${data.weight} kg` : summary && `${summary.weight_kg} kg`,
    ],
    [
      'Abilities',
      data
        ? data.abilities
            .map(
              (ability) =>
                `${ability.name}${ability.hidden ? ' [Hidden]' : ''}`,
            )
            .join(' / ')
        : summary?.abilities.join(' / '),
    ],
    ['Forms', data?.forms.map(displayName).join(' / ') || summary?.name],
    ['Generation', data?.generation],
    ['Capture rate', data?.captureRate],
    ['Base experience', data?.experience],
    ['Base friendship', data?.friendship],
    ['Growth rate', data?.growth],
    ['Egg groups', data?.eggGroups],
    ['Gender ratio', data?.gender],
  ];
  const content = (
    <>
      <div className="species-heading">
        <h2>{data?.name || summary?.name || 'Initializing…'}</h2>
        {data?.genus && <p>{data.genus}</p>}
        <div className="type-labels">
          {(data?.types || summary?.types || []).map((type) => (
            <span key={type} data-type={type.toLowerCase()}>
              {type}
            </span>
          ))}
        </div>
      </div>
      <dl>
        {rows
          .filter(([, value]) => value != null && value !== '')
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {data?.flavor && (
        <section className="data-section">
          <h3>Description</h3>
          <p>{data.flavor}</p>
        </section>
      )}
      {!!data?.yield.length && (
        <section className="data-section">
          <h3>EV yield</h3>
          <p>{data.yield.join(' / ')}</p>
        </section>
      )}
      <div className="data-divider" aria-hidden="true">
        ◆
      </div>
    </>
  );
  return (
    <section className="data-screen screen" aria-label="Pokédex data">
      <header className="screen-title">
        <span>◉ POKÉDEX DATA</span>
        <span>
          {data?.number != null
            ? `No. ${String(data.number).padStart(4, '0')}`
            : '—'}
        </span>
      </header>
      <div
        id="pokedex-data"
        ref={viewport}
        className="data-viewport"
        tabIndex={0}
        aria-label="Pokédex information; focus to pause scrolling"
        key={`${data?.name}-${reset}`}
      >
        <div className="data-track">
          <div className="data-copy">{content}</div>
          <div className="data-copy duplicate" aria-hidden="true">
            {content}
          </div>
        </div>
      </div>
      {(error || data?.partial) && (
        <div className="data-error">
          {error || 'Some species data is unavailable.'}{' '}
          <button onClick={retry}>Retry display</button>
        </div>
      )}
      <footer className="terminal-footer">
        <span className="status-led" />
        {loading ? 'SCANNING…' : 'DATA READY'}
        <span aria-hidden="true">◆</span>
      </footer>
    </section>
  );
}
