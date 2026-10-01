// Teste de integração HTTP: somente os servidores locais de teste nas portas abaixo.
const assert = require('node:assert/strict');
const app = 'http://127.0.0.1:3110', banco = 'http://127.0.0.1:3311';
async function main() {
  const resultados=[];
  const chamar=async(nome,dados={},token,mutation=false)=>{
    const headers=token?{Authorization:'Bearer '+token}:{};
    if(mutation)headers['Content-Type']='application/json';
    const r=await fetch(app+'/api/trpc/'+nome+(mutation?'':'?input='+encodeURIComponent(JSON.stringify({json:dados}))),{
      method:mutation?'POST':'GET',headers,...(mutation?{body:JSON.stringify({json:dados})}:{})
    });
    const body=await r.json();return {status:r.status,data:body.result?.data?.json,error:body.error?.json};
  };
  for(const nome of ['clientes.list','pedidos.list','produtos.list','configuracoes.get'])assert.equal((await chamar(nome)).status,401);
  assert.equal((await chamar('pedidos.create',{},undefined,true)).status,401);
  assert.equal((await chamar('pedidos.list',{},'invalido')).status,401);
  resultados.push('Consultas, criação e token inválido negados com HTTP 401');
  const auth=await fetch(banco+'/auth/v1/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'operador@example.invalid',password:'teste-local'})});
  const {access_token:token}=await auth.json();
  assert.equal((await chamar('auth.me',{},token)).status,200);
  const fixture=await (await fetch(banco+'/__estado')).json();
  const detalhe=await chamar('pedidos.getById',{id:fixture.pedidoId},token);
  assert.equal(detalhe.status,200);assert.equal(detalhe.data.numero,1);assert.equal(detalhe.data.data,'2026-09-28');
  assert.equal(detalhe.data.total,17);assert.equal(detalhe.data.desconto_valor,2);assert.equal(detalhe.data.endereco.numero,'123');
  resultados.push('Sessão validada e detalhe preserva número, data, desconto, total e endereço completo');
  const dados={chave_requisicao:crypto.randomUUID(),data:'2026-10-01',tipo_atendimento_id:detalhe.data.tipo_atendimento_id,
    cliente_id:detalhe.data.cliente_id,endereco_id:detalhe.data.endereco_id,desconto_valor:2,itens:[{produto_id:detalhe.data.itens[0].produto_id,quantidade:2,valor_unitario:10,desconto_valor:1}]};
  const primeiro=await chamar('pedidos.create',dados,token,true),retry=await chamar('pedidos.create',dados,token,true);
  assert.equal(primeiro.status,200);assert.equal(retry.data.id,primeiro.data.id);assert.equal(primeiro.data.total,17);
  resultados.push('Criação via HTTP reenvia a mesma chave sem duplicar e calcula total no PostgreSQL');
  const alterado=await chamar('pedidos.update',{id:primeiro.data.id,versao:primeiro.data.versao,observacao:'Editado por HTTP'},token,true);
  assert.equal(alterado.status,200);assert.equal((await chamar('pedidos.update',{id:primeiro.data.id,versao:primeiro.data.versao,observacao:'Versão antiga'},token,true)).status,409);
  resultados.push('Edição incrementa versão e conflito retorna HTTP 409');
  assert.equal((await chamar('pedidos.list',{search:'999999'},token)).data.total,0);
  resultados.push('Busca por número inexistente retorna lista vazia real');
  try {
    await fetch(banco+'/__falha',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"ativo":true}'});
    assert.notEqual((await chamar('pedidos.list',{},token)).status,200);
    resultados.push('Falha de consulta HTTP é propagada como erro');
  } finally { await fetch(banco+'/__falha',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"ativo":false}'}); }
  console.log(JSON.stringify({data:new Date().toISOString(),ambiente:'Next local + Supabase simulado + PostgreSQL PGlite',resultados},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
