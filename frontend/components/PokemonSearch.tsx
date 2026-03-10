'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
};

export default function PokemonSearch({ value, onChange, onSelect }: Props) {
  const [matches, setMatches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = value.trim();
    const timer = setTimeout(async () => {
      try {
        const url = `${API_URL}/pokemon/search?q=${encodeURIComponent(query)}&limit=8`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setMatches(data.matches ?? []);
        setActiveIndex(0);
        setOpen((data.matches ?? []).length > 0 && document.activeElement?.tagName === 'INPUT');
      } catch {}
    }, 120);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasMatches = useMemo(() => open && matches.length > 0, [open, matches]);

  function selectName(name: string) {
    onChange(name);
    onSelect?.(name);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!hasMatches) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % matches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectName(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="search-shell" ref={containerRef}>
      <input
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(matches.length > 0)}
        onKeyDown={handleKeyDown}
        placeholder="Start typing a Pokémon..."
      />

      {hasMatches && (
        <div className="search-results card">
          {matches.map((match, index) => (
            <button
              key={match}
              type="button"
              className={`search-option ${index === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectName(match)}
            >
              {match}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
