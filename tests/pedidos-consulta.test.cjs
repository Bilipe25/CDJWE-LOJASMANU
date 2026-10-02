const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./helpers/carregar.cjs');
const { criarBanco } = require('./helpers/banco-pdv.cjs');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { validarFiltrosPedidos, erroPeriodoPedidos, urlComFiltros, filtrosDaUrl } = carregar('src/lib/schemas/filtros-pedidos.ts');
let banco, api;
before(async () => {
  banco = await criarBanco();
  api = pedidosRouter.createCaller({ supabase: banco.supabase, user: { id: banco.usuario }, role: 'ADMIN' });
  for (const [data, valor] of [['2026-09-10', 30], ['2026-10-02', 10], ['2026-10-01', 90], ['2026-10-01', 50]]) {
    await api.create({ data, tipo_atendimento_id: banco.atendimento, chave_requisicao: crypto.randomUUID(), itens: [{ produto_id: banco.produto, quantidade: 1, valor_unitario: valor }] });
  }
});
after(async () => banco?.close());

test('ordenação global ocorre antes da paginação e conserva total/filtros', async () => {
  const primeira = await api.list({ ordenarPor: 'total', direcao: 'desc', limit: 1 });
  const segunda = await api.list({ ordenarPor: 'total', direcao: 'desc', limit: 1, offset: 1 });
  assert.equal(primeira.total, 4); assert.equal(primeira.pedidos[0].total, 90); assert.equal(segunda.pedidos[0].total, 50);
  assert.equal((await api.list({ ordenarPor: 'total', direcao: 'asc', limit: 1 })).pedidos[0].total, 10);
  const periodo = await api.list({ ordenarPor: 'numero', direcao: 'asc', dataInicio: '2026-10-01', dataFim: '2026-10-02' });
  assert.equal(periodo.total, 3); assert.deepEqual(periodo.pedidos.map(p => p.numero), [2, 3, 4]);
  const paginaVazia = await api.list({ ordenarPor: 'data', offset: 100 });
  assert.equal(paginaVazia.total, 4); assert.equal(paginaVazia.pedidos.length, 0);
});

test('datas iguais são válidas; período invertido é preservado na UI e rejeitado nas consultas', async () => {
  const filtros = validarFiltrosPedidos({ dataInicio: '2026-10-03', dataFim: '2026-10-01' });
  assert.equal(filtros.dataInicio, '2026-10-03'); assert.equal(filtros.dataFim, '2026-10-01'); assert.ok(erroPeriodoPedidos(filtros));
  await assert.rejects(api.list({ dataInicio: filtros.dataInicio, dataFim: filtros.dataFim }), /data final/);
  await assert.rejects(api.estatisticas({ dataInicio: filtros.dataInicio, dataFim: filtros.dataFim }), /data final/);
  assert.equal(erroPeriodoPedidos({ dataInicio: '2026-10-01', dataFim: '2026-10-01' }), '');
});

test('retorno da edição preserva ordenação e omite nome privado na URL', () => {
  const filtros = validarFiltrosPedidos({ ordenarPor: 'total', direcao: 'asc', page: 2 });
  const url = urlComFiltros('/pedidos', filtros);
  const restaurados = filtrosDaUrl(new URLSearchParams(url.split('?')[1]));
  assert.equal(restaurados.ordenarPor, 'total'); assert.equal(restaurados.direcao, 'asc'); assert.equal(restaurados.page, 2);
});
