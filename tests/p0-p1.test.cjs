const { test,before,after } = require('node:test');
const assert = require('node:assert/strict');
const { criarBanco,produto,atendimento } = require('./helpers/banco-pdv.cjs');
const { carregar } = require('./helpers/carregar.cjs');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { clientesRouter } = carregar('src/server/routers/clientes.ts');
const { usePDVStore } = carregar('src/stores/pdv-store.ts');
const { dateToString,formatDateBR } = carregar('src/lib/utils/dateUtils.ts');
let banco,api,clientes;
const item={produto_id:produto,quantidade:1,valor_unitario:10,desconto_valor:0};
const novo=(alteracao={})=>api.create({data:'2026-10-01',tipo_atendimento_id:atendimento,chave_requisicao:crypto.randomUUID(),itens:[item],...alteracao});
const numeroRegistros=async tabela=>Number((await banco.pg.query(`SELECT count(*) AS total FROM ${tabela}`)).rows[0].total);
before(async()=>{ banco=await criarBanco();const ctx={supabase:banco.supabase,user:{id:banco.usuario},role:'ADMIN'};api=pedidosRouter.createCaller(ctx);clientes=clientesRouter.createCaller(ctx);await banco.pg.exec('GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;'); });
after(async()=>{if(banco)await banco.close()});

test('API nega leitura e escrita sem sessão antes de consultar o banco',async()=>{
 let consultas=0;const fake={from(){consultas++;throw new Error('Não consultar')},rpc(){consultas++;throw new Error('Não consultar')}};
 const apiAnon=pedidosRouter.createCaller({supabase:fake,user:null,role:null});
 await assert.rejects(apiAnon.list({}),e=>e.code==='UNAUTHORIZED');await assert.rejects(apiAnon.create({}),e=>e.code==='UNAUTHORIZED');assert.equal(consultas,0);
});
test('contexto valida o token no Auth e encaminha JWT sem compartilhar sessão entre requisições',async()=>{
 const { createTRPCContext }=carregar('src/lib/trpc/server.ts');
 const antigoFetch=global.fetch,antigaUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,antigaChave=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://pdv-local.test';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='chave-publica-de-teste';
 const headers=[];
 global.fetch=async (url,opcoes)=>{
   const h=new Headers(opcoes.headers);headers.push(h.get('authorization'));
   if(h.get('authorization')!=='Bearer token-local-valido')return new Response(JSON.stringify({message:'JWT inválido',error_code:'bad_jwt'}),{status:401,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify(String(url).includes('/auth/')?{id:banco.usuario,email:'operador@example.invalid'}:[{papel:'ADMIN'}]),{headers:{'Content-Type':'application/json'}});
 };
 try{
   const semSessao=await createTRPCContext(new Request('http://pdv-local.test/api/trpc'));assert.equal(semSessao.user,null);assert.equal(headers.length,0);
   await assert.rejects(createTRPCContext(new Request('http://pdv-local.test/api/trpc',{headers:{authorization:'Bearer token-invalido'}})),e=>e.code==='UNAUTHORIZED');
   const valido=await createTRPCContext(new Request('http://pdv-local.test/api/trpc',{headers:{authorization:'Bearer token-local-valido'}}));assert.equal(valido.user.id,banco.usuario);assert.equal(valido.role,'ADMIN');assert.deepEqual(headers.slice(1),['Bearer token-local-valido','Bearer token-local-valido']);
 }finally{global.fetch=antigoFetch;if(antigaUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=antigaUrl;if(antigaChave===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=antigaChave;}
});
test('API nega operador não habilitado e exclusão sem administrador',async()=>{
 await assert.rejects(pedidosRouter.createCaller({supabase:banco.supabase,user:{id:banco.usuario},role:null}).list({}),e=>e.code==='FORBIDDEN');
 const p=await novo();await assert.rejects(pedidosRouter.createCaller({supabase:banco.supabase,user:{id:banco.usuario},role:'OPERADOR'}).delete({id:p.id,versao:p.versao}),e=>e.code==='FORBIDDEN');
});
test('banco nega acesso anônimo a tabelas, views e RPCs',async()=>{
 await banco.pg.exec('SET ROLE anon');try {for(const sql of ['SELECT * FROM clientes','SELECT * FROM vw_pedidos_completos',"SELECT pdv_mutar_pedido('criar')"])await assert.rejects(banco.pg.query(sql),/permission denied/);}finally{await banco.pg.exec('RESET ROLE')}
});
test('RLS nega dados a conta autenticada sem aprovação e nega escrita direta',async()=>{
 await banco.pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",['cccccccc-cccc-4ccc-8ccc-cccccccccccc']);await banco.pg.exec('SET ROLE authenticated');
 try{assert.equal((await banco.pg.query('SELECT * FROM vw_pedidos_completos')).rows.length,0);await assert.rejects(banco.pg.query("SELECT pdv_mutar_pedido('criar')"),/não autorizada/);await assert.rejects(banco.pg.query("INSERT INTO clientes(nome) VALUES ('Indevido')"),/permission denied/)}finally{await banco.pg.exec('RESET ROLE');await banco.pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[banco.usuario]);}
});
test('cliente e endereço fazem rollback juntos em erro de endereço',async()=>{
 await banco.pg.exec("ALTER TABLE enderecos ADD CONSTRAINT teste_endereco CHECK (logradouro <> 'FALHA');");const antes=await numeroRegistros('clientes');
 try{await assert.rejects(clientes.create({nome:'Não persistir',endereco:{logradouro:'FALHA'}}),/teste_endereco/);assert.equal(await numeroRegistros('clientes'),antes)}finally{await banco.pg.exec('ALTER TABLE enderecos DROP CONSTRAINT teste_endereco')}
});
test('atualização de cliente desfaz nome quando o endereço falha',async()=>{
 const c=await clientes.create({nome:'Nome original'});await banco.pg.exec("ALTER TABLE enderecos ADD CONSTRAINT teste_endereco CHECK (logradouro <> 'FALHA');");
 try{await assert.rejects(clientes.update({id:c.id,nome:'Nome novo',endereco:{logradouro:'FALHA'}}),/teste_endereco/);assert.equal((await clientes.getById({id:c.id})).nome,'Nome original')}finally{await banco.pg.exec('ALTER TABLE enderecos DROP CONSTRAINT teste_endereco')}
});
test('criação de pedido desfaz cabeçalho se um item falha',async()=>{
 const antes=await numeroRegistros('pedidos');await assert.rejects(novo({itens:[item,{...item,produto_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}]}),/foreign key/);assert.equal(await numeroRegistros('pedidos'),antes);
});
test('edição integral mantém itens e cabeçalho antigos após falha intermediária',async()=>{
 const p=await novo({observacao:'Original'});await assert.rejects(api.update({id:p.id,versao:p.versao,observacao:'Alterado',itens:[{...item,produto_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}]}),/foreign key/);
 const salvo=await api.getById({id:p.id});assert.equal(salvo.itens.length,1);assert.equal(salvo.itens[0].produto_id,produto);assert.equal(salvo.observacao,'Original');assert.equal(salvo.versao,p.versao);
});
test('exclusão faz rollback dos itens se o cabeçalho não pode ser removido',async()=>{
 const p=await novo();await banco.pg.exec('CREATE TABLE trava_exclusao(pedido_id uuid REFERENCES pedidos(id));');await banco.pg.query('INSERT INTO trava_exclusao VALUES ($1)',[p.id]);
 try{await assert.rejects(api.delete({id:p.id,versao:p.versao}),/foreign key/);assert.equal((await api.getById({id:p.id})).itens.length,1)}finally{await banco.pg.exec('DROP TABLE trava_exclusao')}
});
test('reenvio simultâneo da mesma chave cria somente um pedido',async()=>{
 const chave=crypto.randomUUID(),antes=await numeroRegistros('pedidos');const [a,b]=await Promise.all([novo({chave_requisicao:chave}),novo({chave_requisicao:chave})]);assert.equal(a.id,b.id);assert.equal(await numeroRegistros('pedidos'),antes+1);
 await assert.rejects(novo({chave_requisicao:chave,observacao:'Diferente'}),/outros dados/);
});
test('servidor exige chave e calcula total independentemente do navegador',async()=>{
 await assert.rejects(novo({chave_requisicao:undefined}));const p=await novo({total:0.01,subtotal:0.01});assert.equal(p.total,10);assert.equal(p.subtotal,10);
});
test('descontos inválidos são rejeitados no contrato e no SQL',async()=>{
 await assert.rejects(novo({itens:[{...item,desconto_valor:20}]}),/desconto/i);await assert.rejects(novo({desconto_valor:20}),/desconto/i);
 const r=await banco.supabase.rpc('pdv_mutar_pedido',{p_acao:'criar',p_chave:crypto.randomUUID(),p_dados:{data:'2026-10-01',tipo_atendimento_id:atendimento,itens:[{...item,desconto_valor:20}]}});assert.match(r.error.message,/inválido/);
});
test('alterar somente desconto recalcula total no banco',async()=>{
 const p=await novo();const atualizado=await api.update({id:p.id,versao:p.versao,desconto_valor:2});assert.equal(atualizado.subtotal,10);assert.equal(atualizado.total,8);
});
test('arredondamento monetário permanece coerente entre store e banco',async()=>{
 const p=await novo({itens:[{...item,quantidade:3,valor_unitario:0.1}],desconto_valor:0.1});assert.equal(p.total,0.2);usePDVStore.getState().novoPedido();usePDVStore.getState().adicionarItem({...item,produto_nome:'Teste',quantidade:3,valor_unitario:0.1});usePDVStore.getState().setPedidoAtual({desconto_valor:0.1});assert.equal(usePDVStore.getState().pedidoAtual.total,p.total);
});
test('versão antiga não sobrescreve alteração de outro operador',async()=>{
 const p=await novo();await api.update({id:p.id,versao:p.versao,observacao:'Primeiro'});await assert.rejects(api.update({id:p.id,versao:p.versao,observacao:'Segundo'}),e=>e.code==='CONFLICT');assert.equal((await api.getById({id:p.id})).observacao,'Primeiro');
});
test('pedido cancelado não pode ser finalizado nem editado',async()=>{
 let p=await novo();p=await api.cancelar({id:p.id,versao:p.versao});await assert.rejects(api.finalizar({id:p.id,versao:p.versao}),/encerrado/);await assert.rejects(api.update({id:p.id,versao:p.versao,observacao:'Novo'}),/encerrado/);
});
test('pedido finalizado registra data e impede edição e alteração de itens',async()=>{
 let p=await novo();p=await api.finalizar({id:p.id,versao:p.versao});assert.ok(p.finalizado_em);await assert.rejects(api.update({id:p.id,versao:p.versao,desconto_valor:1}),/encerrado/);await assert.rejects(api.addItem({pedido_id:p.id,versao:p.versao,item}),/encerrado/);
});
test('finalização recalcula pedido legado e rejeita valores inválidos sem mudar status',async()=>{
 let p=await novo({desconto_valor:1});await banco.pg.query('UPDATE pedidos SET total=999,subtotal=999 WHERE id=$1',[p.id]);
 p=await api.finalizar({id:p.id,versao:p.versao});assert.equal(p.total,9);assert.equal(p.subtotal,10);
 const invalido=await novo();await banco.pg.query('UPDATE itens_pedido SET desconto_valor=20 WHERE pedido_id=$1',[invalido.id]);
 await assert.rejects(api.finalizar({id:invalido.id,versao:invalido.versao}),/inválidos/);assert.equal((await api.getById({id:invalido.id})).status,'PENDENTE');
});
test('alterar desconto de item não altera desconto geral',async()=>{
 const p=await novo({desconto_valor:1}),completo=await api.getById({id:p.id});await api.updateItem({id:completo.itens[0].id,versao:p.versao,desconto_valor:2});const salvo=await api.getById({id:p.id});assert.equal(salvo.desconto_valor,1);assert.equal(salvo.total,7);
});
test('busca de número funciona antes da paginação e retorna zero para inexistente',async()=>{
 const p=await novo();const encontrado=await api.list({search:String(p.numero),limit:1});assert.equal(encontrado.total,1);assert.equal(encontrado.pedidos[0].id,p.id);assert.equal((await api.list({search:'999999'})).total,0);
});
test('busca literal preserva pontuação e usa os mesmos filtros dos indicadores',async()=>{
 const c=await clientes.create({nome:"D'Ávila, 50%_"});const p=await novo({cliente_id:c.id});
 for(const search of ["D'Ávila",'50%_',',']) { const lista=await api.list({search});assert.equal(lista.total,1);assert.equal(lista.pedidos[0].id,p.id);assert.equal((await api.estatisticas({search})).total,lista.total); }
 assert.equal((await api.list({search:'999999999999999999999999'})).total,0);
});
test('indicadores agregam todas as páginas e excluem cancelados e orçamentos do valor de vendas',async()=>{
 const c=await clientes.create({nome:'Indicadores isolados'});const orcamento=crypto.randomUUID();await banco.pg.query('INSERT INTO tipos_atendimento VALUES ($1,$2,$3)',[orcamento,'Orçamento','ORÇAMENTO']);
 const pendente=await novo({cliente_id:c.id});let venda=await novo({cliente_id:c.id});venda=await api.finalizar({id:venda.id,versao:venda.versao});let cancelado=await novo({cliente_id:c.id});await api.cancelar({id:cancelado.id,versao:cancelado.versao});let orc=await novo({cliente_id:c.id,tipo_atendimento_id:orcamento});await api.finalizar({id:orc.id,versao:orc.versao});
 const stats=await api.estatisticas({clienteId:c.id});assert.equal(stats.total,4);assert.equal(stats.pendentes,1);assert.equal(stats.valorTotal,10);assert.equal(stats.finalizadosHoje,2);assert.equal((await api.list({clienteId:c.id,limit:1})).pedidos.length,1);
 const lista=await clientes.list({search:c.nome});assert.equal(Number(lista.clientes[0].valor_total_compras),10);assert.equal(Number(lista.clientes[0].total_pedidos),1);
});
test('agregações não são limitadas a mil registros',async()=>{
 const c=await clientes.create({nome:'Volume isolado'});
 await banco.pg.query("INSERT INTO pedidos(data,cliente_id,tipo_atendimento_id,status,subtotal,total) SELECT '2026-10-01',$1,$2,'PENDENTE',1,1 FROM generate_series(1,1005)",[c.id,atendimento]);
 const stats=await api.estatisticas({clienteId:c.id});assert.equal(stats.total,1005);assert.equal(stats.pendentes,1005);assert.equal(stats.valorTotal,0);
});
test('duplicação é transacional, idempotente e gera novo número',async()=>{
 const p=await novo(),chave=crypto.randomUUID();const id=await api.duplicar({id:p.id,versao:p.versao,chave_requisicao:chave});assert.equal(await api.duplicar({id:p.id,versao:p.versao,chave_requisicao:chave}),id);const copia=await api.getById({id});assert.notEqual(copia.numero,p.numero);assert.equal(copia.itens.length,1);assert.equal(copia.status,'PENDENTE');
});
test('falha de numeração aborta criação',async()=>{
 const antes=await numeroRegistros('pedidos');await banco.pg.exec('CREATE OR REPLACE FUNCTION obter_proximo_numero_pedido() RETURNS bigint LANGUAGE sql AS $$ SELECT NULL::bigint $$;');
 try{await assert.rejects(novo(),/gerar o número/);assert.equal(await numeroRegistros('pedidos'),antes)}finally{await banco.pg.exec("CREATE OR REPLACE FUNCTION obter_proximo_numero_pedido() RETURNS bigint LANGUAGE sql AS $$ SELECT nextval('numero_pedido') $$;")}
});
test('cancelar rascunho zera desconto, cliente e identidade da próxima venda',()=>{
 const s=usePDVStore.getState();s.novoPedido();s.adicionarItem({...item,produto_nome:'Teste',valor_unitario:50});s.setPedidoAtual({cliente:{id:'x',nome:'Cliente'},cliente_id:'x',desconto_valor:10});const chave=usePDVStore.getState().pedidoAtual.chave_requisicao;s.novoPedido();s.adicionarItem({...item,produto_nome:'Teste',valor_unitario:50});const p=usePDVStore.getState().pedidoAtual;assert.equal(p.total,50);assert.equal(p.desconto_valor,0);assert.equal(p.cliente_id,undefined);assert.notEqual(p.chave_requisicao,chave);
});
test('limpar carrinho remove desconto e valores inválidos não corrompem estado',()=>{
 const s=usePDVStore.getState();s.novoPedido();s.adicionarItem({...item,produto_nome:'Teste'});s.setPedidoAtual({desconto_valor:1});assert.throws(()=>s.atualizarItem(0,{desconto_valor:20}),/desconto/);assert.equal(usePDVStore.getState().pedidoAtual.total,9);s.limparCarrinho();s.adicionarItem({...item,produto_nome:'Teste'});assert.equal(usePDVStore.getState().pedidoAtual.total,10);
});
test('hidratação do store preserva identidade, data, campos e desconto da edição',()=>{
 const s=usePDVStore.getState();s.novoPedido();s.setPedidoAtual({id:'pedido',numero:123,versao:7,data:'2025-01-02',cliente:{id:'cliente',nome:'Nome'},cliente_id:'cliente',tipo_atendimento_id:atendimento,forma_pagamento_id:'pagamento',telefone_contato:'85999999999',observacao:'Obs',desconto_valor:2,itens:[{...item,produto_nome:'Teste',valor_total:10,ordem:0}]});const p=usePDVStore.getState().pedidoAtual;assert.equal(p.numero,123);assert.equal(p.data,'2025-01-02');assert.equal(p.total,8);assert.equal(p.telefone_contato,'85999999999');assert.equal(p.cliente.nome,'Nome');
});
test('data civil de PDF e novo rascunho não usa dia UTC',()=>{
 assert.equal(formatDateBR('2026-10-01'),'01/10/2026');assert.equal(dateToString(new Date(2026,9,1,22,30)),'2026-10-01');usePDVStore.getState().novoPedido();assert.equal(usePDVStore.getState().pedidoAtual.data,dateToString(new Date()));
});
