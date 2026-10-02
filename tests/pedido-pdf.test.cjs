const {test}=require('node:test');
const assert=require('node:assert/strict');
const {carregar}=require('./helpers/carregar.cjs');
const pdfMake=require('pdfmake/build/pdfmake');
const {criarDefinicaoPedido,gerarPedidoPDF}=carregar('src/lib/pdf/pedido-pdf.ts');
const empresa={nome_empresa:'Lojas Manu - demonstração',endereco:'Rua de demonstração, 100, Centro, Fortaleza, CE'};
const item={produto_nome:'Produto de demonstração',produto_codigo:'SKU-001',produto_unidade:'M',cor_descricao:'Azul',quantidade:1.125,valor_unitario:100,desconto_valor:12.5,valor_total:100};
const pedido={numero:42,status:'FINALIZADO',data:'2026-10-02',cliente_nome:'Cliente de demonstração',endereco:'Rua das Flores, 123, Apto 2, Centro, Fortaleza, CE',itens:[item],subtotal:100,desconto_valor:10,total:90};
const bytes=def=>new Promise(resolve=>pdfMake.createPdf(def).getBuffer(resolve));
test('PDF identifica rascunho, situação, endereço completo, código e unidade sem indicar pagamento recebido',()=>{
 const doc=criarDefinicaoPedido(pedido,empresa);const texto=JSON.stringify(doc.content);
 for(const valor of ['Pedido #00042','Finalizado','Apto 2','SKU-001','M','1,125','Forma de pagamento','Descontos nos itens (já aplicados)','Desconto do pedido','R$ 90,00'])assert.ok(texto.includes(valor),valor);
 assert.ok(!texto.includes('Pagar:')); assert.ok(!texto.includes('S/N'));
 assert.ok(JSON.stringify(criarDefinicaoPedido({...pedido,numero:undefined},empresa).content).includes('Rascunho de venda'));
 assert.ok(JSON.stringify(criarDefinicaoPedido({...pedido,rascunho:true},empresa).content).includes('Dados em edição no PDV'));
});
test('não imprime pedido vazio, data inexistente ou valores inválidos',async()=>{
 for(const dados of [{itens:[]},{data:'2026-02-30'},{total:NaN},{itens:[{...item,quantidade:0}]}])assert.throws(()=>criarDefinicaoPedido({...pedido,...dados},empresa));
 await assert.rejects(gerarPedidoPDF({...pedido,itens:[]},empresa),/pelo menos um produto/);
});
test('desconto ausente remove coluna desnecessária; campos ausentes não inventam contato ou unidade',()=>{
 const doc=criarDefinicaoPedido({...pedido,itens:[{...item,produto_unidade:undefined,produto_codigo:undefined,cor_descricao:undefined,desconto_valor:0}],observacoes:''},empresa);
 const tabela=doc.content.find(c=>c.table);
 assert.equal(tabela.table.body[0].length,5);
 assert.ok(!JSON.stringify(doc.content).includes('Descontos nos itens'));
 assert.ok(!JSON.stringify(doc.content).includes('Observações'));
});
test('pedido com muitas linhas gera PDF real de várias páginas com cabeçalho e totais preservados',async()=>{
 const itens=Array.from({length:80},(_,i)=>({...item,produto_codigo:`SKU-${i+1}`,produto_nome:`Produto ${i+1} de demonstração com descrição detalhada para testar a quebra de linha.`}));
 const doc=criarDefinicaoPedido({...pedido,itens,subtotal:8000,total:7990,observacoes:'Conferir os produtos antes da entrega.'},empresa);
 const arquivo=await bytes(doc);
 assert.equal(arquivo.subarray(0,5).toString(),'%PDF-');
 assert.ok((arquivo.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1);
 assert.equal(doc.content.find(c=>c.table).table.headerRows,1);
});
test('logo indisponível não bloqueia geração e saída usa o nome correto do rascunho',async()=>{
 const original=global.fetch,criar=pdfMake.createPdf;let nome,definicao;
 global.fetch=async()=>({ok:false});
 pdfMake.createPdf=def=>{definicao=def;return{download:arquivo=>{nome=arquivo;}};};
 try{
  await gerarPedidoPDF({...pedido,numero:undefined}, {...empresa,logo_url:'https://example.invalid/logo.png'},'download');
  assert.equal(nome,'pedido-rascunho.pdf');assert.ok(!JSON.stringify(definicao.content).includes('"image":'));
  global.fetch=async()=>({ok:true,blob:async()=>({type:'text/html',size:100})});
  await gerarPedidoPDF(pedido,empresa,'download');assert.equal(nome,'pedido-42.pdf');
 }finally{global.fetch=original;pdfMake.createPdf=criar;}
});
