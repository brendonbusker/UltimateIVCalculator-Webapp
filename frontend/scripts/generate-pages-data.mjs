import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'public', 'pages-data');
const apiBase = process.env.PAGES_SOURCE_API ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

async function main() {
  const response = await fetch(`${apiBase}/pokemon/search?limit=0`);
  if (!response.ok) {
    throw new Error(`Could not load search data from ${apiBase} (status ${response.status}).`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Search payload was not an array.');
  }

  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'searchable-pokemon.json');
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${payload.length} searchable Pokemon to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
