/* A static server for the site, with no dependencies, so the checks below can
   run against the real files. It serves this repository from its root, which
   is what netlify.toml publishes. The /api/* paths are not faked here: use
   `netlify dev` for those.

   It does do one thing netlify.toml does, because the checks would otherwise be
   testing a site nobody visits: /en/ and /de/ serve the same files as the root.
   Those are the English and German addresses of every page, and the language a
   page opens in is read from them. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 4321);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

export function serve(port = PORT) {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(req.url.split('?')[0]);
    /* the language prefixes are addresses, not directories: they rewrite to the
       same file, exactly as the rewrites in netlify.toml do */
    path = path.replace(/^\/(en|de)(?=\/|$)/, '') || '/';
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    try {
      if ((await stat(file)).isDirectory()) throw new Error('dir');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serve().then(() => console.log(`the atelier is at http://localhost:${PORT}`));
}
