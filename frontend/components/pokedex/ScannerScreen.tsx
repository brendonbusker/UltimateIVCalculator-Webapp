'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type {
  PokemonDisplayData,
  SpriteSource,
} from '@/lib/pokemon-display-data';
import type { PokemonSummary } from '@/lib/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function Sprite({
  sources,
  name,
  shiny,
  onReady,
}: {
  sources: SpriteSource[];
  name: string;
  shiny: boolean;
  onReady: () => void;
}) {
  const [index, setIndex] = useState(0);
  const source = sources[index];
  return source ? (
    <>
      <Image
        unoptimized
        width={240}
        height={240}
        src={source.url}
        alt={`${name}, ${source.shiny ? 'shiny' : 'default'} sprite`}
        className={source.pixel ? 'pixel-sprite' : 'artwork-sprite'}
        onError={() => setIndex((value) => value + 1)}
        onLoad={onReady}
      />
      {!source.shiny && shiny && (
        <span className="sprite-fallback-note">
          Shiny unavailable · default shown
        </span>
      )}
    </>
  ) : (
    <span className="sprite-empty">Sprite unavailable</span>
  );
}
export default function ScannerScreen({
  data,
  summary,
  shiny,
  loading,
}: {
  data: PokemonDisplayData | null;
  summary: PokemonSummary | null;
  shiny: boolean;
  loading: boolean;
}) {
  const reduced = useReducedMotion();
  const [scanning, setScanning] = useState(true);
  const name = data?.name || summary?.name || 'Pokémon';
  let sources = data?.sprites[shiny ? 'shiny' : 'default'] || [];
  if (!sources.length && summary)
    sources = [
      summary.sprites[shiny ? 'shiny' : 'default'],
      summary.sprites.default,
    ].flatMap((url) =>
      url
        ? [
            {
              url,
              pixel: true,
              animated: false,
              shiny: shiny && url === summary.sprites.shiny,
            },
          ]
        : [],
    );
  if (reduced) sources = sources.filter((source) => !source.animated);
  useEffect(() => {
    setScanning(true);
    const timer = window.setTimeout(
      () => setScanning(false),
      reduced ? 0 : 750,
    );
    return () => window.clearTimeout(timer);
  }, [name, shiny, reduced, loading]);
  return (
    <section
      className="scanner-screen screen"
      aria-label="Pokémon scanner"
      aria-busy={loading}
    >
      <header className="screen-title">
        <span className={shiny ? 'variant active' : 'variant'}>
          ◉ {shiny ? 'SHINY' : 'DEFAULT'}
        </span>
        <span>
          {data?.number != null
            ? `No. ${String(data.number).padStart(4, '0')}`
            : '—'}
        </span>
      </header>
      <div
        className={`scanner-stage ${loading ? 'is-loading' : ''}`}
        key={`${name}-${shiny}-${loading}`}
      >
        <div className="scanner-ident">
          <span>{loading || scanning ? 'SCANNING…' : 'IDENTIFIED'}</span>
          <h2>{name}</h2>
          {data?.genus && <p>{data.genus}</p>}
        </div>
        <div className="sprite-space">
          <div className="sprite-platform" aria-hidden="true" />
          <Sprite
            key={`${name}-${shiny}-${reduced}-${sources.map((s) => s.url).join()}`}
          sources={sources}
          name={name}
          shiny={shiny}
            onReady={() => setScanning(false)}
          />
        </div>
        <span className="scan-beam" aria-hidden="true" />
        <div className="scan-readout">
          <span>
            {loading
              ? 'SEARCHING'
              : scanning
                ? 'SCANNING…'
                : sources.length
                  ? 'SCAN COMPLETE'
                  : 'NO SPRITE DATA'}
          </span>
          <span className="barcode" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
