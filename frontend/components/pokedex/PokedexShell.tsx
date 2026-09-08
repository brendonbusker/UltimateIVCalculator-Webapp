'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIVCalculator } from '@/hooks/useIVCalculator';
import { usePokemonDisplayData } from '@/hooks/usePokemonDisplayData';
import CalculatorScreen from '@/components/calculator/CalculatorScreen';
import DataScreen from './DataScreen';
import ScannerScreen from './ScannerScreen';

function LensCluster() {
  return (
    <div className="lens-cluster" aria-hidden="true">
      <span className="main-lens">
        <i />
      </span>
      <span className="hardware-led red" />
      <span className="hardware-led yellow" />
      <span className="hardware-led green" />
    </div>
  );
}
function Cover({ lens = false }: { lens?: boolean }) {
  return (
    <div className="wing-back" aria-hidden="true">
      <div className="cover-header">
        {lens ? (
          <LensCluster />
        ) : (
          <>
            <span className="screw" />
            <span className="cover-vent" />
          </>
        )}
      </div>
      <div className="cover-inlay">
        <span className="cover-insignia" />
      </div>
      <div className="cover-bottom">
        <span className="screw" />
        <span className="cover-grip" />
        <span className="screw" />
      </div>
    </div>
  );
}
function DirectionPad() {
  const cross =
    'M34 4H62Q66 4 66 8V30H88Q92 30 92 34V62Q92 66 88 66H66V88Q66 92 62 92H34Q30 92 30 88V66H8Q4 66 4 62V34Q4 30 8 30H30V8Q30 4 34 4Z';
  return (
    <div className="direction-pad">
      <svg viewBox="0 0 96 104" aria-hidden="true">
        <defs>
          <linearGradient id="dpad-face" x2=".25" y2="1">
            <stop stopColor="#515a62" />
            <stop offset=".46" stopColor="#2c343b" />
            <stop offset="1" stopColor="#171e24" />
          </linearGradient>
          <radialGradient id="dpad-dimple">
            <stop stopColor="#182128" />
            <stop offset=".75" stopColor="#202a32" />
            <stop offset="1" stopColor="#48545e" />
          </radialGradient>
        </defs>
        <path
          d={cross}
          transform="translate(0 7)"
          fill="#080c10"
          stroke="#080a0c"
          strokeWidth="4"
        />
        <path
          d={cross}
          fill="url(#dpad-face)"
          stroke="#111920"
          strokeWidth="2"
        />
        <path
          d="M6 46V35Q6 32 9 32H32V9Q32 6 35 6H61Q64 6 64 9M67 32H87Q90 32 90 35"
          fill="none"
          stroke="#89959f"
          strokeWidth="1.5"
          opacity=".65"
        />
        <path
          d="M43 23L48 16L53 23ZM73 43L80 48L73 53ZM53 73L48 80L43 73ZM23 53L16 48L23 43Z"
          fill="#111920"
          stroke="#73808b"
          strokeOpacity=".35"
        />
        <circle
          cx="48"
          cy="48"
          r="10"
          fill="url(#dpad-dimple)"
          stroke="#10161b"
        />
      </svg>
    </div>
  );
}
export default function PokedexShell() {
  const calculator = useIVCalculator();
  const display = usePokemonDisplayData(calculator.selected);
  const [booting, setBooting] = useState(true);
  const [shiny, setShiny] = useState(false);
  const [reset, setReset] = useState(0);
  const [audioError, setAudioError] = useState('');
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioVersion = useRef(0);
  const device = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!booting || !device.current) return;
    const shell = device.current;
    const left = shell.querySelector<HTMLElement>('.data-wing')!;
    const right = shell.querySelector<HTMLElement>('.scanner-wing')!;
    const measure = () => {
      // Layout dimensions stay stable while the camera and wings are transformed.
      const span = right.offsetLeft - (left.offsetLeft + left.offsetWidth);
      shell.style.setProperty(
        '--cover-width',
        `${Math.max(0, (span - 8) / 2)}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [booting]);
  useEffect(() => {
    if (!booting) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => setBooting(false);
    const timer = window.setTimeout(finish, reduced.matches ? 150 : 2850);
    const keydown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'Escape') {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', keydown);
    reduced.addEventListener('change', finish);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', keydown);
      reduced.removeEventListener('change', finish);
    };
  }, [booting]);
  useEffect(() => {
    const owner = audioVersion;
    owner.current++;
    audio.current?.pause();
    audio.current = null;
    setPlaying(false);
    setAudioError('');
    return () => {
      owner.current++;
      audio.current?.pause();
    };
  }, [calculator.selected]);
  async function playCry() {
    const urls = display.data?.cries ?? [];
    const version = ++audioVersion.current;
    audio.current?.pause();
    setAudioError('');
    for (const url of urls) {
      if (audioVersion.current !== version) return;
      const sound = new Audio();
      sound.preload = 'none';
      sound.src = url;
      audio.current = sound;
      sound.onended = () => {
        if (audioVersion.current === version) setPlaying(false);
      };
      try {
        await sound.play();
        if (audioVersion.current !== version) {
          sound.pause();
          return;
        }
        setPlaying(true);
        return;
      } catch {
        sound.pause();
      }
    }
    if (audioVersion.current === version) {
      setPlaying(false);
      setAudioError('Cry could not play. Press CRY to retry.');
    }
  }
  function showData() {
    setReset((value) => value + 1);
    document.getElementById('pokedex-data')?.focus({ preventScroll: false });
  }
  function nextForm() {
    const forms = display.data?.forms ?? [];
    const current = forms.findIndex(
      (form) => form.toLowerCase() === (calculator.selected || 'bulbasaur'),
    );
    if (forms.length > 1)
      calculator.selectPokemon(forms[(current + 1) % forms.length]);
  }
  return (
    <main className={`device-scene ${booting ? 'is-booting' : 'is-ready'}`}>
      <div className="device" ref={device} inert={booting}>
        <aside className="device-wing data-wing">
          <LensCluster />
          <div className="wing-screen-wrap">
            <DataScreen
              data={display.data}
              summary={calculator.pokemon}
              loading={display.loading}
              error={display.error}
              retry={display.retry}
              reset={reset}
            />
          </div>
          <div className="hardware-footer" aria-hidden="true">
            <span className="screw" />
            <div className="speaker" />
            <span className="screw" />
          </div>
          <Cover lens />
        </aside>
        <section className="device-center">
          <span className="hinge hinge-left" aria-hidden="true" />
          <CalculatorScreen state={calculator} />
          <div className="center-footer" aria-hidden="true">
            <span className="screw" />
            <span className="grip" />
            <span className="grip" />
            <span className="screw" />
          </div>
          <span className="hinge hinge-right" aria-hidden="true" />
        </section>
        <aside className="device-wing scanner-wing">
          <div className="mobile-lens">
            <LensCluster />
          </div>
          <div className="scanner-top" aria-hidden="true">
            <span />
            <span />
            <i className="screw" />
          </div>
          <ScannerScreen
            data={display.data}
            summary={calculator.pokemon}
            shiny={shiny}
            loading={display.loading}
          />
          <div className="physical-controls" aria-label="Pokédex controls">
            <button onClick={showData}>DATA</button>
            <button
              aria-pressed={shiny}
              onClick={() => setShiny((value) => !value)}
            >
              SHINY
            </button>
            <button
              disabled={
                (display.data?.forms.length ?? 0) < 2 || display.loading
              }
              onClick={nextForm}
            >
              FORMS
            </button>
            <button
              disabled={!display.data?.cries.length || display.loading}
              aria-label={playing ? 'Replay Pokémon cry' : 'Play Pokémon cry'}
              onClick={() => void playCry()}
            >
              CRY
            </button>
          </div>
          <div className="audio-status" role="status">
            {audioError ||
              (playing
                ? 'PLAYING CRY'
                : !display.loading && !display.data?.cries.length
                  ? 'Cry unavailable'
                  : '')}
          </div>
          <div className="lower-hardware" aria-hidden="true">
            <div className="speaker" />
            <div className="recessed-port" />
            <DirectionPad />
            <div className="round-controls">
              <span />
              <span />
            </div>
            <span className="hardware-led green" />
          </div>
          <div className="hardware-footer" aria-hidden="true">
            <span className="screw" />
            <span className="screw" />
          </div>
          <Cover />
        </aside>
      </div>
      {booting && (
        <button
          autoFocus
          className="boot-skip"
          onClick={() => setBooting(false)}
          aria-label="Skip Pokédex startup"
        >
          <span>
            POWERING ON <i>• • •</i>
          </span>
          <small>Click, tap, Space or Escape to skip</small>
        </button>
      )}
    </main>
  );
}
