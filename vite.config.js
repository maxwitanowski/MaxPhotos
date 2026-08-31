import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only endpoint: export.html POSTs each photo blob (and photos.json)
// here, and it lands in public/photos/ so the gallery becomes file-backed.
function photoSaver() {
  return {
    name: 'photo-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-photo', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('method not allowed');
        }
        const name = String(req.headers['x-filename'] || '');
        if (!/^[\w.-]+\.(jpg|png|json)$/i.test(name) || name.includes('..')) {
          res.statusCode = 400;
          return res.end('bad filename');
        }
        const dir = path.resolve(process.cwd(), 'public/photos');
        fs.mkdirSync(dir, { recursive: true });

        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
        req.on('error', () => {
          res.statusCode = 500;
          res.end('write failed');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [photoSaver()],
});
