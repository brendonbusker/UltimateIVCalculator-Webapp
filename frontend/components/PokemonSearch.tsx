'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { searchPokemon } from '@/lib/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
};
export default function PokemonSearch({ value, onChange, onSelect }: Props) {
  const [names, setNames] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    void searchPokemon('')
      .then((data) => {
        if (alive) setNames(data);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  const matches = useMemo(
    () =>
      filter
        ? names.filter((name) =>
            name.toLowerCase().includes(value.trim().toLowerCase()),
          )
        : names,
    [names, value, filter],
  );
  useEffect(() => {
    if (open)
      panel.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  function choose(name: string) {
    onSelect(name);
    setOpen(false);
  }
  return (
    <div
      className="search-shell"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          const exact = names.find(
            (name) => name.toLowerCase() === value.trim().toLowerCase(),
          );
          if (exact) onSelect(exact);
        }
      }}
    >
      <input
        id="pokemon-input"
        className="field-input"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-controls={id}
        aria-expanded={open}
        aria-activedescendant={
          open && matches[active] ? `${id}-${active}` : undefined
        }
        value={value}
        placeholder="Select Pokémon"
        onFocus={() => {
          setOpen(true);
          setFilter(false);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setFilter(true);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
              open
                ? Math.max(
                    0,
                    Math.min(
                      matches.length - 1,
                      index + (event.key === 'ArrowDown' ? 1 : -1),
                    ),
                  )
                : 0,
            );
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault();
            choose(matches[active] || value);
          }
        }}
      />
      <span className="search-chevron" aria-hidden="true">
        ⌄
      </span>
      {open && (
        <div className="search-popup">
          {loading && <p className="search-message">Loading Pokémon…</p>}
          {error && (
            <div className="search-message">
              Search unavailable. You can enter a name.{' '}
              <button type="button" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </button>
            </div>
          )}
          {!loading && !error && !matches.length && (
            <p className="search-message">No matching Pokémon.</p>
          )}
          <div
            className="search-panel"
            id={id}
            role="listbox"
            aria-label="Pokémon options"
            ref={panel}
          >
            {matches.map((name, index) => (
              <div
                id={`${id}-${index}`}
                key={name}
                role="option"
                aria-selected={index === active}
                data-index={index}
                className={`search-item ${index === active ? 'active' : ''}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(name)}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
