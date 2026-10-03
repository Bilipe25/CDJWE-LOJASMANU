const fs = require('node:fs'); const path = require('node:path');
const { carregar } = require('../../tests/helpers/carregar.cjs');
const pdf = carregar('src/lib/pdf/financeiro-pdf.ts');
const pdfMake = require('pdfmake/build/pdfmake'); pdfMake.vfs = require('pdfmake/build/vfs_fonts');
const destino = path.resolve(process.argv[2] || 'output/pdf/financeiro'); fs.mkdirSync(destino, { recursive: true });
const empresa = { nome_empresa: 'Lojas Manu — demonstração', razao_social: 'Empresa fictícia para conferência dos documentos', cnpj: '00.000.000/0001-00', endereco: 'Rua de demonstração, 100, Centro, Fortaleza / CE, CEP 60000-000', telefone: '(85) 00000-0000' };
const despesas = Array.from({ length: 70 }, (_, i) => ({ numero: 1200 + i, data: '2026-10-03', cliente_nome: `Fornecedor fictício ${i + 1}`, forma_pagamento_nome: 'PIX', total: 123.45, status: i % 3 === 0 ? 'PENDENTE' : 'FINALIZADO', observacao: 'Descrição de demonstração para conferir o documento de uma saída financeira.' }));
const categorias = [{ nome: 'Categoria de demonstração', valor: 80246.40 }];
const produtos = Array.from({ length: 65 }, (_, i) => ({ produto_id: String(i), produto_nome: `Produto ${i + 1} — descrição extensa de demonstração para conferir as quebras de linha e a paginação`, categoria_nome: 'Categoria de demonstração', unidade: 'UN', quantidade_vendida: 5, total_vendas: 2, valor_total: 1234.56 }));
const periodo = { dataInicio: '2026-10-01', dataFim: '2026-10-03', dias: [{ data: '2026-10-01', total_pedidos: 2, total_itens: 325, valor_total: 80246.40 }], produtos, categorias, resumo: { totalVendas: 80246.40, totalPedidos: 2, totalUnidades: 325, ticketMedio: 40123.20, valorSemItens: 0 } };
const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, vendas: 99999999.99, despesas: 1234567.89, saldo: 98765432.1 }));
const anual = { ano: 2026, linhas: [{ natureza: 'Venda', pagamento: 'CARTÃO DE CRÉDITO', valores: meses.map(m => m.vendas), total: 1199999999.88 }, { natureza: 'Despesa', pagamento: 'CARTÃO DE CRÉDITO', valores: meses.map(m => m.despesas), total: 14814814.68 }], meses, vendas: 1199999999.88, despesas: 14814814.68, saldo: 1185185185.2 };
async function salvar(nome, doc) {
  const bytes = await new Promise(resolve => pdfMake.createPdf(doc).getBuffer(resolve));
  fs.writeFileSync(path.join(destino, nome + '.pdf'), bytes);
  const paginas = await new Promise(resolve => pdfMake.createPdf(doc)._getPages({}, resolve));
  const linhas = paginas.map(p => p.items.filter(i => i.type === 'line').map(i => ({ x: i.item.x, y: i.item.y, width: i.item.inlines.reduce((s, v) => s + v.width, 0), height: i.item.height, texto: i.item.inlines.map(t => t.text).join('') })));
  const largura = doc.pageOrientation === 'landscape' ? 841.89 : 595.28;
  const altura = doc.pageOrientation === 'landscape' ? 595.28 : 841.89;
  const fora = linhas.flat().filter(l => l.x < 0 || l.y < 0 || l.x + l.width > largura + 1 || l.y + l.height > altura + 1);
  if (fora.length) throw new Error(`${nome}: texto fora da página: ` + JSON.stringify(fora));
  fs.writeFileSync(path.join(destino, nome + '-layout.json'), JSON.stringify(linhas, null, 2));
  return { nome, paginas: paginas.length, bytes: bytes.length, textoForaDaPagina: fora.length };
}
(async () => {
  const resultados = [];
  resultados.push(await salvar('saida-individual', pdf.criarDefinicaoSaida(despesas[0], empresa)));
  resultados.push(await salvar('saidas-varias-paginas', pdf.criarDefinicaoListaSaidas(despesas, ['numero', 'data', 'destinatario', 'pagamento', 'valor', 'status'].map(id => ({ id, label: ({ numero: 'Número', data: 'Data', destinatario: 'Destinatário', pagamento: 'Pagamento', valor: 'Valor', status: 'Situação' })[id], selecionada: true })), empresa, ['Escopo: toda a consulta — dados fictícios'])));
  resultados.push(await salvar('vendas-varias-paginas', pdf.criarDefinicaoPeriodo(periodo, empresa)));
  resultados.push(await salvar('anual-valores-altos', pdf.criarDefinicaoAnual(anual, empresa)));
  resultados.push(await salvar('anual-vazio', pdf.criarDefinicaoAnual({ ...anual, linhas: [], meses: meses.map(m => ({ ...m, vendas: 0, despesas: 0, saldo: 0 })), vendas: 0, despesas: 0, saldo: 0 }, empresa)));
  fs.writeFileSync(path.join(destino, 'verificacao.json'), JSON.stringify(resultados, null, 2)); console.log(JSON.stringify(resultados, null, 2));
})().catch(erro => { console.error(erro); process.exitCode = 1; });
