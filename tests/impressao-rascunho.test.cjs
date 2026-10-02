const {test}=require('node:test');
const assert=require('node:assert/strict');
const {carregar}=require('./helpers/carregar.cjs');
const {imprimirPDFNaPagina}=carregar('src/lib/pdf/impressao-browser.ts');
function ambiente(){
 const eventos=[], listeners=new Map(),frames=[];
 global.window={open(){throw new Error('Popup proibido');},addEventListener(nome,fn){listeners.set(nome,fn);},removeEventListener(nome){listeners.delete(nome);}};
 global.document={body:{appendChild(frame){frames.push(frame);eventos.push('anexar');}},createElement(nome){assert.equal(nome,'iframe');const handlers=new Map();return{style:{},setAttribute(){},remove(){eventos.push('remover');},contentWindow:{focus(){eventos.push('foco');},print(){eventos.push('imprimir');},addEventListener(nome,fn){handlers.set(nome,fn);},removeEventListener(nome){handlers.delete(nome);}},handlers};}};
 return{eventos,listeners,frames};
}
test('imprime PDF na própria página com popups proibidos, somente após carregar',async()=>{
 const a=ambiente(),p=imprimirPDFNaPagina(new Blob(['%PDF-1.3'],{type:'application/pdf'}));
 assert.deepEqual(a.eventos,['anexar']);assert.match(a.frames[0].src,/^blob:/);
 a.frames[0].onload();await p;
 assert.deepEqual(a.eventos,['anexar','foco','imprimir']);
 a.frames[0].handlers.get('afterprint')();assert.equal(a.eventos.at(-1),'remover');
 assert.equal(a.listeners.size,0);
});
test('falha do leitor remove frame e orienta baixar PDF, sem abrir janela',async()=>{
 const a=ambiente(),p=imprimirPDFNaPagina(new Blob(['pdf']));
 a.frames[0].contentWindow.print=()=>{throw new Error('Leitor indisponível');};
 a.frames[0].onload();await assert.rejects(p,/Baixe o PDF/);assert.equal(a.eventos.at(-1),'remover');
});
test('erro de carregamento e saída da página liberam o documento',async()=>{
 let a=ambiente(),p=imprimirPDFNaPagina(new Blob(['pdf']));a.frames[0].onerror();await assert.rejects(p,/Baixe o PDF/);assert.equal(a.listeners.size,0);
 a=ambiente();p=imprimirPDFNaPagina(new Blob(['pdf']));a.listeners.get('pagehide')();await assert.rejects(p,/interrompida/);assert.equal(a.eventos.at(-1),'remover');
});
test('nova impressão cancela documento que ainda estava carregando e não mantém promise pendente',async()=>{
 const a=ambiente(),primeira=imprimirPDFNaPagina(new Blob(['pdf']));const rejeicao=assert.rejects(primeira,/interrompida/);
 const segunda=imprimirPDFNaPagina(new Blob(['pdf']));await rejeicao;
 a.frames[1].onload();await segunda;a.frames[1].handlers.get('afterprint')();
});
test('rascunho gera PDF real para impressão embutida; download não usa o leitor',async()=>{
 delete global.window;delete global.document;
 const real=require('pdfmake/build/pdfmake');let recebido,download;
 const fake={vfs:undefined,createPdf(doc){return{getBlob(cb){real.vfs=fake.vfs;real.createPdf(doc).getBuffer(bytes=>cb(new Blob([bytes],{type:'application/pdf'})));},download(nome){download=nome;}};}};
 const {gerarPedidoPDF}=carregar('src/lib/pdf/pedido-pdf.ts',{'pdfmake/build/pdfmake':fake,'@/lib/pdf/impressao-browser':{imprimirPDFNaPagina:async blob=>{recebido=blob;}}});
 const pedido={data:'2026-10-02',cliente_nome:'Cliente de teste',endereco:'Rua de teste, 123, Sala 2',itens:[{produto_nome:'Produto',quantidade:2,valor_unitario:10,desconto_valor:0,valor_total:20}],subtotal:20,desconto_valor:5,total:15};
 await gerarPedidoPDF(pedido,{nome_empresa:'Empresa de teste',endereco:'Centro'},'print');
 assert.equal(recebido.type,'application/pdf');const bytes=Buffer.from(await recebido.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>10000);
 recebido=undefined;await gerarPedidoPDF(pedido,{nome_empresa:'Empresa de teste',endereco:'Centro'},'download');assert.equal(recebido,undefined);assert.equal(download,'pedido-rascunho.pdf');
});
