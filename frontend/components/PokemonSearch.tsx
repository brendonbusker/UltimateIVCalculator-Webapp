'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

type SearchItem = {
  name: string;
};

export default function PokemonSearch({ value, onChange }: Props) {
  const [matches, setMatches] = useState<string[]>([]);
  const [draftValue, setDraftValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFiltering, setIsFiltering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function loadPokemon() {
      try {
        const res = await fetch(`${API_URL}/pokemon/search?limit=0`, { signal: controller.signal, cache: 'force-cache' });
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as SearchItem[];
        if (alive) {
          setMatches(data.map((entry) => entry.name));
        }
      } catch {
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadPokemon();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setDraftValue(value);
      setIsFiltering(false);
    }
  }, [open, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMatches = useMemo(() => {
    if (!isFiltering) {
      return matches;
    }

    const normalizedQuery = draftValue.trim().toLowerCase();
    if (!normalizedQuery) {
      return matches;
    }

    return matches.filter((match) => match.toLowerCase().includes(normalizedQuery));
  }, [draftValue, isFiltering, matches]);

  useEffect(() => {
    setActiveIndex(0);
  }, [draftValue, isFiltering]);

  useEffect(() => {
    const activeItem = optionRefs.current[activeIndex];
    if (open && activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, filteredMatches, open]);

  function openMenu() {
    setOpen(true);
    setDraftValue(value);
    setIsFiltering(false);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function selectName(name: string) {
    onChange(name);
    setDraftValue(name);
    setIsFiltering(false);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (!filteredMatches.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredMatches.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredMatches.length) % filteredMatches.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectName(filteredMatches[activeIndex]);
    }
  }

  return (
    <div className="search-shell" ref={containerRef}>
      <input
        ref={inputRef}
        className="field-input search-input"
        value={open ? draftValue : value}
        onFocus={openMenu}
        onClick={() => {
          if (!open) {
            openMenu();
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          setIsFiltering(true);
          onChange(nextValue);
        }}
        onKeyDown={handleKeyDown}
        placeholder=""
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      <span className="chevron search-chevron" aria-hidden="true" />

      {open && (
        <div className="search-panel" role="listbox" aria-label="Pokemon options">
          {loading ? <div className="search-empty">Loading Pokemon...</div> : null}
          {!loading && filteredMatches.length === 0 ? <div className="search-empty">No Pokemon found.</div> : null}
          {!loading && filteredMatches.map((match, index) => (
            <button
              key={match}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              className={`search-item ${index === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                selectName(match);
              }}
            >
              {match}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

