const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { carregar } = require('./helpers/carregar.cjs');
const { criarBanco } = require('./helpers/banco-pdv.cjs');
const { clientesRouter } = carregar('src/server/routers/clientes.ts');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { produtosRouter } = carregar('src/server/routers/produtos.ts');
const { clienteSchema, cpfValido } = carregar('src/lib/schemas/cliente.ts');
const { validarFiltrosPedidos, filtrosDaUrl, urlComFiltros } = carregar('src/lib/schemas/filtros-pedidos.ts');
const { buscarTodosFiltrados, empresaParaDocumento, pedidoParaDocumento } = carregar('src/lib/utils/documentos.ts');
let banco, clientes, pedidos, produtos;
before(async () => { banco = await criarBanco(); const ctx={supabase:banco.supabase,user:{id:banco.usuario},role:'ADMIN'};clientes=clientesRouter.createCaller(ctx);pedidos=pedidosRouter.createCaller(ctx);produtos=produtosRouter.createCaller(ctx); });
after(async () => banco?.close());
const novoPedido = dados => pedidos.create({ data:'2026-10-01', tipo_atendimento_id:banco.atendimento, chave_requisicao:crypto.randomUUID(), itens:[{produto_id:banco.produto,quantidade:1,valor_unitario:10}], ...dados });
test('validação compartilhada normaliza documentos e distingue ausência de limpeza', () => {
 assert.equal(cpfValido('529.982.247-25'),true);assert.equal(cpfValido('111.111.111-11'),false);assert.equal(cpfValido('52998224724'),false);
 const c=clienteSchema.parse({nome:' Maria ',cpf:'529.982.247-25',telefone:'+55 (85) 99999-1234',email:' CLIENTE@EXAMPLE.INVALID '});
 assert.equal(c.nome,'Maria');assert.equal(c.cpf,'52998224725');assert.equal(c.telefone,'85999991234');assert.equal(c.email,'cliente@example.invalid');
 assert.equal(clienteSchema.parse({nome:'Maria',cpf:'',telefone:'',email:''}).cpf,null);
 assert.equal(Object.hasOwn(clienteSchema.parse({nome:'Maria'}),'cpf'),false);
 assert.equal(clienteSchema.safeParse({nome:'Maria',cpf:'123',telefone:'000',email:'x'}).success,false);
});
test('campos opcionais vazios limpam o cadastro e campo ausente preserva valor', async () => {
 const c=await clientes.create({nome:'Limpeza',cpf:'52998224725',telefone:'85999991234',email:'cliente@example.invalid',endereco:{logradouro:'Rua original'}});
 await clientes.update({id:c.id,nome:'Alterado'});assert.equal((await clientes.getById({id:c.id})).cpf,'52998224725');
 await clientes.update({id:c.id,cpf:'',telefone:'',email:'',enderecos:[]});
 const salvo=await clientes.getById({id:c.id});assert.equal(salvo.cpf,null);assert.equal(salvo.telefone,null);assert.equal(salvo.email,null);assert.equal(salvo.enderecos[0].ativo,false);
});
test('CPF duplicado considera formatos legados e clientes inativos; telefone pode ser compartilhado', async () => {
 const c=await clientes.create({nome:'CPF legado',telefone:'85999991234',ativo:false});
 await banco.pg.query('UPDATE clientes SET cpf=$1 WHERE id=$2',['529.982.247-25',c.id]);
 await assert.rejects(clientes.create({nome:'Duplicado',cpf:'52998224725'}),/CPF já está cadastrado/);
 const outro=await clientes.create({nome:'Contato compartilhado',telefone:'85999991234'});assert.notEqual(outro.id,c.id);
 await clientes.update({id:c.id,cpf:null});
});
test('filtros de situação encontram inativos e permitem reativação', async () => {
 const c=await clientes.create({nome:'Reativação exclusiva',ativo:false});
 assert.equal((await clientes.list({search:'Reativação exclusiva'})).total,0);
 assert.equal((await clientes.list({search:'Reativação exclusiva',ativo:false})).clientes[0].id,c.id);
 assert.equal((await clientes.list({search:'Reativação exclusiva',ativo:null})).total,1);
 await clientes.update({id:c.id,ativo:true});assert.equal((await clientes.list({search:'Reativação exclusiva'})).total,1);
});
test('busca literal por nome e contato normalizado pagina com contagem coerente', async () => {
 const c=await clientes.create({nome:'Busca (especial), %',cpf:'52998224725',telefone:'(85) 99999-1234'});
 assert.equal((await clientes.list({search:'(especial), %'})).clientes[0].id,c.id);
 assert.equal((await clientes.list({search:'529.982.247-25'})).clientes[0].id,c.id);
 assert.ok((await clientes.list({search:'(85) 99999-1234'})).clientes.some(x=>x.id===c.id));
 assert.ok((await clientes.list({search:'+55 (85) 99999-1234'})).clientes.some(x=>x.id===c.id));
 assert.equal((await clientes.list({search:'(especial), %',limit:1,offset:1})).total,1);
 await clientes.update({id:c.id,cpf:null});
});
test('múltiplos endereços trocam principal sem apagar registros e rejeitam principal duplicado', async () => {
 const c=await clientes.create({nome:'Multi',enderecos:[{logradouro:'Rua A',principal:true},{logradouro:'Rua B',principal:false}]});
 let es=(await clientes.getById({id:c.id})).enderecos;
 await clientes.update({id:c.id,enderecos:es.map(e=>({id:e.id,logradouro:e.logradouro,principal:e.logradouro==='Rua B'}))});
 es=(await clientes.getById({id:c.id})).enderecos;assert.equal(es.filter(e=>e.principal).length,1);assert.equal(es[0].logradouro,'Rua B');
 await assert.rejects(clientes.update({id:c.id,enderecos:es.map(e=>({id:e.id,logradouro:e.logradouro,principal:true}))}),/apenas um/);
 await assert.rejects(banco.pg.query('UPDATE enderecos SET principal=true WHERE cliente_id=$1',[c.id]),/unique/);
 await clientes.update({id:c.id,enderecos:[{id:es[0].id,logradouro:'Rua B',principal:true}]});
 assert.equal((await clientes.getById({id:c.id})).enderecos.length,2);assert.equal((await clientes.getById({id:c.id})).enderecos.filter(e=>e.ativo).length,1);
});
test('endereço estrangeiro ou repetido faz rollback de todo o cadastro', async () => {
 const a=await clientes.create({nome:'Dono A',endereco:{logradouro:'Rua A'}}), b=await clientes.create({nome:'Dono B',endereco:{logradouro:'Rua B'}});
 const e=(await clientes.getById({id:a.id})).enderecos[0];
 await assert.rejects(clientes.update({id:b.id,nome:'Não gravar',enderecos:[{id:e.id,logradouro:'Inválido'}]}),/não pertence/);
 assert.equal((await clientes.getById({id:b.id})).nome,'Dono B');
 await assert.rejects(clientes.update({id:a.id,enderecos:[{id:e.id,logradouro:'Primeira',principal:false},{id:e.id,logradouro:'Segunda',principal:false}]}),/repetido/);
 assert.equal((await clientes.getById({id:a.id})).enderecos[0].logradouro,'Rua A');
});
test('reimpressão conserva endereço com campos nulos após edição e desativação no cadastro', async () => {
 const c=await clientes.create({nome:'Histórico',endereco:{logradouro:'Rua da venda',numero:'12'}}), e=(await clientes.getById({id:c.id})).enderecos[0];
 const p=await novoPedido({cliente_id:c.id,endereco_id:e.id});
 await clientes.update({id:c.id,enderecos:[{id:e.id,logradouro:'Rua nova',numero:'90',ativo:false}]});
 const salvo=await pedidos.getById({id:p.id});assert.equal(salvo.endereco.logradouro,'Rua da venda');assert.equal(salvo.endereco.numero,'12');
 assert.match(pedidoParaDocumento(salvo).endereco,/Rua da venda, 12/);
 const editado=await pedidos.update({id:p.id,versao:p.versao,observacao:'Só observação',endereco_id:e.id});assert.equal((await pedidos.getById({id:editado.id})).endereco.logradouro,'Rua da venda');
 await assert.rejects(novoPedido({cliente_id:c.id,endereco_id:e.id}),/endereço ativo/);
 const duplicado=await pedidos.duplicar({id:p.id,versao:editado.versao,chave_requisicao:crypto.randomUUID()});
 assert.equal((await pedidos.getById({id:duplicado})).endereco,null);
});
test('trocar endereço do pedido cria novo snapshot e remover limpa explicitamente', async () => {
 const c=await clientes.create({nome:'Troca snapshot',enderecos:[{logradouro:'Antes',principal:true},{logradouro:'Depois',principal:false}]});const es=(await clientes.getById({id:c.id})).enderecos;
 let p=await novoPedido({cliente_id:c.id,endereco_id:es[0].id});p=await pedidos.update({id:p.id,versao:p.versao,endereco_id:es[1].id});assert.equal((await pedidos.getById({id:p.id})).endereco.logradouro,es[1].logradouro);
 await pedidos.update({id:p.id,versao:p.versao,endereco_id:null});assert.equal((await pedidos.getById({id:p.id})).endereco,null);
});
test('migração reaplicada mantém versão/data de alteração ao preencher snapshot legado', async () => {
 const c=await clientes.create({nome:'Legado snapshot',endereco:{logradouro:'Rua legado'}}),e=(await clientes.getById({id:c.id})).enderecos[0];const p=await novoPedido({cliente_id:c.id,endereco_id:e.id});
 await banco.pg.exec("CREATE FUNCTION teste_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=now(); RETURN NEW; END $$; CREATE TRIGGER update_pedidos_timestamp BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION teste_timestamp();");
 await banco.pg.query('UPDATE pedidos SET endereco_snapshot=NULL WHERE id=$1',[p.id]);const antes=(await banco.pg.query('SELECT updated_at,versao,total FROM pedidos WHERE id=$1',[p.id])).rows[0];
 await banco.pg.exec(fs.readFileSync('supabase/migrations/202610010002_p2_cadastro_consultas.sql','utf8'));
 const depois=(await banco.pg.query('SELECT updated_at,versao,total,endereco_snapshot FROM pedidos WHERE id=$1',[p.id])).rows[0];
 assert.equal(depois.updated_at.getTime(),antes.updated_at.getTime());assert.equal(depois.versao,antes.versao);assert.equal(depois.total,antes.total);assert.equal(depois.endereco_snapshot.logradouro,'Rua legado');
 await banco.pg.exec('DROP TRIGGER update_pedidos_timestamp ON pedidos; DROP FUNCTION teste_timestamp();');
});
test('listagem agregada permanece completa com mais de mil endereços e clientes', async () => {
 await banco.pg.exec("INSERT INTO clientes(nome) SELECT 'Volume P2 '||lpad(i::text,4,'0') FROM generate_series(1,1005)i; INSERT INTO enderecos(cliente_id,logradouro,principal) SELECT id,'Rua '||nome,true FROM clientes WHERE nome LIKE 'Volume P2 %';");
 const ultimo=await clientes.list({search:'Volume P2',limit:25,offset:1000});assert.equal(ultimo.total,1005);assert.equal(ultimo.clientes.length,5);assert.ok(ultimo.clientes.every(c=>c.endereco_principal_completo.includes(c.nome)));
});
test('produto é buscado por código literal e exato tem prioridade sobre nome', async () => {
 await banco.pg.exec("INSERT INTO produtos(id,nome,codigo,ativo) VALUES(gen_random_uuid(),'A menção 789','OUTRO',true),(gen_random_uuid(),'Z exato','789',true),(gen_random_uuid(),'Produto % literal','COD,%',true),(gen_random_uuid(),'Inativo','789',false);");
 const encontrados=await produtos.list({search:'789',limit:1});assert.equal(encontrados.total,2);assert.equal(encontrados.produtos[0].codigo,'789');assert.equal((await produtos.list({search:'789',limit:1,offset:1})).produtos[0].codigo,'OUTRO');assert.equal((await produtos.list({search:'COD,%'})).total,1);
});
test('histórico do cliente pagina de maneira estável sem truncar silenciosamente', async () => {
 const c=await clientes.create({nome:'Histórico paginado'});for(let i=0;i<3;i++)await novoPedido({cliente_id:c.id});const a=await pedidos.listByCliente({clienteId:c.id,limit:2}),b=await pedidos.listByCliente({clienteId:c.id,limit:2,offset:2});assert.equal(a.total,3);assert.equal(b.pedidos.length,1);assert.notEqual(a.pedidos[0].id,b.pedidos[0].id);
});
test('RPCs novas não permitem leitura anônima', async () => {
 await banco.pg.exec('SET ROLE anon');try{for(const sql of ['SELECT pdv_listar_clientes()','SELECT pdv_listar_produtos()'])await assert.rejects(banco.pg.query(sql),/permission denied/);}finally{await banco.pg.exec('RESET ROLE');}
});
test('falha de Auth ou de consulta de permissões é indisponibilidade, conta não habilitada continua negada', async () => {
 const { createTRPCContext }=carregar('src/lib/trpc/server.ts');const antigoFetch=global.fetch,antigaUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,antigaChave=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://teste-local.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='chave-de-teste';let modo='auth-falha';
 global.fetch=async url=>{
   const auth=String(url).includes('/auth/');if((auth && modo==='auth-falha')||(!auth && modo==='permissoes-falha'))return new Response(JSON.stringify({message:'Serviço indisponível',code:'XX000'}),{status:503,headers:{'Content-Type':'application/json'}});
   return new Response(JSON.stringify(auth?{id:banco.usuario,email:'operador@example.invalid'}:[]),{headers:{'Content-Type':'application/json'}});
 };
 const request=()=>new Request('http://teste-local.invalid/api/trpc',{headers:{authorization:'Bearer teste-local'}});
 try {
   await assert.rejects(createTRPCContext(request()),e=>e.code==='SERVICE_UNAVAILABLE');modo='permissoes-falha';await assert.rejects(createTRPCContext(request()),e=>e.code==='SERVICE_UNAVAILABLE');modo='sem-acesso';await assert.rejects(createTRPCContext(request()),e=>e.code==='FORBIDDEN');
 } finally {global.fetch=antigoFetch;if(antigaUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=antigaUrl;if(antigaChave===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=antigaChave;}
});
test('URL/storage inválidos recebem defaults, datas civis e UUID são conferidos', () => {
 const f=validarFiltrosPedidos({page:-1,rowsPerPage:999,status:'HACK',dataInicio:'2026-02-30',dataFim:'x',formaPagamento:'inválido',clienteSelecionado:{id:'x',cpf:'não guardar'}});
 assert.equal(f.page,0);assert.equal(f.rowsPerPage,10);assert.equal(f.status,'');assert.equal(f.dataInicio,'');assert.equal(f.clienteSelecionado,null);
 assert.equal(validarFiltrosPedidos({page:'NaN'}).page,0);assert.equal(validarFiltrosPedidos({dataInicio:'2026-10-03',dataFim:'2026-10-01'}).dataFim,'');
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',url=urlComFiltros('/pedidos?id=preservar',validarFiltrosPedidos({clienteSelecionado:{id,nome:'Nome privado',cpf:'segredo'}}));
 assert.ok(url.includes('filtro_clienteId='+id));assert.ok(!url.includes('privado'));assert.ok(!url.includes('cpf'));assert.equal(filtrosDaUrl(new URLSearchParams(url.split('?')[1])).clienteSelecionado.nome,'');
 assert.ok(!urlComFiltros('/pedidos?filtro_clienteId='+id,validarFiltrosPedidos({})).includes('filtro_clienteId'));
});
test('exportação completa busca lotes e rejeita alteração, repetição e truncamento', async () => {
 const registros=Array.from({length:1005},(_,i)=>({id:String(i)})),chamadas=[];
 const resultado=await buscarTodosFiltrados(async(offset,limit)=>{chamadas.push(offset);return {pedidos:registros.slice(offset,offset+limit),total:1005};});assert.equal(resultado.length,1005);assert.deepEqual(chamadas,[0,250,500,750,1000]);
 let n=0;await assert.rejects(buscarTodosFiltrados(async()=>({pedidos:[{id:'a'}],total:++n===1?2:3})),/mudaram/);
 await assert.rejects(buscarTodosFiltrados(async()=>({pedidos:[{id:'a'}],total:2})),/mudaram/);
 await assert.rejects(buscarTodosFiltrados(async()=>({pedidos:[],total:1})),/carregar todos/);
 assert.deepEqual(await buscarTodosFiltrados(async()=>({pedidos:[],total:0})),[]);
});
test('adaptador de empresa conserva todos os campos de endereço nos documentos', () => {
 const e=empresaParaDocumento({nome_empresa:'Loja',logradouro:'Rua X',numero:'10',complemento:'Sala 2',bairro:'Centro',cidade:'Fortaleza',estado:'CE',cep:'60000-000'});assert.equal(e.nome_empresa,'Loja');for(const campo of ['Rua X','10','Sala 2','Centro','Fortaleza','CE','60000-000'])assert.ok(e.endereco.includes(campo));assert.equal(empresaParaDocumento(null).nome_empresa,'Lojas Manu');
});
