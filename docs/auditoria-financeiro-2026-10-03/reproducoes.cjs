// Auditoria local: usa PGlite em memória, sem conexão ao Supabase de produção.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { criarBanco } = require('../../tests/helpers/banco-pdv.cjs');
const { carregar } = require('../../tests/helpers/carregar.cjs');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { clientesRouter } = carregar('src/server/routers/clientes.ts');
const { relatoriosRouter } = carregar('src/server/routers/relatorios.ts');
const root = path.resolve(__dirname, '../..');

function initializer(file, name) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) found = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, 'Expressão da aplicação encontrada: ' + name);
  return { source, node: found };
}
function evaluate(expression, globals) {
  const code = ts.transpileModule('module.exports = ' + expression, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { module: { exports: {} }, console: { log() {}, error() {} }, ...globals };
  vm.runInNewContext(code, context);
  return context.module.exports;
}

async function main() {
  const banco = await criarBanco({ schemaProducao: true });
  const evidence = {};
  try {
    const context = { supabase: banco.supabase, user: { id: banco.usuario }, role: 'ADMIN' };
    const pedidos = pedidosRouter.createCaller(context);
    const clientes = clientesRouter.createCaller(context);
    const saida = crypto.randomUUID(), pix = crypto.randomUUID(), dinheiro = crypto.randomUUID();
    await banco.pg.query('INSERT INTO tipos_atendimento(id,nome,tipo) VALUES ($1,$2,$3)', [saida, 'Saída financeira', 'SAIDA']);
    await banco.pg.query('INSERT INTO formas_pagamento VALUES ($1,$2),($3,$4)', [pix, 'PIX', dinheiro, 'DINHEIRO']);
    const sql = fs.readFileSync(path.join(root, 'criar_todas_funcoes_relatorios.sql'), 'utf8').split(/-- ={10,}\r?\n-- TESTES/)[0];
    await banco.pg.exec(sql);
    const reportDb = { async rpc(name, input) {
      try {
        let result;
        if (name === 'relatorio_vendas_periodo') result = await banco.pg.query('SELECT * FROM relatorio_vendas_periodo($1,$2)', [input.data_inicio, input.data_fim]);
        else if (name === 'top_produtos_vendidos') result = await banco.pg.query('SELECT * FROM top_produtos_vendidos($1,$2,$3)', [input.data_inicio, input.data_fim, input.limite]);
        else result = await banco.pg.query('SELECT * FROM relatorio_vendas_anual($1)', [input.ano]);
        const numbers = ['mes', 'total_vendas', 'total_despesas', 'total_pedidos', 'total_itens', 'valor_total', 'quantidade_vendida'];
        return { data: result.rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, numbers.includes(key) ? Number(value) : value]))), error: null };
      } catch (error) { return { data: null, error: { message: error.message } }; }
    } };
    const reports = relatoriosRouter.createCaller({ ...context, supabase: reportDb });
    const createExpense = (overrides = {}) => pedidos.create({ data: '2026-10-01', tipo_atendimento_id: saida, forma_pagamento_id: pix, subtotal: 30, total: 30, chave_requisicao: crypto.randomUUID(), ...overrides });

    let sale = await pedidos.create({ data: '2026-10-01', tipo_atendimento_id: banco.atendimento, forma_pagamento_id: pix, chave_requisicao: crypto.randomUUID(), desconto_valor: 10, itens: [{ produto_id: banco.produto, quantidade: 5, valor_unitario: 20 }] });
    sale = await pedidos.finalizar({ id: sale.id, versao: sale.versao });
    let expense = await createExpense(); expense = await pedidos.finalizar({ id: expense.id, versao: expense.versao });
    let cashExpense = await createExpense({ forma_pagamento_id: dinheiro, total: 20, subtotal: 20 });
    cashExpense = await pedidos.finalizar({ id: cashExpense.id, versao: cashExpense.versao });
    const annual = await reports.relatorioAnual({ ano: 2026 });
    const memo = initializer('src/app/relatorios/page.tsx', 'dadosAnuais');
    const aggregate = evaluate(memo.node.arguments[0].getText(memo.source), { relatorioAnual: annual, anoSelecionado: 2026, tabAtiva: 1 })();
    const pixRow = annual.find(row => row.forma_pagamento_nome === 'PIX');
    assert.equal(pixRow.total_vendas, 90); assert.equal(pixRow.total_despesas, 30);
    assert.equal(aggregate.tabela.PIX[9], 90); assert.equal(aggregate.totalDespesas, 50);
    evidence.anual = { sqlPIX: pixRow, valorLinhaPIXNaTela: aggregate.tabela.PIX[9], totalSaidasAindaPreservado: aggregate.totalDespesas, despesaDinheiro: aggregate.tabela.DINHEIRO[9], estiloDeDespesaPorNome: 'DINHEIRO' === 'DIZIMO' || 'DINHEIRO'.includes('DESPESA') };

    const period = await reports.vendasPeriodo({ dataInicio: '2026-10-01', dataFim: '2026-10-03' });
    const products = await reports.topProdutos({ dataInicio: '2026-10-01', dataFim: '2026-10-03', limite: 10 });
    assert.equal(period[0].total_itens, 1); assert.equal(products[0].quantidade_vendida, 5);
    assert.equal(period[0].valor_total, 90); assert.equal(products[0].valor_total, 100);
    evidence.periodoProdutos = { valorPedidos: period[0].valor_total, valorProdutos: products[0].valor_total, itensDoIndicador: period[0].total_itens, unidadesVendidas: products[0].quantidade_vendida };
    const inverted = await reports.vendasPeriodo({ dataInicio: '2026-10-03', dataFim: '2026-10-01' });
    assert.equal(inverted.length, 0);
    evidence.periodoInvertido = { rejeitadoPelaAPI: false, registros: inverted.length };

    const harmlessUi = { toast: { loading() { return 'local'; }, success() {}, error() {} }, setTimeout() {}, setDialogEditar() {}, setPedidoEditando() {}, setDialogNovaSaida() {}, setNovaSaida() {}, dateToString() { return '2026-10-03'; } };
    const editHandler = initializer('src/app/saidas/page.tsx', 'handleSalvarEdicao');
    let pending = await createExpense({ total: 12, subtotal: 12 });
    const selected = 'FINALIZADO';
    let sent;
    await evaluate(editHandler.node.getText(editHandler.source), {
      ...harmlessUi,
      pedidoEditando: { ...pending, valor: 12, destinatario_nome: '', status: selected },
      atualizarMutation: { async mutateAsync(payload) { sent = payload.status; pending = await pedidos.update(payload); } },
    })();
    assert.equal(sent, 'PENDENTE');
    assert.equal(pending.status, 'PENDENTE');
    evidence.edicaoStatus = { escolhido: selected, enviado: sent, gravado: pending.status };

    const recipient = await clientes.create({ nome: 'Destinatário fictício da auditoria' });
    let linked = await createExpense({ cliente_id: recipient.id });
    const cleared = await pedidos.update({ id: linked.id, versao: linked.versao, cliente_id: undefined, forma_pagamento_id: undefined });
    assert.equal(cleared.cliente_id, recipient.id); assert.equal(cleared.forma_pagamento_id, pix);
    evidence.limpezaDeCampos = { destinatarioPermaneceu: cleared.cliente_id === recipient.id, pagamentoPermaneceu: cleared.forma_pagamento_id === pix };

    const key = crypto.randomUUID();
    const first = await createExpense({ chave_requisicao: key });
    const repeated = await createExpense({ chave_requisicao: key });
    const newKey = await createExpense();
    assert.equal(first.id, repeated.id); assert.notEqual(first.id, newKey.id);
    evidence.idempotencia = { mesmaChaveCriaUma: first.id === repeated.id, novasChavesCriamDuas: first.id !== newKey.id };
    const createHandler = initializer('src/app/saidas/page.tsx', 'handleSalvarNovaSaida');
    const createdWithoutRecipient = [];
    const actualCreate = evaluate(createHandler.node.getText(createHandler.source), {
      ...harmlessUi,
      crypto,
      novaSaida: { valor: 7, data: '2026-10-03', cliente_id: '', destinatario_nome: 'Fornecedor fictício', forma_pagamento_id: pix, observacao: '' },
      tiposAtendimento: [{ id: saida, tipo: 'SAIDA' }],
      criarClienteMutation: { async mutateAsync() { throw new Error('Falha simulada, sem conexão externa'); } },
      criarPedidoMutation: { async mutateAsync(payload) { createdWithoutRecipient.push(await pedidos.create(payload)); } },
    });
    await Promise.all([actualCreate(), actualCreate()]);
    assert.equal(createdWithoutRecipient.length, 2);
    assert.notEqual(createdWithoutRecipient[0].id, createdWithoutRecipient[1].id);
    assert.ok(createdWithoutRecipient.every(row => row.cliente_id === null));
    evidence.handlerCriacao = { chamadasConcorrentes: 2, despesasCriadas: createdWithoutRecipient.length, semDestinatarioAposFalha: true };
    const deniedOperator = pedidosRouter.createCaller({ ...context, role: 'OPERADOR' });
    await assert.rejects(deniedOperator.delete({ id: first.id, versao: first.versao }), error => error.code === 'FORBIDDEN');
    await assert.rejects(pedidos.update({ id: expense.id, versao: expense.versao, total: 1 }), /encerrado/);
    evidence.protecoes = { exclusaoOperadorNegada: true, edicaoFinalizadaNegada: true };

    const volumeRecipient = await clientes.create({ nome: 'Volume fictício da auditoria' });
    await banco.pg.query("INSERT INTO pedidos(numero,data,cliente_id,tipo_atendimento_id,status,subtotal,total) SELECT 10000+n,'2026-10-03',$1,$2,'PENDENTE',1,1 FROM generate_series(1,1005) n", [volumeRecipient.id, saida]);
    const limited = await pedidos.list({ tipoAtendimento: 'SAIDA', clienteId: volumeRecipient.id, limit: 1000 });
    assert.equal(limited.total, 1005); assert.equal(limited.pedidos.length, 1000);
    const visibleSum = limited.pedidos.reduce((sum, row) => sum + row.total, 0);
    assert.equal(visibleSum, 1000);
    evidence.estatisticasTruncadas = { contagemTotal: limited.total, linhasUsadasPelaTela: limited.pedidos.length, somaVisivel: visibleSum, somaCompleta: 1005 };
    const currentPage = await pedidos.list({ tipoAtendimento: 'SAIDA', clienteId: volumeRecipient.id, limit: 10 });
    const XLSX = require('xlsx'); let workbook;
    const { exportarSaidasParaExcel } = carregar('src/lib/excel/saidas-export-excel.ts', { xlsx: { ...XLSX, writeFile(book) { workbook = book; } } });
    exportarSaidasParaExcel(currentPage.pedidos, [{ id: 'numero', label: 'Número', selecionada: true }, { id: 'valor', label: 'Valor', selecionada: true }], { nome_empresa: 'Auditoria local' });
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets['Saídas Financeiras'], { header: 1 });
    assert.equal(sheet.length - 2, 10);
    evidence.exportacaoSaidas = { consultaTotal: currentPage.total, registrosDoArquivo: sheet.length - 2, escopoInformadoPelaTela: false };

    const csv = initializer('src/app/relatorios/page.tsx', 'handleExportarExcel'); let csvText;
    const exportCsv = evaluate(csv.node.getText(csv.source), {
      topProdutos: [{ produto_nome: 'Kit, "Especial"', categoria_nome: 'Categoria fictícia', quantidade_vendida: 1, total_vendas: 1, valor_total: 100 }],
      toast: { loading() { return 'local'; }, success() {}, error(message) { throw new Error(message); } },
      Blob: class { constructor(parts) { csvText = parts.join(''); } },
      document: { createElement() { return { click() {} }; } }, URL: { createObjectURL() { return 'blob:local'; } }, format() { return '2026-10-03'; },
    });
    exportCsv();
    const csvHeaderFields = csvText.split('\n')[0].split(',').length;
    const csvDataFields = csvText.split('\n')[1].split(',').length;
    assert.equal(csvHeaderFields, 6); assert.equal(csvDataFields, 7);
    evidence.csv = { colunasCabecalho: csvHeaderFields, separadoresNaLinhaNaoEscapada: csvDataFields, nomeIncluiVirgulaEAspas: true };

    fs.writeFileSync(path.join(__dirname, 'evidencias.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally { await banco.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
