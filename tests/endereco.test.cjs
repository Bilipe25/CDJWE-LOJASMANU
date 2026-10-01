const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { criarBanco, produto, atendimento } = require('./helpers/banco-pdv.cjs');
const { carregar } = require('./helpers/carregar.cjs');
const { clientesRouter } = carregar('src/server/routers/clientes.ts');
const { pedidosRouter } = carregar('src/server/routers/pedidos.ts');
const { formatarEndereco, selecionarEndereco } = carregar('src/lib/utils/endereco.ts');
let banco, clientes, pedidos;
before(async()=>{ banco=await criarBanco();const ctx={supabase:banco.supabase,user:{id:banco.usuario},role:'ADMIN'};clientes=clientesRouter.createCaller(ctx);pedidos=pedidosRouter.createCaller(ctx); });
after(async()=>{ if(banco) await banco.close(); });
const endereco={logradouro:'Rua das Flores',numero:'123',complemento:'Apto 2',bairro:'Centro',cidade:'Fortaleza',estado:'CE',cep:'60000-000',principal:true};
const completo='Rua das Flores, 123, Apto 2, Centro, Fortaleza, CE, CEP: 60000-000';
const item={produto_id:produto,quantidade:1,valor_unitario:10,desconto_valor:0};
const criarPedido=(dados)=>pedidos.create({data:'2026-10-01',tipo_atendimento_id:atendimento,chave_requisicao:crypto.randomUUID(),itens:[item],...dados});
test('criar cliente preserva os sete campos na gravação transacional e consulta do PDV',async()=>{
 const c=await clientes.create({nome:'Teste endereço',endereco}); const salvo=await clientes.getById({id:c.id});
 assert.equal(formatarEndereco(salvo.enderecos[0]),completo);for(const campo of Object.keys(endereco)) assert.equal(salvo.enderecos[0][campo],endereco[campo]);
});
test('editar permite limpar complemento e mudar número',async()=>{
 const c=await clientes.create({nome:'Edição',endereco});await clientes.update({id:c.id,endereco:{...endereco,complemento:'',numero:'456'}});
 const salvo=await clientes.getById({id:c.id});assert.equal(salvo.enderecos.length,1);assert.equal(salvo.enderecos[0].complemento,'');assert.equal(salvo.enderecos[0].numero,'456');
});
test('endereço sem principal é atualizado no mesmo registro',async()=>{
 const c=await clientes.create({nome:'Sem principal',endereco:{...endereco,principal:false}});await clientes.update({id:c.id,endereco});assert.equal((await clientes.getById({id:c.id})).enderecos.length,1);
});
test('listagem recebe endereço completo mesmo com view antiga',async()=>{
 const c=await clientes.create({nome:'Busca única endereço',endereco});const lista=await clientes.list({search:c.nome});assert.equal(lista.clientes[0].endereco_principal_completo,completo);
});
test('pedido consulta endereço de entrega diferente do principal',async()=>{
 const c=await clientes.create({nome:'Entrega',endereco});const entrega=(await banco.pg.query('INSERT INTO enderecos(cliente_id,logradouro,numero,principal) VALUES ($1,$2,$3,false) RETURNING id',[c.id,'Rua Entrega','987'])).rows[0];
 const p=await criarPedido({cliente_id:c.id,endereco_id:entrega.id});const salvo=await pedidos.getById({id:p.id});assert.equal(salvo.endereco.id,entrega.id);assert.equal(formatarEndereco(salvo.endereco),'Rua Entrega, 987');
});
test('pedido sem endereço não recebe principal na impressão',async()=>{
 const c=await clientes.create({nome:'Sem entrega',endereco});const p=await criarPedido({cliente_id:c.id,endereco_id:null});assert.equal((await pedidos.getById({id:p.id})).endereco,null);
});
test('seleção preserva secundário, ausência e ID indisponível',()=>{
 const lista=[{id:'principal',...endereco},{id:'entrega',...endereco,principal:false}];assert.equal(selecionarEndereco(lista).id,'principal');assert.equal(selecionarEndereco(lista,'entrega').id,'entrega');assert.equal(selecionarEndereco(lista,null),null);assert.equal(selecionarEndereco(lista,'ausente'),null);
});
test('erro de consulta é propagado sem aparentar ausência de endereço',async()=>{
 const c=await clientes.create({nome:'Falha consulta'});const fake={...banco.supabase,from(t){return t==='enderecos'?{select(){return this},eq(){return this},order(){return this},then(resolve){return resolve({data:null,error:{message:'Falha de conexão'}})}}:banco.supabase.from(t)}};
 await assert.rejects(clientesRouter.createCaller({supabase:fake,user:{id:banco.usuario},role:'ADMIN'}).getById({id:c.id}),/Falha de conexão/);
});
test('endereço de outro cliente é rejeitado antes de gravar',async()=>{
 const a=await clientes.create({nome:'Cliente A',endereco}),b=await clientes.create({nome:'Cliente B'});const e=(await clientes.getById({id:a.id})).enderecos[0];const antes=(await banco.pg.query('SELECT count(*) AS total FROM pedidos')).rows[0].total;
 await assert.rejects(criarPedido({cliente_id:b.id,endereco_id:e.id}),/não pertence/);assert.equal((await banco.pg.query('SELECT count(*) AS total FROM pedidos')).rows[0].total,antes);
});
test('trocar cliente limpa endereço e permite remoção explícita',async()=>{
 const a=await clientes.create({nome:'Troca A',endereco}),b=await clientes.create({nome:'Troca B'});const e=(await clientes.getById({id:a.id})).enderecos[0];let p=await criarPedido({cliente_id:a.id,endereco_id:e.id});p=await pedidos.update({id:p.id,versao:p.versao,cliente_id:b.id});assert.equal(p.endereco_id,null);p=await pedidos.update({id:p.id,versao:p.versao,cliente_id:null,endereco_id:null});assert.equal(p.cliente_id,null);
});
test('endereço legado e campos vazios continuam legíveis',()=>{
 assert.equal(formatarEndereco({logradouro:'Rua Antiga, 12, Centro'}),'Rua Antiga, 12, Centro');assert.equal(formatarEndereco({logradouro:' Rua ',numero:' ',complemento:null,cep:' '}),'Rua');
});
