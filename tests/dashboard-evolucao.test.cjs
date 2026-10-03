const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./helpers/carregar.cjs');
const { criarBanco } = require('./helpers/banco-pdv.cjs');
const { intervalosDashboard, variacaoDashboard, periodoDashboardSchema } = carregar('src/lib/schemas/dashboard.ts');
const { consultarDesempenhoDashboard, consultarProdutosDashboardPeriodo } = carregar('src/server/dashboard.ts');
const agora = new Date('2026-10-03T15:00:00Z');

test('períodos validados, comparação mensal e janelas móveis conservam o calendário civil', () => {
  assert.equal(periodoDashboardSchema.parse(undefined).periodo, 'mes');
  assert.equal(periodoDashboardSchema.parse({}).periodo, 'mes');
  assert.throws(() => periodoDashboardSchema.parse({ periodo: 'ano' }));
  const mensal = intervalosDashboard('mes', agora);
  assert.deepEqual(mensal.atual, { dataInicio: '2026-10-01', dataFim: '2026-10-03' });
  assert.deepEqual(mensal.anterior, { dataInicio: '2026-09-01', dataFim: '2026-09-03' });
  for (const [periodo, dias] of [['7dias', 7], ['30dias', 30]]) {
    const r = intervalosDashboard(periodo, agora);
    const tamanho = i => (Date.parse(i.dataFim) - Date.parse(i.dataInicio)) / 86400000 + 1;
    assert.equal(tamanho(r.atual), dias); assert.equal(tamanho(r.anterior), dias);
    assert.equal(Date.parse(r.atual.dataInicio) - Date.parse(r.anterior.dataFim), 86400000);
  }
  assert.equal(intervalosDashboard('mes', new Date('2026-01-01T01:30:00Z')).hoje, '2025-12-31');
  assert.deepEqual(intervalosDashboard('mes', new Date('2026-01-02T12:00:00Z')).anterior, { dataInicio: '2025-12-01', dataFim: '2025-12-02' });
  assert.equal(intervalosDashboard('mes', new Date('2028-03-31T12:00:00Z')).anterior.dataFim, '2028-02-29');
  assert.equal(intervalosDashboard('mes', new Date('2026-03-31T12:00:00Z')).anterior.dataFim, '2026-02-28');
});

test('percentuais usam somente base positiva e mantêm queda de 100% e valores negativos', () => {
  assert.equal(variacaoDashboard(18450,16400), 12.5);
  assert.equal(variacaoDashboard(12,10), 20);
  assert.equal(variacaoDashboard(0,100), -100);
  assert.equal(variacaoDashboard(-50,100), -150);
  for (const base of [0,-10,NaN,Infinity]) assert.equal(variacaoDashboard(100,base), null);
});

test('novas consultas exigem sessão e habilitação; ADMIN e OPERADOR recebem os mesmos indicadores', async () => {
  const { relatoriosRouter } = carregar('src/server/routers/relatorios.ts');
  let consultas = 0;
  const fake={rpc(){consultas++;throw new Error('Não consultar');},from(){consultas++;throw new Error('Não consultar');}};
  for(const [user,role,code] of [[null,null,'UNAUTHORIZED'],[{id:'teste'},null,'FORBIDDEN']]) {
    const api = relatoriosRouter.createCaller({supabase:fake,user,role});
    await assert.rejects(api.dashboardDesempenho({periodo:'mes'}),e=>e.code===code);
    await assert.rejects(api.dashboardProdutosPeriodo({dataInicio:'2026-10-01',dataFim:'2026-10-03'}),e=>e.code===code);
  }
  assert.equal(consultas,0);
  const banco=await criarBanco();
  try {
    const ctx={supabase:banco.supabase,user:{id:banco.usuario}};
    const admin=relatoriosRouter.createCaller({...ctx,role:'ADMIN'});
    const operador=relatoriosRouter.createCaller({...ctx,role:'OPERADOR'});
    const [a,b]=await Promise.all([admin.dashboardDesempenho({periodo:'mes'}),operador.dashboardDesempenho({periodo:'mes'})]);
    assert.deepEqual(a,b);
    await assert.rejects(admin.dashboardDesempenho({periodo:'ano'}),e=>e.code==='BAD_REQUEST');
    await assert.rejects(admin.dashboardProdutosPeriodo({dataInicio:'2026-02-30',dataFim:'2026-03-01'}),e=>e.code==='BAD_REQUEST');
  } finally { await banco.close(); }
});

async function inserir(banco, data, total, status = 'FINALIZADO', tipo = banco.atendimento) {
  const id = crypto.randomUUID();
  await banco.pg.query("INSERT INTO pedidos(id,numero,data,status,total,subtotal,tipo_atendimento_id) VALUES($1,nextval('numero_pedido'),$2,$3,$4,$4,$5)", [id,data,status,total,tipo]);
  return id;
}

test('desempenho soma centavos, exclui outros atendimentos/situações/futuro e preenche dias sem venda', async () => {
  const banco = await criarBanco();
  try {
    const saida = crypto.randomUUID(), orcamento = crypto.randomUUID();
    await banco.pg.query("INSERT INTO tipos_atendimento VALUES($1,'Despesa','SAIDA'),($2,'Orçamento','ORÇAMENTO')",[saida,orcamento]);
    await inserir(banco,'2026-09-01',100); await inserir(banco,'2026-09-03',50);
    await inserir(banco,'2026-09-20',999);
    await inserir(banco,'2026-10-01',10.10); await inserir(banco,'2026-10-01',0.20);
    await inserir(banco,'2026-10-03',19.70); await inserir(banco,'2026-10-03',-5);
    await inserir(banco,'2026-10-04',999);
    for(const status of ['PENDENTE','CONFIRMADO','CANCELADO']) await inserir(banco,'2026-10-02',999,status);
    await inserir(banco,'2026-10-02',999,'FINALIZADO',saida);
    await inserir(banco,'2026-10-02',999,'FINALIZADO',orcamento);
    const r = await consultarDesempenhoDashboard(banco.supabase,'mes',agora);
    assert.deepEqual(r.atual,{totalVendas:25,totalPedidos:4,ticketMedio:6.25});
    assert.deepEqual(r.anterior,{totalVendas:150,totalPedidos:2,ticketMedio:75});
    assert.equal(r.vendasHoje,14.70);
    assert.equal(r.serie.length,3); assert.equal(r.serie[1].atual,0); assert.equal(r.serie[1].anterior,0);
    assert.equal(r.serie[0].dataAnterior,'2026-09-01');
    const semBase = await consultarDesempenhoDashboard(banco.supabase,'mes',new Date('2026-08-03T12:00:00Z'));
    assert.equal(semBase.atual.totalVendas,0); assert.equal(semBase.variacoes.vendas,null);
  } finally { await banco.close(); }
});

test('mês mais longo mantém dia comparativo inexistente como null e não como venda zero', async () => {
  const banco = await criarBanco();
  try {
    const r = await consultarDesempenhoDashboard(banco.supabase,'mes',new Date('2028-03-31T12:00:00Z'));
    assert.equal(r.serie.length,31);
    assert.equal(r.serie[28].dataAnterior,'2028-02-29');
    assert.equal(r.serie[29].dataAnterior,null); assert.equal(r.serie[29].anterior,null);
  } finally { await banco.close(); }
});

test('mais de mil vendas são completas, lentidão dos itens não afeta desempenho e falhas não viram zero', async () => {
  const banco = await criarBanco();
  try {
    await banco.pg.query("INSERT INTO pedidos(numero,data,status,total,subtotal,tipo_atendimento_id) SELECT nextval('numero_pedido'),'2026-10-03','FINALIZADO',1,1,$1 FROM generate_series(1,1005)",[banco.atendimento]);
    const semItens = { ...banco.supabase, from: () => { throw new Error('Consulta de itens não deve acontecer'); } };
    const r = await consultarDesempenhoDashboard(semItens,'7dias',agora);
    assert.equal(r.atual.totalVendas,1005); assert.equal(r.atual.totalPedidos,1005); assert.equal(r.atual.ticketMedio,1);
    const falha={ ...banco.supabase, rpc: async()=>({data:null,error:{code:'503',message:'Indisponível'}}) };
    await assert.rejects(consultarDesempenhoDashboard(falha,'mes',agora),/Indisponível/);
  } finally { await banco.close(); }
});

test('ranking por valor incorpora desconto geral, identifica SKUs e não compara quantidades de unidades diferentes', async () => {
  const banco = await criarBanco();
  try {
    const outro = crypto.randomUUID();
    await banco.pg.query("INSERT INTO produtos(id,nome,codigo,unidade,valor_base) VALUES($1,'Sofá','S2','M',100)",[outro]);
    const id = await inserir(banco,'2026-10-03',150);
    await banco.pg.query("INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) VALUES($1,$2,20,10,200),($1,$3,1.5,100,100)",[id,banco.produto,outro]);
    const semItens=await inserir(banco,'2026-10-03',25);
    const fora=await inserir(banco,'2026-09-03',999);
    await banco.pg.query("INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) VALUES($1,$2,1,999,999)",[fora,outro]);
    const r = await consultarProdutosDashboardPeriodo(banco.supabase,'2026-10-01','2026-10-03');
    assert.equal(r.topProdutos.length,2); assert.equal(r.topProdutos[0].valor_total,100);
    assert.equal(r.topProdutos[1].valor_total,50); assert.equal(r.topProdutos[1].quantidade_vendida,1.5); assert.equal(r.topProdutos[1].unidade,'M');
    assert.equal(r.valorSemItens,25); assert.ok(semItens);
    const negativo=await inserir(banco,'2026-10-02',-60);
    await banco.pg.query("INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) VALUES($1,$2,1,60,60)",[negativo,outro]);
    const signed=await consultarProdutosDashboardPeriodo(banco.supabase,'2026-10-01','2026-10-03');
    assert.equal(signed.topProdutos[1].valor_total,-10);
    const falha={...banco.supabase,from:()=>({select(){return this;},in(){return this;},order(){return this;},range(){return Promise.resolve({data:null,count:null,error:{message:'Falha'}});}})};
    await assert.rejects(consultarProdutosDashboardPeriodo(falha,'2026-10-01','2026-10-03'),/itens vendidos/);
  } finally { await banco.close(); }
});
