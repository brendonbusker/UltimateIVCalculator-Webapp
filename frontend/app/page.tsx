import PokedexShell from '@/components/pokedex/PokedexShell';
import CalculatorGuide from '@/components/CalculatorGuide';
import { applicationJsonLd } from '@/lib/site-config';

export default function Page() {
  return (
    <>
      <main>
        <noscript>
          <p className="script-notice">
            Enable JavaScript to use the interactive calculator. The guide below
            explains the inputs and supported generations.
          </p>
        </noscript>
        <PokedexShell />
        <CalculatorGuide />
      </main>
      <footer className="site-footer">
        <p>
          Pokémon and related names are trademarks of their respective owners.
          This is an unofficial fan-made tool, not affiliated with or endorsed by
          Nintendo, Game Freak or The Pokémon Company.
        </p>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(applicationJsonLd).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}
