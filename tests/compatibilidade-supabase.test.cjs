const { test,before,after } = require('node:test');
const assert = require('node:assert/strict');
const { criarBanco,produto,atendimento } = require('./helpers/banco-pdv.cjs');
let banco;
before(async()=>{ banco=await criarBanco({schemaProducao:true}); });
after(async()=>{ if(banco)await banco.close(); });
const criar=async(dados={})=>{
  const r=await banco.supabase.rpc('pdv_mutar_pedido',{p_acao:'criar',p_chave:crypto.randomUUID(),p_dados:{data:'2026-10-01',tipo_atendimento_id:atendimento,itens:[{produto_id:produto,quantidade:3,valor_unitario:0.1,desconto_valor:0}],desconto_valor:0.1,...dados}});
  assert.equal(r.error,null);return r.data;
};
test('tabelas legadas ficam inacessíveis aos papéis da API',async()=>{
  for(const papel of ['anon','authenticated']){
    await banco.pg.exec(`SET ROLE ${papel}`);
    try{for(const tabela of ['tblClientes','tblPedidos','tblItensPedidos','tblProdutos','tblCores'])await assert.rejects(banco.pg.query(`SELECT * FROM "${tabela}"`),/permission denied/);}
    finally{await banco.pg.exec('RESET ROLE');}
  }
});
test('migração/pré-requisitos preservam view e operam com triggers e precisão reais',async()=>{
  const p=await criar();assert.equal(Number(p.subtotal),0.3);assert.equal(Number(p.total),0.2);
  const view=(await banco.pg.query('SELECT * FROM vw_pedidos_completos WHERE id=$1',[p.id])).rows[0];
  assert.equal(Number(view.versao),1);assert.ok(Object.hasOwn(view,'endereco_numero'));
});
test('substituição de itens e finalização conservam desconto com triggers legados',async()=>{
  const p=await criar({itens:[{produto_id:produto,quantidade:1,valor_unitario:10,desconto_valor:0}],desconto_valor:8});
  const editado=await banco.supabase.rpc('pdv_mutar_pedido',{p_acao:'editar',p_id:p.id,p_versao:p.versao,p_dados:{itens:[{produto_id:produto,quantidade:2,valor_unitario:10,desconto_valor:2}],desconto_valor:5}});
  assert.equal(editado.error,null);assert.equal(Number(editado.data.subtotal),18);assert.equal(Number(editado.data.total),13);
  const finalizado=await banco.supabase.rpc('pdv_mutar_pedido',{p_acao:'finalizar',p_id:p.id,p_versao:editado.data.versao});
  assert.equal(finalizado.error,null);assert.equal(Number(finalizado.data.total),13);assert.equal(finalizado.data.status,'FINALIZADO');
});
test('numeração MAX legado protegida gera pedidos distintos e retry é idempotente',async()=>{
  const a=await criar(),b=await criar();assert.equal(Number(b.numero),Number(a.numero)+1);
  const chave=crypto.randomUUID(),args={p_acao:'duplicar',p_id:a.id,p_versao:a.versao,p_chave:chave};
  const r=await banco.supabase.rpc('pdv_mutar_pedido',args),retry=await banco.supabase.rpc('pdv_mutar_pedido',args);
  assert.equal(r.error,null);assert.equal(retry.error,null);assert.deepEqual(retry.data,r.data);
});
