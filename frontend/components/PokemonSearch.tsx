'use client';

import { useEffect, useRef, useState } from 'react';

import { searchPokemon } from '@/lib/api';

type PokemonSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PokemonSearch({ value, onChange }: PokemonSearchProps) {
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const matches = await searchPokemon(value);
        setResults(matches);
        setOpen(matches.length > 0 && value.trim().length > 0);
        setHighlightedIndex(0);
      } catch {
        setResults([]);
        setOpen(false);
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [value]);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', listener);
    return () => window.removeEventListener('mousedown', listener);
  }, []);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="search-wrap" ref={wrapperRef}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setOpen(results.length > 0 && value.trim().length > 0)}
        onKeyDown={(event) => {
          if (!open || results.length === 0) {
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((current) => Math.min(current + 1, results.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            selectValue(results[highlightedIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="app-input"
        placeholder="Search Pokémon"
      />
      {open ? (
        <div className="search-dropdown">
          {results.map((result, index) => (
            <button
              key={result}
              type="button"
              className={`search-option ${index === highlightedIndex ? 'search-option-active' : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectValue(result)}
            >
              {result}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
