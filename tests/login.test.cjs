const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { carregar } = require('./helpers/carregar.cjs');
const { getVersiculoDoDia, versiculos } = carregar('src/data/versiculos.ts');

test('versículo usa o mesmo dia do calendário independentemente da hora', () => {
  assert.deepEqual(getVersiculoDoDia(new Date(2026, 9, 2, 0, 1)), getVersiculoDoDia(new Date(2026, 9, 2, 23, 59)));
  assert.deepEqual(getVersiculoDoDia(new Date(2026, 0, 1)), versiculos[0]);
});

test('ano bissexto e ciclo respeitam a quantidade real de versículos', () => {
  assert.deepEqual(getVersiculoDoDia(new Date(2028, 1, 29)), versiculos[59 % versiculos.length]);
  assert.deepEqual(getVersiculoDoDia(new Date(2028, 2, 1)), versiculos[60 % versiculos.length]);
  for (let dia = 1; dia <= 366; dia++) assert.ok(getVersiculoDoDia(new Date(2028, 0, dia))?.texto);
});

test('mudança de horário de verão não desloca o versículo do calendário local', () => {
  const code = `const { carregar } = require('./tests/helpers/carregar.cjs'); const { getVersiculoDoDia, versiculos } = carregar('src/data/versiculos.ts'); const assert = require('node:assert/strict'); assert.deepEqual(getVersiculoDoDia(new Date(2026, 6, 1, 0, 0)), versiculos[181 % versiculos.length]);`;
  const result = spawnSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
