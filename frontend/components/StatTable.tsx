'use client';

export const STAT_ORDER = [
  { key: 'hp', label: 'HP', color: '#FF5959' },
  { key: 'attack', label: 'ATK', color: '#F5AC78' },
  { key: 'defense', label: 'DEF', color: '#FAE078' },
  { key: 'special-attack', label: 'SPATK', color: '#9DB7F5' },
  { key: 'special-defense', label: 'SPDEF', color: '#A7DB8D' },
  { key: 'speed', label: 'SPD', color: '#FA92B2' },
] as const;

type StatTableProps = {
  observedStats: Record<string, number>;
  evs: Record<string, number>;
  baseStats: Record<string, number>;
  results: Record<string, { iv_range: string; quality: string; meter_value: number }>;
  onObservedChange: (key: string, value: number) => void;
  onEVChange: (key: string, value: number) => void;
};

export default function StatTable({ observedStats, evs, baseStats, results, onObservedChange, onEVChange }: StatTableProps) {
  return (
    <div className="card table-card">
      <table className="stats-table">
        <thead>
          <tr>
            <th>STAT</th>
            <th>OBSERVED</th>
            <th>EV</th>
            <th>BASE</th>
            <th>IV RANGE</th>
            <th>IV METER</th>
            <th>QUALITY</th>
          </tr>
        </thead>
        <tbody>
          {STAT_ORDER.map((stat) => {
            const result = results[stat.key] ?? { iv_range: 'N/A', quality: '-', meter_value: 0 };
            return (
              <tr key={stat.key}>
                <td>
                  <div className="stat-name" style={{ color: stat.color }}>{stat.label}</div>
                </td>
                <td>
                  <input
                    className="mini-input"
                    type="number"
                    min={0}
                    max={999}
                    value={observedStats[stat.key] ?? 0}
                    onChange={(e) => onObservedChange(stat.key, Number(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <input
                    className="mini-input"
                    type="number"
                    min={0}
                    max={255}
                    value={evs[stat.key] ?? 0}
                    onChange={(e) => onEVChange(stat.key, Number(e.target.value) || 0)}
                  />
                </td>
                <td><div className="result-pill">{baseStats[stat.key] ?? '-'}</div></td>
                <td><div className="result-pill">{result.iv_range}</div></td>
                <td>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(1, result.meter_value)) * 100}%`, background: stat.color }} />
                  </div>
                </td>
                <td><div className="quality-pill">{result.quality}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
