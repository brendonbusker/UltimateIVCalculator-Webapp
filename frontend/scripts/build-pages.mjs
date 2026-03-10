import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'UltimateIVCalculator-Webapp';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? `/${repoName}`;
const normalizedBasePath = basePath === '/' ? '' : basePath.replace(/\/$/, '');
const env = {
  ...process.env,
  NEXT_PUBLIC_DATA_MODE: 'static',
  NEXT_PUBLIC_BASE_PATH: basePath,
};

async function rewriteExportPaths(targetDir) {
  if (!normalizedBasePath) {
    return;
  }

  const entries = await readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await rewriteExportPaths(fullPath);
      continue;
    }

    if (!fullPath.endsWith('.html') && !fullPath.endsWith('.txt')) {
      continue;
    }

    const original = await readFile(fullPath, 'utf8');
    const rewritten = original
      .replaceAll('"/_next/', `"${normalizedBasePath}/_next/`)
      .replaceAll("'/_next/", `'${normalizedBasePath}/_next/`);

    if (rewritten !== original) {
      await writeFile(fullPath, rewritten, 'utf8');
    }
  }
}

const child = spawn('cmd.exe', ['/c', 'npx', 'next', 'build'], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
});

child.on('exit', async (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
    return;
  }

  const outDir = path.join(rootDir, 'out');
  await rewriteExportPaths(outDir);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, '.nojekyll'), '', 'utf8');
  process.exit(0);
});