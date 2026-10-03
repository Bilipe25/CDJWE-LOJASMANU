const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./helpers/carregar.cjs');
const { criarBanco } = require('./helpers/banco-pdv.cjs');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { relatoriosRouter } = carregar('src/server/routers/relatorios.ts');
const { clientesRouter } = carregar('src/server/routers/clientes.ts');
const { OperacaoSaida } = carregar('src/lib/utils/operacao-saida.ts');
const { serializarCSV } = carregar('src/lib/utils/csv.ts');
const { validarFiltrosSaidas } = carregar('src/lib/schemas/filtros-saidas.ts');
const { ratearCentavos, hojeFinanceiro } = carregar('src/lib/schemas/financeiro.ts');
const pdf = carregar('src/lib/pdf/financeiro-pdf.ts');
let banco, pedidos, relatorios, clientes, saida, pix, dinheiro;
before(async () => {
  banco = await criarBanco({ schemaProducao: true });
  const ctx = { supabase: banco.supabase, user: { id: banco.usuario }, role: 'ADMIN' };
  pedidos = pedidosRouter.createCaller(ctx); relatorios = relatoriosRouter.createCaller(ctx); clientes = clientesRouter.createCaller(ctx);
  saida = crypto.randomUUID(); pix = crypto.randomUUID(); dinheiro = crypto.randomUUID();
  await banco.pg.query('INSERT INTO tipos_atendimento VALUES($1,\'Saída\',\'SAIDA\')', [saida]);
  await banco.pg.query('INSERT INTO formas_pagamento VALUES($1,\'PIX\'),($2,\'DINHEIRO\')', [pix, dinheiro]);
});
after(async () => banco?.close());
const novaDespesa = (overrides = {}) => pedidos.create({ chave_requisicao: crypto.randomUUID(), data: '2026-10-01', tipo_atendimento_id: saida, forma_pagamento_id: pix, subtotal: 30, total: 30, ...overrides });
test('vendas líquidas, unidades e categorias reconciliam com descontos gerais', async () => {
  let venda = await pedidos.create({ chave_requisicao: crypto.randomUUID(), data: '2026-10-01', tipo_atendimento_id: banco.atendimento, forma_pagamento_id: pix, desconto_valor: 10, itens: [{ produto_id: banco.produto, quantidade: 5, valor_unitario: 20 }] });
  await pedidos.finalizar({ id: venda.id, versao: venda.versao });
  const p = await relatorios.financeiroPeriodo({ dataInicio: '2026-10-01', dataFim: '2026-10-01' });
  assert.equal(p.resumo.totalVendas, 90); assert.equal(p.resumo.totalUnidades, 5); assert.equal(p.dias[0].total_itens, 5);
  assert.equal(p.produtos[0].valor_total, 90); assert.equal(p.categorias[0].valor, 90);
  assert.equal(p.produtos.reduce((s, p) => s + p.valor_total, 0), p.resumo.totalVendas);
});
test('anual mantém venda e despesa no mesmo pagamento e exclui pendentes/canceladas', async () => {
  for (const [pagamento, total] of [[pix, 30], [dinheiro, 20]]) {
    const p = await novaDespesa({ forma_pagamento_id: pagamento, total, subtotal: total }); await pedidos.finalizar({ id: p.id, versao: p.versao });
  }
  const cancelada = await novaDespesa({ total: 999, subtotal: 999 }); await pedidos.cancelar({ id: cancelada.id, versao: cancelada.versao });
  await novaDespesa({ total: 999, subtotal: 999 });
  const anual = await relatorios.relatorioAnual({ ano: 2026 });
  assert.equal(anual.vendas, 90); assert.equal(anual.despesas, 50); assert.equal(anual.saldo, 40); assert.equal(anual.meses[9].saldo, 40);
  assert.equal(anual.linhas.find(l => l.natureza === 'Venda' && l.pagamento === 'PIX').valores[9], 90);
  assert.equal(anual.linhas.find(l => l.natureza === 'Despesa' && l.pagamento === 'PIX').valores[9], 30);
  assert.equal(anual.linhas.find(l => l.natureza === 'Despesa' && l.pagamento === 'DINHEIRO').total, 20);
});
test('estatísticas cobrem mais de mil saídas, respeitam busca e separam canceladas', async () => {
  const cliente = await clientes.create({ nome: 'Fornecedor volume de teste' });
  await banco.pg.query("INSERT INTO pedidos(numero,data,cliente_id,tipo_atendimento_id,status,subtotal,total,observacao) SELECT 10000+n,'2026-10-03',$1,$2,'PENDENTE',1,1,'Volume' FROM generate_series(1,1005) n", [cliente.id, saida]);
  const stats = await pedidos.saidasEstatisticas({ clienteId: cliente.id });
  assert.equal(stats.total, 1005); assert.equal(stats.valorPendente, 1005); assert.equal(stats.valorFinalizado, 0);
  assert.equal((await pedidos.saidasEstatisticas({ search: 'Fornecedor volume' })).total, 1005);
  assert.equal((await pedidos.saidasEstatisticas({ search: 'Não corresponde a nada' })).total, 0);
  assert.equal((await pedidos.saidasEstatisticas({ status: 'CANCELADO' })).valorCancelado, 999);
});
test('remoção explícita de destinatário e pagamento persiste; confirmação e finalização são distintas', async () => {
  const cliente = await clientes.create({ nome: 'Fornecedor para remoção' });
  let p = await novaDespesa({ cliente_id: cliente.id });
  p = await pedidos.update({ id: p.id, versao: p.versao, cliente_id: null, forma_pagamento_id: null, status: 'CONFIRMADO' });
  assert.equal(p.cliente_id, null); assert.equal(p.forma_pagamento_id, null); assert.equal(p.status, 'CONFIRMADO');
  p = await pedidos.finalizar({ id: p.id, versao: p.versao }); assert.equal(p.status, 'FINALIZADO');
  await assert.rejects(pedidos.update({ id: p.id, versao: p.versao, total: 1 }), /encerrado/);
});
const formulario = () => ({ cliente_id: '', destinatario_nome: '', forma_pagamento_id: pix, valor: 7, data: '2026-10-03', observacao: '', status: 'PENDENTE' });
const salvarOperacao = f => novaDespesa({ chave_requisicao: f.chave_requisicao, cliente_id: f.cliente_id || null, total: f.valor, subtotal: f.valor });
test('cadastro bloqueia concorrência e conserva a chave após resposta perdida', async () => {
  const operacao = new OperacaoSaida(); let primeira, chamadas = 0;
  const salvar = async f => { chamadas++; const p = await salvarOperacao(f); if (chamadas === 1) { primeira = p; throw new Error('Resposta perdida depois de gravar'); } return p; };
  const resultados = await Promise.allSettled([operacao.executar(formulario(), async () => '', salvar), operacao.executar(formulario(), async () => '', salvar)]);
  assert.equal(chamadas, 1); assert.ok(resultados.some(r => r.status === 'rejected'));
  const repetida = await operacao.executar(formulario(), async () => '', salvar);
  assert.equal(repetida.id, primeira.id);
  await assert.rejects(operacao.executar({ ...formulario(), valor: 8 }, async () => '', salvar), /tentativa anterior/);
});
test('falha ao criar destinatário interrompe a despesa e permite corrigir o nome', async () => {
  const operacao = new OperacaoSaida(); let gravacoes = 0;
  await assert.rejects(operacao.executar({ ...formulario(), destinatario_nome: 'Novo fornecedor' }, async () => { throw new Error('Falha cadastro'); }, async () => { gravacoes++; }), /Falha cadastro/);
  assert.equal(gravacoes, 0);
  const p = await operacao.executar({ ...formulario(), destinatario_nome: 'Nome corrigido' }, async nome => (await clientes.create({ nome })).id, salvarOperacao);
  assert.ok(p.cliente_id);
});
test('destinatário já criado é reutilizado em nova tentativa de salvar a despesa', async () => {
  const operacao = new OperacaoSaida(); let cadastros = 0, gravacoes = 0;
  const cadastrar = async nome => { cadastros++; return (await clientes.create({ nome })).id; };
  const salvar = async f => { if (++gravacoes === 1) throw new Error('Comunicação indisponível'); return salvarOperacao(f); };
  const f = { ...formulario(), destinatario_nome: 'Cadastro sem duplicidade' };
  await assert.rejects(operacao.executar(f, cadastrar, salvar), /indisponível/);
  await operacao.executar(f, cadastrar, salvar); assert.equal(cadastros, 1);
});
test('API rejeita datas impossíveis, período invertido e ano fracionado', async () => {
  await assert.rejects(relatorios.financeiroPeriodo({ dataInicio: '2026-10-03', dataFim: '2026-10-01' }), /posterior/);
  await assert.rejects(relatorios.financeiroPeriodo({ dataInicio: '2026-02-30', dataFim: '2026-03-01' }), /data válida/);
  await assert.rejects(relatorios.relatorioAnual({ ano: 2026.5 }));
  await assert.rejects(novaDespesa({ data: '2026-02-30' }), /data válida/);
  assert.equal(hojeFinanceiro(new Date('2026-10-03T01:00:00Z')), '2026-10-02');
});
test('falha em consultas não vira relatório zerado ou estatística parcial', async () => {
  const supabase = { ...banco.supabase, rpc: async () => ({ data: null, error: { code: '503', message: 'Consulta indisponível' } }) };
  const ctx = { supabase, user: { id: banco.usuario }, role: 'ADMIN' };
  await assert.rejects(relatoriosRouter.createCaller(ctx).relatorioAnual({ ano: 2026 }), /indisponível/);
  await assert.rejects(pedidosRouter.createCaller(ctx).saidasEstatisticas({}), /indisponível/);
  await assert.rejects(relatoriosRouter.createCaller({ ...ctx, user: null }).financeiroPeriodo({ dataInicio: '2026-01-01', dataFim: '2026-12-31' }));
});
test('rateio de centavos fecha com o pedido e mantém desempate determinístico', () => {
  assert.deepEqual(ratearCentavos(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(ratearCentavos(90, [50, 50]), [45, 45]);
  assert.deepEqual(ratearCentavos(0, [0, 0]), [0, 0]);
  assert.equal(ratearCentavos(9999999999, [9999999999, 8888888888]).reduce((s, v) => s + v, 0), 9999999999);
});
test('filtros persistidos inválidos são normalizados', () => {
  const filtros = validarFiltrosSaidas({ page: -9, rowsPerPage: 999, status: 'inexistente', dataInicio: '2026-02-30', clienteSelecionado: { id: 'inválido' } });
  assert.equal(filtros.page, 0); assert.equal(filtros.rowsPerPage, 10); assert.equal(filtros.status, ''); assert.equal(filtros.dataInicio, ''); assert.equal(filtros.clienteSelecionado, null);
});
test('CSV escapa aspas, vírgulas, separadores e novas linhas sem executar fórmulas', () => {
  const csv = serializarCSV([['Produto', 'Valor'], ['Kit, "Especial"; Azul\nGrande', 10.5], ['=1+1', 4]]);
  assert.ok(csv.includes('"Kit, ""Especial""; Azul\nGrande"')); assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('"10,5"'));
});
test('categorias incluem produtos além do top 10 e itens além de uma página', async () => {
  const produtos = [];
  for (let n = 0; n < 12; n++) {
    const categoria = crypto.randomUUID(), produto = crypto.randomUUID(); produtos.push(produto);
    await banco.pg.query('INSERT INTO categorias VALUES($1,$2)', [categoria, `Categoria ${n}`]);
    await banco.pg.query('INSERT INTO produtos VALUES($1,$2,$3,$4,1,$5)', [produto, `Produto ${n}`, `FIN${n}`, 'UN', categoria]);
  }
  const venda = await pedidos.create({ chave_requisicao: crypto.randomUUID(), data: '2024-10-01', tipo_atendimento_id: banco.atendimento, itens: [{ produto_id: produtos[0], quantidade: 1, valor_unitario: 1 }] });
  await banco.pg.query('DELETE FROM itens_pedido WHERE pedido_id=$1', [venda.id]);
  for (const produto of produtos) await banco.pg.query('INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,desconto_valor,valor_total,ordem) SELECT $1,$2,1,1,0,1,n FROM generate_series(1,22) n', [venda.id, produto]);
  await banco.pg.query("UPDATE pedidos SET status='FINALIZADO',subtotal=264,total=240,desconto_valor=24 WHERE id=$1", [venda.id]);
  const periodo = await relatorios.financeiroPeriodo({ dataInicio: '2024-10-01', dataFim: '2024-10-01' });
  assert.equal(periodo.produtos.length, 12); assert.equal(periodo.categorias.length, 12);
  assert.equal(periodo.resumo.totalUnidades, 264);
  assert.equal(Math.round(periodo.categorias.reduce((s,c) => s + c.valor, 0)*100), 24000);
  assert.equal(Math.round(periodo.produtos.reduce((s,p) => s + p.valor_total, 0)*100), 24000);
});
test('Excel mantém todos os registros, valores numéricos e totais separados por situação', () => {
  const XLSX = require('xlsx'), escrever = XLSX.writeFile; let workbook;
  XLSX.writeFile = wb => { workbook = wb; };
  try {
    const { exportarSaidasParaExcel } = carregar('src/lib/excel/saidas-export-excel.ts');
    const saidas = Array.from({length: 270}, (_, n) => ({numero:n+1,total:10.5,status:n%3===0?'FINALIZADO':n%3===1?'CONFIRMADO':'CANCELADO'}));
    exportarSaidasParaExcel(saidas, [{id:'numero',label:'Número',selecionada:true},{id:'valor',label:'Valor',selecionada:true}], {nome_empresa:'Fictícia',endereco:'Endereço fictício'}, ['Escopo: toda a consulta']);
    const linhas = XLSX.utils.sheet_to_json(workbook.Sheets['Saídas Financeiras'], {header:1});
    assert.equal(linhas.length, 271); assert.equal(linhas[270][1], 10.5);
    const info = XLSX.utils.sheet_to_json(workbook.Sheets['Informações'], {header:1});
    for (const label of ['Valor finalizado','Valor em aberto','Valor cancelado']) assert.equal(info.find(l=>l[0]===label)[1],945);
  } finally { XLSX.writeFile = escrever; }
});
test('PDF anual e documentos vazios têm linhas completas; saída não exige itens de venda', async () => {
  const empresa = { nome_empresa: 'Empresa fictícia', endereco: 'Rua de teste, 1 — Cidade / SE' };
  const anual = await relatorios.relatorioAnual({ ano: 2026 });
  const doc = pdf.criarDefinicaoAnual(anual, empresa);
  for (const item of doc.content.filter(c => c.table)) for (const linha of item.table.body) assert.equal(linha.length, item.table.widths.length);
  const vazio = await relatorios.relatorioAnual({ ano: 2025 });
  const docVazio = pdf.criarDefinicaoAnual(vazio, empresa);
  for (const item of docVazio.content.filter(c => c.table)) for (const linha of item.table.body) assert.equal(linha.length, item.table.widths.length);
  const individual = pdf.criarDefinicaoSaida({ numero: 10, data: '2026-10-03', status: 'PENDENTE', total: 10, cliente_nome: 'Fictício', forma_pagamento_nome: 'PIX', tipo_atendimento_nome: 'Saída', observacao: 'Descrição da despesa' }, empresa);
  assert.ok(JSON.stringify(individual.content).includes('Não confirma pagamento'));
  assert.ok(JSON.stringify(individual.content).includes(empresa.endereco));
});
test('movimentos negativos legados não bloqueiam indicadores, anual ou exportações', async () => {
  // Importação antiga: não usa a API de criação, que continua exigindo valor positivo.
  const id = crypto.randomUUID();
  await banco.pg.query("INSERT INTO pedidos(id,numero,data,tipo_atendimento_id,forma_pagamento_id,status,subtotal,total) VALUES($1,99999,'2023-10-01',$2,$3,'FINALIZADO',-25.50,-25.50)", [id, saida, pix]);
  const stats = await pedidos.saidasEstatisticas({ dataInicio: '2023-01-01', dataFim: '2023-12-31' });
  assert.equal(stats.total, 1); assert.equal(stats.valorFinalizado, -25.5);
  const anual = await relatorios.relatorioAnual({ ano: 2023 });
  assert.equal(anual.despesas, -25.5); assert.equal(anual.saldo, 25.5); assert.equal(anual.linhas[0].valores[9], -25.5);
  const registro = (await pedidos.list({ tipoAtendimento: 'SAIDA', dataInicio: '2023-01-01', dataFim: '2023-12-31' })).pedidos[0];
  const empresa = {nome_empresa: 'Empresa fictícia', endereco: 'Endereço de teste'};
  assert.ok(JSON.stringify(pdf.criarDefinicaoSaida(registro, empresa)).includes('25,50'));
  assert.ok(JSON.stringify(pdf.criarDefinicaoListaSaidas([registro], [{id:'valor',label:'Valor',selecionada:true}], empresa)).includes('-'));
  const XLSX = require('xlsx'), escrever = XLSX.writeFile; let workbook;
  XLSX.writeFile = wb => {workbook = wb;};
  try {
    carregar('src/lib/excel/saidas-export-excel.ts').exportarSaidasParaExcel([registro], [{id:'valor',label:'Valor',selecionada:true}], empresa);
    assert.equal(workbook.Sheets['Saídas Financeiras'].A2.v, -25.5);
  } finally {XLSX.writeFile = escrever;}
  assert.throws(() => carregar('src/lib/schemas/financeiro.ts').centavos(-25.5), /inválido/);
  assert.throws(() => carregar('src/lib/schemas/financeiro.ts').centavosMovimento(NaN), /inválido/);
  await assert.rejects(novaDespesa({ total: -25.5, subtotal: -25.5 }));
});
