// Exemplos sintéticos para inspeção A4. Não lê dados de produção.
const fs=require('node:fs');
const {carregar}=require('../tests/helpers/carregar.cjs');
const {criarDefinicaoPedido}=carregar('src/lib/pdf/pedido-pdf.ts');
const pdfMake=require('pdfmake/build/pdfmake');
const logo='data:image/png;base64,'+fs.readFileSync('public/icon-192x192.png').toString('base64');
const empresa={nome_empresa:'Lojas Manu',razao_social:'Empresa de demonstração - dados fictícios',cnpj:'00.000.000/0001-00',endereco:'Rua de demonstração, 100, Centro, Fortaleza, CE, CEP: 60000-000',telefone:'(85) 00000-0000',instagram:'@exemplo',site:'example.invalid'};
const itens=[
 {produto_nome:'Camisa feminina em algodão',produto_codigo:'DEMO-001',produto_unidade:'UN',cor_descricao:'Azul',quantidade:2,valor_unitario:89.9,desconto_valor:9.8,valor_total:170},
 {produto_nome:'Calça de linho com cintura alta e acabamento em costura aparente',produto_codigo:'DEMO-002',produto_unidade:'UN',cor_descricao:'Areia',quantidade:1,valor_unitario:159.9,desconto_valor:0,valor_total:159.9},
 {produto_nome:'Tecido de algodão estampado',produto_codigo:'DEMO-003',produto_unidade:'M',cor_descricao:'Floral azul',quantidade:1.125,valor_unitario:40,desconto_valor:0,valor_total:45},
];
const pedido={numero:142,status:'FINALIZADO',data:'2026-10-02',cliente_nome:'Mariana de demonstração',cliente_cpf:'00000000000',cliente_telefone:'(85) 00000-0000',endereco:'Rua das Flores, 123, Apto 204, Bloco B, Centro, Fortaleza, CE, CEP: 60000-000',tipo_atendimento:'Venda',forma_pagamento:'Pix',observacoes:'Dados fictícios para avaliação do layout. Conferir os itens e o endereço de entrega.',itens,subtotal:374.9,desconto_valor:14.9,total:360};
async function salvar(nome,dados){const doc=criarDefinicaoPedido(dados,empresa,logo,new Date('2026-10-02T15:00:00Z'));const buffer=await new Promise(resolve=>pdfMake.createPdf(doc).getBuffer(resolve));fs.writeFileSync(`output/pdf/${nome}.pdf`,buffer); if(process.env.PDF_LAYOUT_CHECK){ const paginas=await new Promise(resolve=>pdfMake.createPdf(criarDefinicaoPedido(dados,empresa,logo,new Date('2026-10-02T15:00:00Z')))._getPages({},resolve)); fs.mkdirSync('tmp/pdfs',{recursive:true}); fs.writeFileSync(`tmp/pdfs/${nome}-layout.json`,JSON.stringify(paginas.map(p=>p.items.filter(i=>i.type==='line').map(i=>({x:i.item.x,y:i.item.y,altura:i.item.height,text:i.item.inlines.map(t=>t.text).join('')}))))); }}
(async()=>{
 await salvar('pedido-exemplo',pedido);
 await salvar('rascunho-exemplo',{...pedido,numero:undefined,status:undefined,rascunho:true,observacoes:undefined,itens:[itens[2]],subtotal:45,desconto_valor:0,total:45});
 const longos=Array.from({length:65},(_,i)=>({...itens[i%3],produto_nome:`Produto ${i+1} - descrição detalhada de demonstração para conferir leitura e paginação de pedidos extensos`,produto_codigo:`DEMO-${String(i+1).padStart(3,'0')}`}));
 const subtotal=Math.round(longos.reduce((s,i)=>s+i.valor_total,0)*100)/100;
 await salvar('pedido-multiplas-paginas',{...pedido,itens:longos,subtotal,desconto_valor:14.9,total:subtotal-14.9,observacoes:'Observações de demonstração com várias linhas. '.repeat(50)});
 console.log('Três PDFs de demonstração gerados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
