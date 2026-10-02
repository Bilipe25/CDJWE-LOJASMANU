const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sharp = require('sharp');
const { carregar } = require('./helpers/carregar.cjs');

function worker({ networkFails = false, stored = {}, names = [] } = {}) {
  const handlers = {}, removed = [], fetched = [], added = [], cache = new Map(Object.entries(stored));
  const state = { claimed: 0, skipped: 0 };
  vm.runInNewContext(fs.readFileSync('src/pwa/sw.js', 'utf8'), {
    URL, Response,
    self: {
      location: { origin: 'https://lojas.example' }, registration: { scope: 'https://lojas.example/' },
      clients: { claim: async () => { state.claimed++; } },
      skipWaiting: async () => { state.skipped++; },
      addEventListener: (name, handler) => { handlers[name] = handler; },
    },
    caches: {
      open: async () => ({ addAll: async urls => { added.push(...urls); }, match: async key => cache.get(key) }),
      keys: async () => names,
      delete: async name => { removed.push(name); },
    },
    fetch: async request => {
      fetched.push(request);
      if (networkFails) throw new TypeError('Offline');
      return new Response('online');
    },
  });
  async function lifecycle(name, data) {
    let pending;
    handlers[name]({ data, waitUntil: promise => { pending = promise; } });
    await pending;
  }
  function request(path, options = {}) {
    let response;
    handlers.fetch({ request: { url: new URL(path, 'https://lojas.example').href, method: 'GET', mode: 'cors', headers: new Headers(), ...options }, respondWith: promise => { response = promise; } });
    return response;
  }
  return { lifecycle, request, state, removed, fetched, added };
}

test('manifest possui identidade estável e ícones reais nas dimensões declaradas', async () => {
  const manifest = require('../public/manifest.json');
  assert.equal(manifest.id, '/'); assert.equal(manifest.scope, '/');
  assert.equal(manifest.orientation, 'any');
  for (const icon of manifest.icons) {
    const meta = await sharp('public' + icon.src).metadata();
    assert.equal(`${meta.width}x${meta.height}`, icon.sizes);
    assert.equal(meta.format, 'png');
  }
  for (const [file, size] of [['apple-touch-icon.png', 180], ['favicon-32x32.png', 32]]) {
    const meta = await sharp('public/' + file).metadata();
    assert.equal(meta.width, size); assert.equal(meta.height, size);
  }
});

test('toda a arte do ícone maskable está dentro da área circular segura e o fundo é opaco', async () => {
  const { data, info } = await sharp('public/icon-maskable-512x512.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    assert.equal(data[i + 3], 255);
    if (Math.hypot(x - 255.5, y - 255.5) > 512 * 0.4) {
      assert.ok(data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250, `arte fora da zona segura em ${x},${y}`);
    }
  }
});

test('worker só pré-carrega recursos públicos e aguarda aprovação de atualização', async () => {
  const w = worker(); await w.lifecycle('install');
  assert.ok(w.added.includes('/offline.html'));
  assert.ok(w.added.every(url => url === '/offline.html' || url.endsWith('.png')));
  assert.equal(w.state.skipped, 0);
  await w.lifecycle('message', { type: 'SKIP_WAITING' });
  assert.equal(w.state.skipped, 1);
});

test('Supabase, autenticação, APIs, mutações e RSC não são interceptados pelo cache', () => {
  const w = worker();
  for (const [path, options] of [
    ['https://empresa.supabase.co/rest/v1/clientes', {}],
    ['https://empresa.supabase.co/auth/v1/token', {}],
    ['/api/trpc/pedidos.listar', {}], ['/api', {}], ['/pdv', { method: 'POST' }],
    ['/clientes?_rsc=123', {}], ['/clientes', { headers: new Headers({ RSC: '1' }) }],
    ['/pedidos', { headers: new Headers({ 'Next-Router-Prefetch': '1' }) }],
    ['/_next/static/chunk.js', {}],
  ]) assert.equal(w.request(path, options), undefined, path);
});

test('navegações usam a rede e só exibem fallback na falha de conexão', async () => {
  const offline = new Response('offline seguro');
  const w = worker({ networkFails: true, stored: { '/offline.html': offline } });
  assert.equal(await (await w.request('/pedidos', { mode: 'navigate' })).text(), 'offline seguro');
  assert.equal((await worker({ networkFails: true }).request('/clientes', { mode: 'navigate' })).type, 'error');
  assert.equal(await (await worker().request('/pdv', { mode: 'navigate' })).text(), 'online');
});

test('ícones pré-carregados ficam disponíveis sem conexão', async () => {
  const w = worker({ networkFails: true, stored: { '/icon-192x192.png': new Response('png') } });
  assert.equal(await (await w.request('/icon-192x192.png')).text(), 'png');
  assert.equal(w.fetched.length, 0);
});

test('ativação limpa dados legados e versões antigas sem apagar caches de outros aplicativos', async () => {
  const w = worker({ names: ['supabase-cache', 'lojasmanu-pwa-anterior', 'lojasmanu-pwa-__PWA_REVISION__', 'workbox-precache-v2-https://lojas.example/', 'workbox-precache-v2-https://lojas.example/outro/', 'outro-app'] });
  await w.lifecycle('activate');
  assert.deepEqual(w.removed, ['supabase-cache', 'lojasmanu-pwa-anterior', 'workbox-precache-v2-https://lojas.example/']);
  assert.equal(w.state.claimed, 1);
});

test('registro identifica worker aguardando atualização, usa rede e não recarrega ao reconectar', async () => {
  const { registrarPWA } = carregar('src/lib/pwa/registro.ts');
  const handlers = new Map(), registrationHandlers = new Map();
  let updates = 0, notified = 0, parameters;
  const registration = { waiting: {}, installing: null, update: async () => { updates++; }, addEventListener: (n, h) => registrationHandlers.set(n, h), removeEventListener: n => registrationHandlers.delete(n) };
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true, serviceWorker: { controller: {}, register: async (...args) => { parameters = args; return registration; } } } });
  global.window = { addEventListener: (n, h) => handlers.set(n, h), removeEventListener: n => handlers.delete(n) };
  try {
    const dispose = registrarPWA(r => { assert.equal(r, registration); notified++; });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(parameters, ['/sw.js', { scope: '/', updateViaCache: 'none' }]);
    assert.equal(notified, 1); assert.equal(updates, 1);
    handlers.get('online')(); assert.equal(updates, 1); // Cooldown prevents a retry loop.
    dispose(); assert.equal(handlers.size, 0); assert.equal(registrationHandlers.size, 0);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    delete global.window;
  }
});
