const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./helpers/carregar.cjs');
const { criarBanco } = require('./helpers/banco-pdv.cjs');
const { consultarDashboard, referenciaDashboard } = carregar('src/server/dashboard.ts');
const { filtrosDaUrl } = carregar('src/lib/schemas/filtros-pedidos.ts');
let banco;
before(async () => { banco = await criarBanco(); });
after(async () => banco?.close());
const agora = new Date('2026-10-02T01:30:00Z');
async function pedido(data, status, total, tipo = banco.atendimento) {
 const id = crypto.randomUUID();
 await banco.pg.query('INSERT INTO pedidos(id,numero,data,status,total,subtotal,tipo_atendimento_id) VALUES($1,nextval(\'numero_pedido\'),$2,$3,$4,$4,$5)', [id,data,status,total,tipo]);
 return id;
}
test('calendário de Fortaleza mantém hoje, início do mês e sete dias na virada UTC', () => {
 const r = referenciaDashboard(agora);
 assert.equal(r.hoje,'2026-10-01'); assert.equal(r.inicioMes,'2026-10-01');
 assert.deepEqual(r.dias,['2026-09-25','2026-09-26','2026-09-27','2026-09-28','2026-09-29','2026-09-30','2026-10-01']);
 assert.equal(referenciaDashboard(new Date('2028-03-01T01:00:00Z')).hoje,'2028-02-29');
});
test('totais excluem futuro, pendente e saída; semana inclui o mês anterior e falhas não viram zero', async () => {
 const saida = crypto.randomUUID();
 await banco.pg.query('INSERT INTO tipos_atendimento VALUES($1,\'Saída\',\'SAIDA\')',[saida]);
 await pedido('2026-10-01','FINALIZADO',10.10); await pedido('2026-10-01','FINALIZADO',0.20);
 await pedido('2026-09-30','FINALIZADO',4.30); await pedido('2026-09-24','FINALIZADO',900);
 await pedido('2026-10-02','FINALIZADO',800); await pedido('2026-10-01','PENDENTE',700);
 await pedido('2026-10-01','FINALIZADO',600,saida);
 await banco.pg.exec("INSERT INTO clientes(nome,ativo) VALUES('Ativo',true),('Inativo',false)");
 const d = await consultarDashboard(banco.supabase,agora);
 assert.equal(d.vendasHoje,10.3); assert.equal(d.vendasMes,10.3);
 assert.equal(d.serieSemana.find(x=>x.data==='2026-09-30').vendas,4.3);
 assert.equal(d.pedidosPendentes,1); assert.equal(d.totalClientes,1);
 assert.ok(d.ultimosPedidos.every(x=>x.data <= '2026-10-01'));
 const falha = { ...banco.supabase, rpc: async (nome,args) => nome==='pdv_listar_pedidos' ? {error:{message:'Consulta indisponível',code:'503'},data:null} : banco.supabase.rpc(nome,args) };
 await assert.rejects(consultarDashboard(falha,agora),/Consulta indisponível/);
});
test('ranking mensal mantém SKUs distintos e soma quantidades fracionárias após 250 itens', async () => {
 const novoProduto=crypto.randomUUID();
 await banco.pg.query('INSERT INTO produtos(id,nome,codigo,unidade,valor_base) VALUES($1,\'Produto de teste\',\'P2\',\'M\',10)',[novoProduto]);
 const id = await pedido('2026-10-01','FINALIZADO',301);
 await banco.pg.query('INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) SELECT $1,$2,1,1,1 FROM generate_series(1,300)',[id,banco.produto]);
 await banco.pg.query('INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) VALUES($1,$2,1.125,10,11.25)',[id,novoProduto]);
 const futuro = await pedido('2026-10-03','FINALIZADO',9999);
 await banco.pg.query('INSERT INTO itens_pedido(pedido_id,produto_id,quantidade,valor_unitario,valor_total) VALUES($1,$2,9999,1,9999)',[futuro,novoProduto]);
 const d=await consultarDashboard(banco.supabase,agora);
 assert.equal(d.topProdutos.length,2);
 assert.equal(d.topProdutos[0].produto_id,banco.produto); assert.equal(d.topProdutos[0].quantidade_vendida,300);
 assert.equal(d.topProdutos[1].quantidade_vendida,1.125); assert.equal(d.topProdutos[1].unidade,'M');
});
test('mais de mil vendas são integralmente somadas e erros dos itens interrompem a consulta', async () => {
 const antes = (await consultarDashboard(banco.supabase,agora)).vendasHoje;
 await banco.pg.query('INSERT INTO pedidos(numero,data,status,total,subtotal,tipo_atendimento_id) SELECT nextval(\'numero_pedido\'),\'2026-10-01\',\'FINALIZADO\',1,1,$1 FROM generate_series(1,1005)',[banco.atendimento]);
 const d=await consultarDashboard(banco.supabase,agora);
 assert.equal(d.vendasHoje,antes+1005);
 const falha={...banco.supabase,from:()=>({select(){return this;},in(){return this;},order(){return this;},range(){return Promise.resolve({data:null,error:{message:'503'},count:null});}})};
 await assert.rejects(consultarDashboard(falha,agora),/produtos vendidos/);
});
test('atalho de pendentes hidrata filtros sem exigir retorno da edição', () => {
 const f=filtrosDaUrl(new URLSearchParams('filtro_status=PENDENTE'));
 assert.equal(f.status,'PENDENTE'); assert.equal(f.search,''); assert.equal(f.page,0);
 const vendas=filtrosDaUrl(new URLSearchParams('filtro_status=FINALIZADO&filtro_tipoAtendimento=ENTRADA&filtro_dataInicio=2026-10-01&filtro_dataFim=2026-10-01'));
 assert.equal(vendas.tipoAtendimento,'ENTRADA'); assert.equal(vendas.dataInicio,'2026-10-01');
});
