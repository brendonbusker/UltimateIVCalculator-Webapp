import Image from 'next/image';

import { PokemonSummary } from '@/lib/types';

type SummaryRailProps = {
  pokemon?: PokemonSummary;
};

export function SummaryRail({ pokemon }: SummaryRailProps) {
  const spriteUrl = pokemon?.sprites.default ?? null;
  const shinyUrl = pokemon?.sprites.shiny ?? null;

  return (
    <div className="right-rail">
      <div className="panel-card">
        <h2 className="panel-title">Sprites</h2>
        <div className="sprite-grid">
          <div className="sprite-slot">
            <span className="mini-label">Default</span>
            {spriteUrl ? <Image src={spriteUrl} alt="Default sprite" width={180} height={180} unoptimized /> : <span className="sprite-fallback">No sprite</span>}
          </div>
          <div className="sprite-slot">
            <span className="mini-label">Shiny</span>
            {shinyUrl ? <Image src={shinyUrl} alt="Shiny sprite" width={180} height={180} unoptimized /> : <span className="sprite-fallback">No sprite</span>}
          </div>
        </div>
      </div>

      <div className="panel-card">
        <h2 className="panel-title">Quick Readout</h2>
        <div className="readout-grid">
          <span className="mini-label">Species</span>
          <span>{pokemon?.display_name ?? '-'}</span>
          <span className="mini-label">Typing</span>
          <span>{pokemon?.types.join(' / ') || '-'}</span>
          <span className="mini-label">Size</span>
          <span>{pokemon ? `${pokemon.height_m.toFixed(1)} m • ${pokemon.weight_kg.toFixed(1)} kg` : '-'}</span>
          <span className="mini-label">Forms</span>
          <span>{pokemon?.forms.join(', ') || '-'}</span>
        </div>
      </div>

      <div className="panel-card">
        <h2 className="panel-title">Extra Notes</h2>
        <p className="notes-copy">
          A perfect 31 IV shows as a full meter. Wide ranges usually mean lower levels or uncertain EVs. Neutral natures do not change non-HP stats.
        </p>
      </div>
    </div>
  );
}
