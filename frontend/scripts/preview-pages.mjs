import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../out/', import.meta.url)));
const prefix = (process.env.NEXT_PUBLIC_BASE_PATH ?? '/UltimateIVCalculator-Webapp').replace(/\/$/, '');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === prefix && prefix) { res.writeHead(302, { Location: `${prefix}/` }); res.end(); return; }
    if (!pathname.startsWith(`${prefix}/`)) throw new Error('Not found');
    let target = path.resolve(root, `.${pathname.slice(prefix.length)}`);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Not found');
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(3102, '127.0.0.1', () => console.log(`Pages preview: http://127.0.0.1:3102${prefix}/`));
