import { test, expect, type Page } from '@playwright/test';

const stats = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
];
const image = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
function pokemon(name: string) {
  const id =
    name === 'suicune'
      ? 245
      : name === 'rotom'
        ? 479
        : name === 'rotom-wash'
          ? 10009
          : 1;
  return {
    id,
    name,
    height: 7,
    weight: 69,
    base_experience: 64,
    species: { name: name.startsWith('rotom') ? 'rotom' : name },
    forms: [],
    stats: stats.map((name, i) => ({
      stat: { name },
      base_stat: [45, 49, 49, 65, 65, 45][i],
      effort: i === 3 ? 1 : 0,
    })),
    abilities: [{ ability: { name: 'overgrow' }, is_hidden: false }],
    types: [{ slot: 1, type: { name: 'grass' } }],
    cries:
      name === 'rotom-wash'
        ? {}
        : { latest: 'https://raw.githubusercontent.com/test/cry.ogg' },
    sprites: {
      front_default: `https://raw.githubusercontent.com/test/${name}.png`,
      front_shiny: `https://raw.githubusercontent.com/test/${name}-shiny.png`,
      versions: {
        'generation-v': {
          'black-white': {
            animated: {
              front_default: `https://raw.githubusercontent.com/test/${name}.gif`,
              front_shiny: `https://raw.githubusercontent.com/test/${name}-shiny.gif`,
            },
          },
        },
      },
    },
  };
}
async function mockData(page: Page) {
  await page.route('**/pages-data/searchable-pokemon.json', (route) =>
    route.fulfill({
      json: ['Bulbasaur', 'Suicune', 'Rotom', 'Rotom-Wash'].map((name) => ({
        name,
      })),
    }),
  );
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.request().url().endsWith('.json')
      ? route.fulfill({ status: 404 })
      : route.fulfill({ body: image, contentType: 'image/png' }),
  );
  await page.route('https://pokeapi.co/api/v2/**', (route) => {
    const url = route.request().url();
    const name = url.split('/').at(-1)!;
    if (url.includes('/pokemon-species/'))
      return route.fulfill({
        json: {
          id: name === 'suicune' ? 245 : name === 'rotom' ? 479 : 1,
          generation: { name: 'generation-i' },
          gender_rate: -1,
          genera: [{ genus: 'Seed Pokémon', language: { name: 'en' } }],
          varieties: (name === 'rotom'
            ? ['rotom', 'rotom-wash', 'rotom-battle-only']
            : [name]
          ).map((name) => ({ pokemon: { name } })),
          flavor_text_entries: [
            {
              language: { name: 'en' },
              flavor_text: 'A strange seed was planted on its back at birth.',
            },
          ],
        },
      });
    return route.fulfill({ json: pokemon(name) });
  });
}
async function open(page: Page) {
  await mockData(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Skip Pokédex startup' }).click();
}
async function select(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Pokémon', exact: true }).fill(name);
  await page.getByRole('option', { name, exact: true }).click();
}

test('empty selection, preview, keyboard search, calculation and invalidation', async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByRole('combobox', { name: 'Pokémon', exact: true }),
  ).toHaveValue('');
  await expect(
    page.getByRole('img', { name: 'Bulbasaur, default sprite' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Calculate IVs' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Select or enter' }),
  ).toBeVisible();
  const picker = page.getByRole('combobox', { name: 'Pokémon', exact: true });
  await picker.fill('Bulba');
  await picker.press('Enter');
  await page.getByLabel('Nature', { exact: true }).selectOption('Hardy');
  const labels = ['HP', 'ATK', 'DEF', 'SPATK', 'SPDEF', 'SPD'];
  for (let i = 0; i < labels.length; i++)
    await page
      .getByRole('textbox', { name: `${labels[i]} observed`, exact: true })
      .fill(String([231, 134, 134, 166, 166, 126][i]));
  await page.getByRole('button', { name: 'Calculate IVs' }).click();
  await expect(
    page.locator('.quality-cell').filter({ hasText: /^Perfect$/ }),
  ).toHaveCount(6);
  await page.getByLabel('Level', { exact: true }).fill('50');
  await expect(
    page.locator('.quality-cell').filter({ hasText: /^Perfect$/ }),
  ).toHaveCount(0);
  await page.getByLabel('Generation', { exact: true }).selectOption('1');
  await expect(page.getByLabel('Nature', { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel('Characteristic', { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('textbox', { name: 'SPC observed', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.stat-row')).toHaveCount(5);
  await expect(
    page.getByRole('button', { name: 'Calculate DVs' }),
  ).toBeVisible();
});
test('physical shiny/forms/data controls, reduced motion, cry rejection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockData(page);
  await page.goto('./');
  await expect(page.locator('.device')).not.toHaveAttribute('inert', '');
  await expect(
    page.locator('.scanner-screen').getByRole('img'),
  ).toHaveAttribute('src', /bulbasaur\.png$/);
  await page.getByRole('button', { name: 'SHINY', exact: true }).click();
  await expect(
    page.locator('.scanner-screen').getByRole('img'),
  ).toHaveAttribute('src', /bulbasaur-shiny\.png$/);
  await expect(
    page.getByRole('button', { name: 'SHINY', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play Pokémon cry' }).click();
  await expect(page.locator('.audio-status')).toContainText(
    'Cry could not play',
  );
  await select(page, 'Rotom');
  await expect(page.getByRole('button', { name: 'FORMS' })).toBeEnabled();
  await page.getByRole('button', { name: 'FORMS' }).click();
  await expect(page.locator('.scanner-ident h2')).toHaveText('Rotom Wash');
  await expect(
    page.getByRole('button', { name: 'Play Pokémon cry' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'DATA', exact: true }).click();
  await expect(page.locator('#pokedex-data')).toBeFocused();
});
test('failed requests retry; old responses cannot overwrite a new selection', async ({
  page,
}) => {
  await open(page);
  let failures = 0;
  await page.route('**/pokemon/suicune', async (route) => {
    failures++;
    if (failures === 1) await route.fulfill({ status: 503 });
    else await route.fulfill({ json: pokemon('suicune') });
  });
  await select(page, 'Suicune');
  await expect(
    page.getByRole('button', { name: 'Retry display' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry display' }).click();
  await expect(page.locator('.scanner-ident h2')).toHaveText('Suicune');
  expect(failures).toBeGreaterThan(1);
  await page.route('**/pokemon/rotom', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.fulfill({ json: pokemon('rotom') });
  });
  await select(page, 'Rotom');
  await select(page, 'Bulbasaur');
  await page.waitForTimeout(1000);
  await expect(page.locator('.scanner-ident h2')).toHaveText('Bulbasaur');
});
test('animated image failure falls back to static', async ({ page }) => {
  await mockData(page);
  await page.route('**/*.gif', (route) => route.abort());
  await page.goto('./');
  await page.getByRole('button', { name: 'Skip Pokédex startup' }).click();
  await expect(
    page.locator('.scanner-screen').getByRole('img'),
  ).toHaveAttribute('src', /bulbasaur\.png$/);
});
test('editing while a calculation is pending discards its response', async ({ page }) => {
  await mockData(page);
  await page.route('**/pokemon-species/bulbasaur', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route.fulfill({ json: { id: 1, generation: { name: 'generation-i' }, varieties: [] } });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Skip Pokédex startup' }).click();
  await select(page, 'Bulbasaur');
  await page.getByRole('button', { name: 'Calculate IVs' }).click();
  await expect(page.getByRole('button', { name: 'Calculating…' })).toBeDisabled();
  await page.getByLabel('Level', { exact: true }).fill('50');
  await page.waitForTimeout(1900);
  await expect(page.locator('.result-summary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Calculate IVs' })).toBeEnabled();
  await expect(page.locator('.status-display')).toContainText('current inputs');
});
test('touch skip and post-intro Space button operation', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await mockData(page);
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3100/');
  await page.getByRole('button', { name: 'Skip Pokédex startup' }).tap();
  const shiny = page.getByRole('button', { name: 'SHINY', exact: true });
  await shiny.focus(); await shiny.press('Space');
  await expect(shiny).toHaveAttribute('aria-pressed', 'true');
  await context.close();
});
for (const key of ['Escape', 'Space'])
  test(`startup skips cleanly with ${key}`, async ({ page }) => {
    await mockData(page);
    await page.goto('./');
    await page.keyboard.press(key);
    await expect(page.locator('.device')).not.toHaveAttribute('inert', '');
    await expect(page.locator('.boot-skip')).toHaveCount(0);
    expect(
      await page
        .locator('.data-wing')
        .evaluate((el) => getComputedStyle(el).transform),
    ).toBe('none');
  });
test('fresh load completes without input, including slow networking', async ({
  page,
}) => {
  await mockData(page);
  await page.route('**/pokemon/bulbasaur', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3600));
    await route.fulfill({ json: pokemon('bulbasaur') });
  });
  await page.goto('./');
  await expect(page.locator('.boot-skip')).toHaveCount(0, { timeout: 3400 });
  await expect(
    page.getByRole('button', { name: 'Calculate IVs' }),
  ).toBeEnabled();
  await expect(page.locator('.scanner-screen').getByRole('img')).toBeVisible();
});
test('desktop, tablet and phone widths have no horizontal overflow', async ({
  page,
}) => {
  await open(page);
  for (const width of [
    320, 360, 375, 390, 412, 430, 768, 1024, 1200, 1366, 1440, 1920, 2560,
  ]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}`,
    ).toBe(true);
    if (width < 600) {
      expect(
        await page
          .locator('.stat-row input')
          .first()
          .evaluate((el) => el.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(44);
      expect(
        await page
          .locator('.scanner-wing')
          .evaluate((el) => el.getBoundingClientRect().top),
      ).toBeLessThan(
        await page
          .locator('.device-center')
          .evaluate((el) => el.getBoundingClientRect().top),
      );
    }
  }
});
