const { test } = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./helpers/carregar.cjs');
const { comJanelaImpressao } = carregar('src/lib/pdf/impressao-browser.ts');

function janela() {
  return { document: { title: '', body: { textContent: '' } }, closed: false, close() { this.closed = true; } };
}

test('janela de impressão abre antes do trabalho assíncrono e a mesma referência recebe o PDF', async () => {
  const eventos = [], aberta = janela();
  global.window = { open(url, destino) { eventos.push('abrir'); assert.equal(url, ''); assert.equal(destino, '_blank'); return aberta; } };
  let liberar;
  const carregamento = new Promise(resolve => { liberar = resolve; });
  const operacao = comJanelaImpressao('print', async alvo => {
    eventos.push('carregar');
    await carregamento;
    assert.equal(alvo, aberta);
    eventos.push('imprimir');
  });
  assert.deepEqual(eventos, ['abrir', 'carregar']);
  assert.match(aberta.document.body.textContent, /Preparando/);
  liberar(); await operacao;
  assert.deepEqual(eventos, ['abrir', 'carregar', 'imprimir']);
  assert.equal(aberta.closed, false);
});

test('bloqueio de pop-up é informado sem gerar o documento', async () => {
  global.window = { open() { return null; } };
  let gerou = false;
  await assert.rejects(comJanelaImpressao('print', async () => { gerou = true; }), /Permita pop-ups/);
  assert.equal(gerou, false);
});

test('falha de carregamento fecha a janela reservada e propaga o erro', async () => {
  const aberta = janela(); global.window = { open() { return aberta; } };
  await assert.rejects(comJanelaImpressao('print', async () => { throw new Error('Falha de importação'); }), /Falha de importação/);
  assert.equal(aberta.closed, true);
});

test('download não abre janela de impressão', async () => {
  global.window = { open() { throw new Error('Não deve abrir janela'); } };
  let gerou = false;
  await comJanelaImpressao('download', async alvo => { assert.equal(alvo, undefined); gerou = true; });
  assert.equal(gerou, true);
});

test('PDF do rascunho gera bytes reais e usa a janela previamente aberta', async () => {
  const pdfMake = require('pdfmake/build/pdfmake');
  let destino, bytesPendente, definicao;
  const fakePdf = { vfs: undefined, createPdf(doc) {
    definicao = doc;
    return { print(options, alvo) {
      assert.deepEqual(options, {}); destino = alvo;
      pdfMake.vfs = fakePdf.vfs;
      bytesPendente = new Promise(resolve => pdfMake.createPdf(doc).getBuffer(resolve));
    } };
  } };
  const { gerarPedidoPDF } = carregar('src/lib/pdf/pedido-pdf.ts', { 'pdfmake/build/pdfmake': fakePdf });
  const pedido = { data: '2026-10-02', cliente_nome: 'Cliente de teste', endereco: 'Rua de teste, 123, Sala 2, Fortaleza, CE', itens: [{ produto_nome: 'Produto de teste', quantidade: 2, valor_unitario: 10, desconto_valor: 0, valor_total: 20 }], subtotal: 20, desconto_valor: 5, total: 15 };
  const aberta = janela();
  await gerarPedidoPDF(pedido, { nome_empresa: 'Empresa de teste', endereco: 'Centro' }, 'print', aberta);
  assert.equal(destino, aberta);
  const texto = JSON.stringify(definicao.content);
  assert.ok(texto.toLowerCase().includes('sala 2')); assert.ok(texto.toLowerCase().includes('produto de teste'));
  const bytes = await bytesPendente;
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-'); assert.ok(bytes.length > 10000);
  await assert.rejects(gerarPedidoPDF(pedido, { nome_empresa: 'Empresa de teste', endereco: 'Centro' }, 'print', { closed: true }), /foi fechada/);
});
