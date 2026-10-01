const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { initTRPC } = require('@trpc/server');

// Executa os routers reais com um banco em memória; nenhuma conexão externa.
const trpc = initTRPC.create();
const cache = new Map();
function carregar(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (name) => {
    if (name === '@/lib/trpc/server') return { router: trpc.router, publicProcedure: trpc.procedure };
    if (name.startsWith('@/')) return carregar(`src/${name.slice(2)}.ts`);
    return require(name);
  };
  vm.runInThisContext(`(function(require, module, exports) { ${source}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const { clientesRouter } = carregar('src/server/routers/clientes.ts');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { formatarEndereco, selecionarEndereco } = carregar('src/lib/utils/endereco.ts');

const clienteId = '11111111-1111-4111-8111-111111111111';
const outroClienteId = '22222222-2222-4222-8222-222222222222';
const principalId = '33333333-3333-4333-8333-333333333333';
const entregaId = '44444444-4444-4444-8444-444444444444';
const pedidoId = '55555555-5555-4555-8555-555555555555';
const atendimentoId = '66666666-6666-4666-8666-666666666666';
const endereco = {
  logradouro: 'Rua das Flores', numero: '123', complemento: 'Apto 2', bairro: 'Centro',
  cidade: 'Fortaleza', estado: 'CE', cep: '60000-000', principal: true,
};
const completo = 'Rua das Flores, 123, Apto 2, Centro, Fortaleza, CE, CEP: 60000-000';

function banco(tabelas = {}, falhas = {}) {
  const db = {
    tabelas,
    from(tabela) {
      let filtros = [], operacao = 'select', payload, unico = false, ordenacao, faixa;
      const q = {
        select() { return q; },
        eq(campo, valor) { filtros.push((row) => row[campo] === valor); return q; },
        in(campo, valores) { filtros.push((row) => valores.includes(row[campo])); return q; },
        range(inicio, fim) { faixa = [inicio, fim]; return q; },
        order(campo, opcoes) { ordenacao = [campo, opcoes]; return q; },
        insert(data) { operacao = 'insert'; payload = data; return q; },
        update(data) { operacao = 'update'; payload = data; return q; },
        single() { unico = true; return q; },
        then(resolve, reject) {
          if (falhas[tabela]) return Promise.resolve({ data: null, error: { message: falhas[tabela] } }).then(resolve, reject);
          const rows = tabelas[tabela] ||= [];
          let resultado = rows.filter((row) => filtros.every((filtro) => filtro(row)));
          if (operacao === 'insert') {
            resultado = (Array.isArray(payload) ? payload : [payload]).map((row) => ({ id: clienteId, ...row }));
            rows.push(...resultado);
          } else if (operacao === 'update') {
            resultado.forEach((row) => Object.assign(row, payload));
          }
          if (ordenacao) {
            const [campo, opcoes] = ordenacao;
            resultado = [...resultado].sort((a, b) => (Number(a[campo]) - Number(b[campo])) * (opcoes?.ascending === false ? -1 : 1));
          }
          const count = resultado.length;
          if (faixa) resultado = resultado.slice(faixa[0], faixa[1] + 1);
          const error = unico && resultado.length !== 1 ? { message: 'Registro não encontrado' } : null;
          return Promise.resolve({ data: unico ? resultado[0] || null : resultado, error, count }).then(resolve, reject);
        },
      };
      return q;
    },
    rpc: async () => ({ data: 10, error: null }),
  };
  return db;
}

test('criar cliente preserva os sete campos no banco e na consulta usada pelo PDV', async () => {
  const db = banco();
  const api = clientesRouter.createCaller({ supabase: db });
  await api.create({ nome: 'Cliente Teste', endereco });
  const salvo = await api.getById({ id: clienteId });
  assert.equal(formatarEndereco(salvo.enderecos[0]), completo);
  for (const campo of Object.keys(endereco)) assert.equal(db.tabelas.enderecos[0][campo], endereco[campo]);
});

test('editar mantém os campos e permite limpar complemento sem preservar o valor antigo', async () => {
  const db = banco({ clientes: [{ id: clienteId }], enderecos: [{ id: principalId, cliente_id: clienteId, ...endereco }] });
  await clientesRouter.createCaller({ supabase: db }).update({ id: clienteId, endereco: { ...endereco, complemento: '', numero: '456' } });
  assert.equal(db.tabelas.enderecos.length, 1);
  assert.equal(db.tabelas.enderecos[0].complemento, '');
  assert.equal(db.tabelas.enderecos[0].numero, '456');
});

test('editar cliente com endereço sem principal atualiza o mesmo registro', async () => {
  const db = banco({ clientes: [{ id: clienteId }], enderecos: [{ id: principalId, cliente_id: clienteId, ...endereco, principal: false }] });
  await clientesRouter.createCaller({ supabase: db }).update({ id: clienteId, endereco });
  assert.equal(db.tabelas.enderecos.length, 1);
});

test('listagem e detalhes de clientes recebem endereço completo mesmo com view antiga', async () => {
  const db = banco({ vw_clientes_completos: [{ id: clienteId, nome: 'Cliente', ativo: true }], enderecos: [{ id: principalId, cliente_id: clienteId, ...endereco }] });
  const lista = await clientesRouter.createCaller({ supabase: db }).list({ limit: 50 });
  assert.equal(lista.clientes[0].endereco_principal_completo, completo);
});

test('pedido para impressão carrega seu endereço de entrega, diferente do principal atual', async () => {
  const entrega = { id: entregaId, cliente_id: clienteId, ...endereco, numero: '987', principal: false };
  const db = banco({ vw_pedidos_completos: [{ id: pedidoId, cliente_id: clienteId, endereco_id: entregaId }], enderecos: [{ id: principalId, cliente_id: clienteId, ...endereco }, entrega] });
  const pedido = await pedidosRouter.createCaller({ supabase: db }).getById({ id: pedidoId });
  assert.equal(pedido.endereco.id, entregaId);
  assert.equal(formatarEndereco(pedido.endereco), completo.replace('123', '987'));
});

test('pedido sem endereço não recebe o endereço principal na impressão', async () => {
  const db = banco({ vw_pedidos_completos: [{ id: pedidoId, cliente_id: clienteId, endereco_id: null }], enderecos: [{ id: principalId, cliente_id: clienteId, ...endereco }] });
  const pedido = await pedidosRouter.createCaller({ supabase: db }).getById({ id: pedidoId });
  assert.equal(pedido.endereco, null);
  assert.equal(formatarEndereco(pedido.endereco), '');
});

test('seleção do PDV preserva endereço secundário, ausência e ID indisponível', () => {
  const lista = [{ id: principalId, ...endereco }, { id: entregaId, ...endereco, principal: false }];
  assert.equal(selecionarEndereco(lista).id, principalId);
  assert.equal(selecionarEndereco(lista, entregaId).id, entregaId);
  assert.equal(selecionarEndereco(lista, null), null);
  assert.equal(selecionarEndereco(lista, pedidoId), null);
});

test('falha ao consultar endereços é propagada e não aparenta cliente sem endereço', async () => {
  const db = banco({ clientes: [{ id: clienteId }] }, { enderecos: 'Falha de conexão' });
  await assert.rejects(clientesRouter.createCaller({ supabase: db }).getById({ id: clienteId }), /Falha de conexão/);
});

test('pedido rejeita endereço de outro cliente antes de gravar', async () => {
  const db = banco({ enderecos: [{ id: entregaId, cliente_id: outroClienteId, ...endereco }] });
  await assert.rejects(pedidosRouter.createCaller({ supabase: db }).create({ data: '2026-10-01', cliente_id: clienteId, endereco_id: entregaId, tipo_atendimento_id: atendimentoId }), /não pertence/);
  assert.equal(db.tabelas.pedidos, undefined);
});

test('trocar cliente limpa endereço anterior e permite remover cliente e endereço explicitamente', async () => {
  const db = banco({ pedidos: [{ id: pedidoId, cliente_id: clienteId, endereco_id: entregaId }] });
  const api = pedidosRouter.createCaller({ supabase: db });
  await api.update({ id: pedidoId, cliente_id: outroClienteId });
  assert.equal(db.tabelas.pedidos[0].endereco_id, null);
  await api.update({ id: pedidoId, cliente_id: null, endereco_id: null });
  assert.equal(db.tabelas.pedidos[0].cliente_id, null);
});

test('endereço legado em uma linha e campos vazios continuam legíveis', () => {
  assert.equal(formatarEndereco({ logradouro: 'Rua Antiga, 12, Centro' }), 'Rua Antiga, 12, Centro');
  assert.equal(formatarEndereco({ logradouro: ' Rua ', numero: ' ', complemento: null, cep: ' ' }), 'Rua');
});
