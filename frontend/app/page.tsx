
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;
type StatKey = typeof STAT_KEYS[number];

const VISIBLE_STAT_KEYS = (generation: number): StatKey[] =>
  generation === 1 ? ['hp', 'attack', 'defense', 'special-attack', 'speed'] : [...STAT_KEYS];

const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SPATK',
  'special-defense': 'SPDEF',
  speed: 'SPD',
};

const STAT_COLORS: Record<StatKey, string> = {
  hp: '#FF5959',
  attack: '#F5AC78',
  defense: '#FAE078',
  'special-attack': '#9DB7F5',
  'special-defense': '#A7DB8D',
  speed: '#FA92B2',
};

const CHANGELOG = `Version 2.0

what's new
• exact IV matching checks every IV from 0 to 31
• bigger dashboard layout with info cards and stat quality tags
• Pokémon info panel now shows typing, size, abilities, and forms
• EV tracker shows total EVs used and how much room is left
• impossible stat lines clearly show N/A and no-match status
• cleaner sprite panel, faster repeated loads, and safer API handling

how to use
• enter species, level, nature, stats, and EVs
• hit Calculate IVs
• look at the IV range plus the quick quality label
• if you know EVs are wrong, fix those first before trusting the range`;

const HELP = `Quick tips

Pokémon names
-----------------------
• spelling has to match the API
• forms usually need the full form name
• use the autocomplete box when possible

Best results
-----------------------
• level 100 gives the tightest results
• exact EVs matter a lot
• comparing stats across multiple levels helps narrow spreads

What N/A means
-----------------------
• that stat is impossible for the entered species
• or the level / EV / nature combo is wrong

UI notes
-----------------------
• IV bars are a quick visual, not exact proof
• the quality tag is based on the best matching IV`;

type PokemonSummary = {
  name: string;
  types: string[];
  abilities: string[];
  height_m: number;
  weight_kg: number;
  forms: string[];
  base_stats: Record<StatKey, number>;
  sprites: { default?: string | null; shiny?: string | null };
};

type CalculateResponse = {
  generation: number;
  pokemon: PokemonSummary;
  iv_ranges: Record<StatKey, string>;
  quality: Record<StatKey, string>;
  bars: Record<StatKey, number>;
  exact_values: Record<StatKey, number[]>;
  best_match: string;
  perfect_stats: string[];
  status: string;
  generation_notes: string[];
};

type SearchItem = { name: string };
type Option = { label: string; value: string | number };

function Dropdown({
  label,
  value,
  options,
  onSelect,
  disabled = false,
}: {
  label: string;
  value: string | number;
  options: Option[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className={`field-group dropdown-wrap ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`} ref={wrapRef}>
      <label>{label}</label>
      <button
        type="button"
        className="field-input field-button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span>{selected?.label ?? String(value)}</span>
        <span className="chevron">▾</span>
      </button>
      {open && !disabled && (
        <div className="search-panel">
          {options.map((opt) => (
            <button
              key={`${opt.value}`}
              className="search-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(String(opt.value));
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [sidebarTab, setSidebarTab] = useState<'updates' | 'help'>('updates');
  const [spriteTab, setSpriteTab] = useState<'default' | 'shiny'>('default');

  const [pokemonName, setPokemonName] = useState('Bulbasaur');
  const [generation, setGeneration] = useState(9);
  const [level, setLevel] = useState('100');
  const [nature, setNature] = useState('Adamant');
  const [characteristic, setCharacteristic] = useState('No Selection');

  const [generations, setGenerations] = useState<Option[]>([]);
  const [natures, setNatures] = useState<Option[]>([]);
  const [characteristics, setCharacteristics] = useState<Option[]>([{ label: 'No Selection', value: 'No Selection' }]);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const [pokemon, setPokemon] = useState<PokemonSummary | null>(null);
  const [calc, setCalc] = useState<CalculateResponse | null>(null);
  const [status, setStatus] = useState('Ready. Load a Pokémon and calculate IVs.');

  const [observedStats, setObservedStats] = useState<Record<StatKey, string>>({
    hp: '',
    attack: '',
    defense: '',
    'special-attack': '',
    'special-defense': '',
    speed: '',
  });

  const [efforts, setEfforts] = useState<Record<StatKey, string>>({
    hp: '0',
    attack: '0',
    defense: '0',
    'special-attack': '0',
    'special-defense': '0',
    speed: '0',
  });

  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const natureDisabled = generation <= 2;
  const characteristicDisabled = generation <= 3;
  const effortLabel = generation <= 2 ? 'Stat Exp' : 'EV';
  const effortSummaryLabel = generation <= 2 ? 'Stat Exp Mode' : 'EV Summary';

  const visibleStats = VISIBLE_STAT_KEYS(generation);

  const summaryText = useMemo(() => {
    if (generation <= 2) return 'Stat Exp values: 0-65535 per stat • no total cap';
    const total = STAT_KEYS.reduce((sum, key) => sum + (Number(efforts[key]) || 0), 0);
    const remain = Math.max(0, 510 - total);
    return `EV Total: ${total} / 510 • ${remain} left`;
  }, [efforts, generation]);

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('appearance_mode')) as 'dark' | 'light' | 'system' | null;
    setTheme(stored || 'system');
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('appearance_mode', theme);
  }, [theme]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/meta/generations`).then((r) => r.json()),
      fetch(`${API_BASE}/meta/characteristics`).then((r) => r.json()),
      fetch(`${API_BASE}/meta/natures`).then((r) => r.json()),
      fetch(`${API_BASE}/pokemon/Bulbasaur?generation=9`).then((r) => r.json()),
    ])
      .then(([genData, charData, natureData, bulba]) => {
        setGenerations((genData.generations || []).map((g: any) => ({ label: g.label, value: g.value })));
        setCharacteristics((charData.characteristics || ['No Selection']).map((c: string) => ({ label: c, value: c })));
        setNatures((natureData.natures || []).map((n: string) => ({ label: n, value: n })));
        setPokemon(bulba);
      })
      .catch(() => setStatus('Could not load startup data.'));
  }, []);

  useEffect(() => {
    if (generation <= 2) {
      setNature('Adamant');
      setCharacteristic('No Selection');
    } else if (generation === 3) {
      setCharacteristic('No Selection');
    }
  }, [generation]);

  useEffect(() => {
    if (generation === 1) {
      setObservedStats((prev) => ({ ...prev, 'special-defense': prev['special-attack'] }));
      setEfforts((prev) => ({ ...prev, 'special-defense': prev['special-attack'] }));
    }
  }, [generation]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setShowSearch(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function runSearch(value: string) {
    setPokemonName(value);
    if (!value.trim()) {
      setShowSearch(false);
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/pokemon/search?q=${encodeURIComponent(value)}`);
      const data: SearchItem[] = await res.json();
      setSearchResults(data);
      setShowSearch(true);
    } catch {
      setShowSearch(false);
    }
  }

  function setObserved(key: StatKey, value: string) {
    const clean = value.replace(/[^0-9]/g, '');
    setObservedStats((prev) => {
      const next = { ...prev, [key]: clean };
      if (generation === 1 && key === 'special-attack') next['special-defense'] = clean;
      return next;
    });
  }

  function setEffort(key: StatKey, value: string) {
    const clean = value.replace(/[^0-9]/g, '');
    setEfforts((prev) => {
      const next = { ...prev, [key]: clean };
      if (generation === 1 && key === 'special-attack') next['special-defense'] = clean;
      return next;
    });
  }

  function clearStats() {
    setObservedStats({
      hp: '',
      attack: '',
      defense: '',
      'special-attack': '',
      'special-defense': '',
      speed: '',
    });
    setCalc(null);
    setStatus('Stats cleared.');
  }

  function clearEfforts() {
    setEfforts({
      hp: '0',
      attack: '0',
      defense: '0',
      'special-attack': '0',
      'special-defense': '0',
      speed: '0',
    });
    setCalc(null);
    setStatus(generation <= 2 ? 'Stat Exp cleared.' : 'EVs cleared.');
  }

  async function loadAndCalculate() {
    try {
      if (!pokemonName.trim()) {
        setStatus('Enter a Pokémon name.');
        return;
      }
      const levelNum = Number(level);
      if (!Number.isInteger(levelNum) || levelNum < 1 || levelNum > 100) {
        setStatus('Level must be between 1 and 100.');
        return;
      }

      const effortMax = generation <= 2 ? 65535 : 255;
      const effortPayload = {} as Record<StatKey, number>;
      const observedPayload = {} as Record<StatKey, number>;

      for (const key of STAT_KEYS) {
        const obs = Number(observedStats[key] || '0');
        const eff = Number(efforts[key] || '0');
        if (!Number.isInteger(obs) || obs < 0 || obs > 999) {
          setStatus(`Observed ${STAT_LABELS[key]} must be between 0 and 999.`);
          return;
        }
        if (!Number.isInteger(eff) || eff < 0 || eff > effortMax) {
          setStatus(`${effortLabel} for ${STAT_LABELS[key]} must be between 0 and ${effortMax}.`);
          return;
        }
        observedPayload[key] = obs;
        effortPayload[key] = eff;
      }

      if (generation >= 3) {
        const total = Object.values(effortPayload).reduce((a, b) => a + b, 0);
        if (total > 510) {
          setStatus('Total EVs cannot exceed 510.');
          return;
        }
      }

      const pokemonRes = await fetch(`${API_BASE}/pokemon/${encodeURIComponent(pokemonName)}?generation=${generation}`);
      const pokemonData = await pokemonRes.json();
      if (!pokemonRes.ok) {
        setStatus(pokemonData.detail || 'Pokémon not found.');
        return;
      }
      setPokemon(pokemonData);

      const calcRes = await fetch(`${API_BASE}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pokemon_name: pokemonName,
          generation,
          level: levelNum,
          nature: natureDisabled ? null : nature,
          characteristic: characteristicDisabled ? null : characteristic,
          observed_stats: observedPayload,
          effort_values: effortPayload,
        }),
      });
      const calcData = await calcRes.json();
      if (!calcRes.ok) {
        setStatus(calcData.detail || 'Calculation failed.');
        setCalc(null);
        return;
      }
      setCalc(calcData);
      setStatus(calcData.status);
    } catch {
      setStatus('Network error while contacting the API.');
    }
  }

  const displayPokemon = calc?.pokemon || pokemon;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-card brand-card">
          <h1>Calculator</h1>
          <a href="https://github.com/brendonbusker" target="_blank" rel="noreferrer" className="github-link">https://github.com/brendonbusker</a>
        </div>

        <div className="sidebar-card sidebar-scroll-card">
          <div className="tabs">
            <button className={`tab ${sidebarTab === 'updates' ? 'active' : ''}`} onClick={() => setSidebarTab('updates')}>Updates</button>
            <button className={`tab ${sidebarTab === 'help' ? 'active' : ''}`} onClick={() => setSidebarTab('help')}>Help</button>
          </div>
          <div className="sidebar-scroll-body">
            <pre className="sidebar-pre">{sidebarTab === 'updates' ? CHANGELOG : HELP}</pre>
          </div>
        </div>

        <div className="sidebar-card status-card">
          <h3>Status</h3>
          <p className="status-text">{status}</p>
          {calc?.generation_notes?.length ? (
            <div className="status-notes-scroll">
              <ul className="mini-notes">
                {calc.generation_notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="sidebar-card">
          <h3>Appearance Mode</h3>
          <div className="theme-group">
            <button className={`theme-button ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
            <button className={`theme-button ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light</button>
            <button className={`theme-button theme-button-system ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')}>System</button>
          </div>
        </div>
      </aside>

      <section className="main-grid">
        <header className="summary-card">
          <div>
            <h2>{displayPokemon?.name || 'Bulbasaur'}</h2>
            <p>Typing: {Array.isArray(displayPokemon?.types) ? displayPokemon.types.join(' / ') : '-'}</p>
          </div>
          <div>
            <p><strong>Best Match:</strong> {calc?.best_match || '-'}</p>
            <p><strong>Perfect Stats:</strong> {calc?.perfect_stats?.join(', ') || '-'}</p>
          </div>
          <div>
            <p><strong>Abilities:</strong> {Array.isArray(displayPokemon?.abilities) ? displayPokemon.abilities.join(', ') : '-'}</p>
            <p><strong>Size:</strong> {displayPokemon ? `${displayPokemon.height_m} m • ${displayPokemon.weight_kg} kg` : '-'}</p>
          </div>
          <div>
            <p><strong>Forms:</strong> {Array.isArray(displayPokemon?.forms) ? displayPokemon.forms.join(', ') : '-'}</p>
          </div>
        </header>

        <section className="left-column">
          <div className="card controls-card">
            <div className="controls-grid">
              <div ref={searchWrapRef} className="search-wrap field-group">
                <label>Pokémon</label>
                <input
                  className="field-input"
                  value={pokemonName}
                  onChange={(e) => runSearch(e.target.value)}
                  onFocus={() => { if (searchResults.length) setShowSearch(true); }}
                />
                {showSearch && searchResults.length > 0 && (
                  <div className="search-panel">
                    {searchResults.map((item) => (
                      <button
                        key={item.name}
                        className="search-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPokemonName(item.name);
                          setShowSearch(false);
                        }}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Dropdown label="Generation" value={generation} options={generations} onSelect={(v) => setGeneration(Number(v))} />
              <div className="field-group">
                <label>Level</label>
                <input className="field-input" value={level} onChange={(e) => setLevel(e.target.value.replace(/[^0-9]/g, ''))} />
              </div>
              <Dropdown label="Nature" value={nature} options={natures} onSelect={setNature} disabled={natureDisabled} />
              <Dropdown label="Characteristic" value={characteristic} options={characteristics} onSelect={setCharacteristic} disabled={characteristicDisabled} />

              <div className="field-group summary-field">
                <label>{effortSummaryLabel}</label>
                <div className="field-input static-field">{summaryText}</div>
              </div>

              <div className="button-row">
                <button className="secondary-button" onClick={clearStats}>Clear Stats</button>
                <button className="secondary-button" onClick={clearEfforts}>Clear {generation <= 2 ? 'Stat Exp' : 'EVs'}</button>
                <button className="primary-button" onClick={loadAndCalculate}>Load Pokémon &amp; Calculate</button>
              </div>
            </div>
          </div>

          <div className="card">
            <table className="stat-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>Observed</th>
                  <th>{effortLabel}</th>
                  <th>Base</th>
                  <th>{generation <= 2 ? 'DV Range' : 'IV Range'}</th>
                  <th>{generation <= 2 ? 'DV Meter' : 'IV Meter'}</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                {visibleStats.map((key) => {
                  const label = generation === 1 && key === 'special-attack' ? 'SPC' : STAT_LABELS[key];
                  const quality = calc?.quality?.[key] ?? '-';
                  return (
                    <tr key={key}>
                      <td className="stat-name" style={{ color: STAT_COLORS[key] }}>{label}</td>
                      <td>
                        <input className="table-input" value={observedStats[key]} onChange={(e) => setObserved(key, e.target.value)} />
                      </td>
                      <td>
                        <input className="table-input" value={efforts[key]} onChange={(e) => setEffort(key, e.target.value)} />
                      </td>
                      <td><div className="table-pill">{displayPokemon?.base_stats?.[key] ?? '-'}</div></td>
                      <td><div className="table-pill">{calc?.iv_ranges?.[key] ?? 'N/A'}</div></td>
                      <td>
                        <div className="meter">
                          <div className="meter-fill" style={{ width: `${(calc?.bars?.[key] ?? 0) * 100}%`, backgroundColor: STAT_COLORS[key] }} />
                        </div>
                      </td>
                      <td><div className="table-pill quality-pill">{quality}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card status-banner">{status}</div>
        </section>

        <aside className="right-column">
          <div className="card">
            <h3 className="card-title">Sprites</h3>
            <div className="sprite-tabs">
              <button className={`sprite-toggle ${spriteTab === 'default' ? 'active' : ''}`} onClick={() => setSpriteTab('default')}>Default</button>
              <button className={`sprite-toggle ${spriteTab === 'shiny' ? 'active' : ''}`} onClick={() => setSpriteTab('shiny')}>Shiny</button>
            </div>
            <div className="sprite-frame">
              {displayPokemon?.sprites?.[spriteTab] ? (
                <img src={displayPokemon.sprites[spriteTab] ?? ''} alt={`${displayPokemon.name} ${spriteTab}`} />
              ) : (
                <div className="sprite-empty">No sprite</div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Quick Readout</h3>
            <div className="readout-grid">
              <span>Species</span><span>{displayPokemon?.name || '-'}</span>
              <span>Typing</span><span>{Array.isArray(displayPokemon?.types) ? displayPokemon.types.join(' / ') : '-'}</span>
              <span>Size</span><span>{displayPokemon ? `${displayPokemon.height_m} m • ${displayPokemon.weight_kg} kg` : '-'}</span>
              <span>Forms</span><span>{Array.isArray(displayPokemon?.forms) ? displayPokemon.forms.join(', ') : '-'}</span>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Extra Notes</h3>
            <ul className="notes-list">
              <li>A perfect result means the stat is guaranteed to be the maximum value for that generation.</li>
              <li>Characteristics are optional and only apply in Generation 4 and later.</li>
              <li>Generation 1 uses one shared Special stat, so the UI only shows one Special row.</li>
              <li>Historical stats for older generations are cached locally for reuse.</li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
