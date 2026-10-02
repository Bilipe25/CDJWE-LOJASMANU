const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const hash = crypto.createHash('sha256');
function fingerprint(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) fingerprint(file);
    else { hash.update(path.relative(root, file)); hash.update(fs.readFileSync(file)); }
  }
}
fingerprint(path.join(root, 'src'));
for (const file of ['next.config.mjs', 'package-lock.json', 'public/offline.html', 'public/manifest.json', 'public/icon-192x192.png', 'public/icon-512x512.png', 'public/icon-maskable-512x512.png', 'public/apple-touch-icon.png', 'public/favicon-32x32.png']) {
  hash.update(file); hash.update(fs.readFileSync(path.join(root, file)));
}
const revision = hash.digest('hex').slice(0, 16);
const source = fs.readFileSync(path.join(root, 'src/pwa/sw.js'), 'utf8');
fs.writeFileSync(path.join(root, 'public/sw.js'), source.replace('__PWA_REVISION__', revision));
console.log(`PWA: service worker gerado (${revision})`);
