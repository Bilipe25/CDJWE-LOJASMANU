// Technical exports of the supplied logo: no redrawing, cropping or alteration of the artwork.
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets/pwa/logo-original.png');
async function exportIcons() {
  const versions = [
    ['icon-192x192.png', 192, 0.92],
    ['icon-512x512.png', 512, 0.92],
    ['icon-maskable-512x512.png', 512, 0.64],
    ['apple-touch-icon.png', 180, 0.82],
    ['favicon-32x32.png', 32, 0.96],
  ];
  for (const [name, size, scale] of versions) {
    const drawing = await sharp(source).resize({ width: Math.round(size * scale), height: Math.round(size * scale), fit: 'inside' }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
      .composite([{ input: drawing, gravity: 'centre' }]).png().toFile(path.join(root, 'public', name));
  }
}
exportIcons().catch(error => { console.error(error); process.exitCode = 1; });
