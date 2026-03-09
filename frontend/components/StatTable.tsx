import { STAT_KEYS, STAT_LABELS, StatKey, StatResult } from '@/lib/types';

type StatTableProps = {
  observedStats: Record<StatKey, string>;
  evs: Record<StatKey, string>;
  baseStats: Partial<Record<StatKey, number>>;
  results?: Partial<Record<StatKey, StatResult>>;
  onObservedChange: (statKey: StatKey, value: string) => void;
  onEvChange: (statKey: StatKey, value: string) => void;
};

export function StatTable({ observedStats, evs, baseStats, results, onObservedChange, onEvChange }: StatTableProps) {
  return (
    <div className="panel-card table-card">
      <div className="stats-grid stats-header">
        <span>Stat</span>
        <span>Observed</span>
        <span>EV</span>
        <span>Base</span>
        <span>IV Range</span>
        <span>IV Meter</span>
        <span>Quality</span>
      </div>
      {STAT_KEYS.map((statKey) => {
        const rowResult = results?.[statKey];
        const color = rowResult?.color ?? '#94a3b8';
        const progress = rowResult?.best_match != null ? rowResult.best_match / 31 : 0;
        return (
          <div key={statKey} className="stats-grid stats-row">
            <div className="stat-pill" style={{ color }}>
              {STAT_LABELS[statKey]}
            </div>
            <input
              className="app-input compact-input"
              inputMode="numeric"
              value={observedStats[statKey]}
              onChange={(event) => onObservedChange(statKey, event.target.value)}
              placeholder="0"
            />
            <input
              className="app-input compact-input"
              inputMode="numeric"
              value={evs[statKey]}
              onChange={(event) => onEvChange(statKey, event.target.value)}
              placeholder="0"
            />
            <div className="read-only-chip">{baseStats[statKey] ?? '-'}</div>
            <div className="read-only-chip">{rowResult?.range_text ?? 'N/A'}</div>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${progress * 100}%`, backgroundColor: color }} />
            </div>
            <div className={`quality-chip ${rowResult?.impossible ? 'quality-bad' : ''}`}>{rowResult?.quality ?? '-'}</div>
          </div>
        );
      })}
    </div>
  );
}
