const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./helpers/carregar.cjs');
const pdfMake = require('pdfmake/build/pdfmake');
const XLSX = require('xlsx');
const { empresaParaDocumento } = carregar('src/lib/utils/documentos.ts');
const empresa=empresaParaDocumento({nome_empresa:'Empresa de teste',logradouro:'Rua da Empresa',numero:'10',complemento:'Sala 2',bairro:'Centro',cidade:'Fortaleza',estado:'CE',cep:'60000-000'});
const colunas=['numero','data','cliente','tipo','pagamento','itens','total','status'].map(id=>({id,label:id,selecionada:true}));
const registros=Array.from({length:270},(_,i)=>({id:String(i),numero:i+1,data:'2026-10-01',cliente_nome:'Cliente de teste '+i,tipo_atendimento_nome:'Venda',forma_pagamento_nome:'Dinheiro',total:10,status:'PENDENTE',total_itens:1}));
let doc,arquivo,pdfPendente;
const fakePdf={vfs:undefined,createPdf(def){doc=def;return {download(nome){arquivo=nome;pdfMake.vfs=fakePdf.vfs;pdfPendente=new Promise((resolve,reject)=>{try{pdfMake.createPdf(def).getBuffer(resolve);}catch(e){reject(e);}});}};}};
test('PDF gera bytes reais com todas as linhas, fontes registradas, empresa e data civil', async () => {
 const { exportarPedidosParaPDF } = carregar('src/lib/pdf/pedidos-export-pdf.ts',{'pdfmake/build/pdfmake':fakePdf});
 await exportarPedidosParaPDF(registros,colunas,empresa,['Todos os filtrados']);
 assert.ok(arquivo.endsWith('.pdf'));assert.ok(JSON.stringify(doc.content).includes('Sala 2'));assert.ok(JSON.stringify(doc.content).includes('01/10/2026'));
 const tabela=doc.content.find(c=>c.table);assert.equal(tabela.table.body.length,272);
 const bytes=await pdfPendente;assert.ok(bytes.length>10000);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
});
test('Excel conserva todas as linhas e dados da empresa no workbook real', () => {
 let wb,nome;const fakeXlsx={...XLSX,writeFile(workbook,arquivo){wb=workbook;nome=arquivo;}};
 const { exportarPedidosParaExcel } = carregar('src/lib/excel/pedidos-export-excel.ts',{xlsx:fakeXlsx});
 exportarPedidosParaExcel(registros,colunas,empresa,['Todos os filtrados']);assert.ok(nome.endsWith('.xlsx'));
 const linhas=XLSX.utils.sheet_to_json(wb.Sheets.Pedidos,{header:1});const texto=JSON.stringify(linhas);
 assert.ok(JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets['Informações'],{header:1})).includes('Sala 2'));assert.ok(texto.includes('01/10/2026'));assert.ok(texto.includes('Cliente de teste 269'));
 const bytes=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});assert.ok(bytes.length>10000);const reaberto=XLSX.read(bytes);assert.equal(XLSX.utils.sheet_to_json(reaberto.Sheets.Pedidos,{header:1}).length,linhas.length);
});
