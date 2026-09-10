// Server-rendered content: available in the exported HTML without API calls or JS.
const games = [
  ['Gen 1', 'Red, Blue and Yellow'],
  ['Gen 2', 'Gold, Silver and Crystal'],
  ['Gen 3', 'Ruby, Sapphire, Emerald, FireRed, LeafGreen, Colosseum and XD: Gale of Darkness'],
  ['Gen 4', 'Diamond, Pearl, Platinum, HeartGold and SoulSilver'],
  ['Gen 5', 'Black, White, Black 2 and White 2'],
  ['Gen 6', 'X, Y, Omega Ruby and Alpha Sapphire'],
  ['Gen 7', 'Sun, Moon, Ultra Sun and Ultra Moon'],
  ['Gen 8', 'Sword, Shield, Brilliant Diamond and Shining Pearl'],
  ['Gen 9', 'Scarlet and Violet'],
];

export default function CalculatorGuide() {
  return (
    <div className="calculator-guide">
      <section aria-labelledby="about-calculator">
        <h2 id="about-calculator">About this Pokémon IV calculator</h2>
        <p>
          Ultimate IV Calculator is a free tool for finding the possible Individual
          Values (IVs) behind your Pokémon’s stats. Select a Pokémon and its game’s
          generation, enter its level and displayed stats, then choose its nature
          and enter its Effort Values (EVs). Press Calculate IVs to see the possible
          range for each stat and any confirmed perfect values.
        </p>
        <p>
          IVs range from 0 to 31 in Generations 3–9. Generations 1–2 use DVs from
          0 to 15 and Stat Exp instead, so the controls adapt when you change
          generations. Gen 1 has a single Special stat; in Gen 1–2 the HP DV is
          derived from the other DVs. Natures apply from Gen 3, and an optional
          characteristic can help narrow results from Gen 4 onward.
        </p>
        <p>
          The Pokédex also shows species information and sprites. Use SHINY to
          switch the preview, FORMS to cycle available supported forms, and CRY
          to play a Pokémon’s cry when available.
        </p>
      </section>
      <section aria-labelledby="supported-games">
        <h2 id="supported-games">Choose the generation for your game</h2>
        <p>
          Use the following Pokémon games as a guide to the calculator’s standard
          stat rules. For example, choose Gen 3 for Pokémon Emerald or Colosseum,
          and Gen 4 for Pokémon Platinum. Select the generation of the game where
          you are reading the stats, including when using a remake.
        </p>
        <dl className="generation-guide">
          {games.map(([generation, titles]) => (
            <div key={generation}>
              <dt>{generation}</dt>
              <dd>{titles}</dd>
            </div>
          ))}
        </dl>
        <p className="guide-note">
          Available Pokémon and forms depend on the search list and generation.
          This tool does not implement the different stat systems in Pokémon GO,
          Let’s Go Pikachu/Eevee or Legends: Arceus, and cannot recover original
          IVs from Hyper Trained stats.
        </p>
      </section>
      <section className="calculator-faq" aria-labelledby="calculator-questions">
        <h2 id="calculator-questions">A few calculation tips</h2>
        <details>
          <summary>Why do I get an IV range instead of one number?</summary>
          <p>
            At lower levels, rounding means several IVs can produce the same
            displayed stat. Recalculate at a higher level with updated stats and
            training values to improve precision. Each calculation uses your
            current inputs; earlier results are not combined automatically.
          </p>
        </details>
        <details>
          <summary>What if I don’t know my Pokémon’s EVs?</summary>
          <p>
            EVs also affect stats. The starting value of zero is appropriate only
            when that stat has no EV training. This calculator does not infer
            unknown EVs or Stat Exp. Enter accurate training values for reliable
            IV or DV ranges.
          </p>
        </details>
        <details>
          <summary>Why does a stat say “No match”?</summary>
          <p>
            No candidate value fits those inputs. Check the Pokémon and form,
            generation, level, nature, training values and optional characteristic.
            Use the stats shown on its summary screen, without temporary battle
            modifiers. Changing an input clears the previous result until you
            calculate again.
          </p>
        </details>
      </section>
    </div>
  );
}
