// Canonical deployment identity, independent of the local preview's host.
// This is a GitHub Pages project site; preserve the repository path and trailing slash.
export const SITE = {
  name: 'Ultimate IV Calculator',
  url: 'https://brendonbusker.github.io/UltimateIVCalculator-Webapp/',
  title: 'Pokémon IV Calculator – Generations 1–9 | Ultimate IV Calculator',
  description:
    'Calculate Pokémon IV ranges for Generations 3–9 and DVs for Gen 1–2. Enter your Pokémon’s level, stats, nature and training values in this free calculator.',
};

// Describes the real tool, without fabricated ratings or rich-result claims.
export const applicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE.name,
  alternateName: 'Pokémon IV Calculator',
  url: SITE.url,
  description: SITE.description,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript and an internet connection.',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: 0 },
};
