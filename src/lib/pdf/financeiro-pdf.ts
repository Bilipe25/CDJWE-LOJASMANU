import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { DadosEmpresaDocumento, PedidoExportacao } from '@/lib/utils/documentos';
import type { PeriodoFinanceiro, AnualFinanceiro } from '@/server/financeiro';
import { formatDateBR } from '@/lib/utils/dateUtils';
import { centavosMovimento as centavos, dataCivilValida } from '@/lib/schemas/financeiro';

const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export const mesesFinanceiros = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export interface ColunaSaida { id: string; label: string; selecionada: boolean }
export type SaidaDocumento = PedidoExportacao & { observacao?: string | null };
const situacao: Record<string, string> = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado' };
const cabecalho = (texto: string, direita = false): TableCell => ({ text: texto, bold: true, fillColor: '#f1f5f9', color: '#334155', alignment: direita ? 'right' : 'left' });
function tabela(titulos: string[], linhas: (string | number)[][], widths?: (number | string)[], numericas: number[] = []): Content {
  return { table: { headerRows: 1, dontBreakRows: true, widths: widths ?? titulos.map(() => '*'), body: [titulos.map((t, i) => cabecalho(t, numericas.includes(i))), ...linhas.map(l => l.map((v, i): TableCell => ({ text: String(v), alignment: numericas.includes(i) ? 'right' : 'left' })))] }, layout: 'lightHorizontalLines', margin: [0, 10, 0, 16] };
}
function documento(titulo: string, empresa: DadosEmpresaDocumento, criterios: string[], content: Content[], landscape = false, agora = new Date()): TDocumentDefinitions {
  const gerado = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' }).format(agora);
  return { pageSize: 'A4', pageOrientation: landscape ? 'landscape' : 'portrait', pageMargins: [32, 38, 32, 38],
    defaultStyle: { fontSize: landscape ? 8 : 9, color: '#0f172a' },
    footer: (pagina, total) => ({ columns: [{ text: `Gerado em ${gerado}`, color: '#475569' }, { text: `${pagina} / ${total}`, alignment: 'right', color: '#475569' }], margin: [32, 12, 32, 0], fontSize: 8 }),
    content: [{ text: empresa.nome_empresa, bold: true, fontSize: 16 }, { text: [empresa.razao_social, empresa.cnpj && `CNPJ ${empresa.cnpj}`, empresa.telefone].filter(Boolean).join(' • '), color: '#475569', margin: [0, 4, 0, 0] }, { text: empresa.endereco || '', color: '#475569', margin: [0, 3, 0, 18] }, { text: titulo, bold: true, fontSize: 14 }, { text: criterios.join('\n'), color: '#475569', margin: [0, 6, 0, 10] }, ...content, { text: 'Documento de controle interno. Não substitui documento fiscal.', fontSize: 8, color: '#475569', margin: [0, 18, 0, 0] }],
  };
}
function documentoRelatorio(titulo: string, empresa: DadosEmpresaDocumento, criterios: string[], conteudo: Content[], landscape = false) {
  const doc = documento(titulo, empresa, criterios, conteudo, landscape);
  const content = doc.content as Content[];
  content[0] = { text: empresa.nome_empresa, bold: true, color: '#1976d2', fontSize: 14 };
  content[3] = { text: titulo, bold: true, color: '#1976d2', fontSize: 16, alignment: 'center', margin: [0, 0, 0, 5] };
  content[4] = { text: criterios.join('\n'), alignment: 'center', color: '#475569', margin: [0, 0, 0, 20] };
  content.splice(3, 0, { canvas: [{ type: 'line', x1: 0, y1: 0, x2: landscape ? 777 : 531, y2: 0, lineWidth: 2, lineColor: '#1976d2' }], margin: [0, 0, 0, 15] });
  return doc;
}
export function criarDefinicaoSaida(saida: SaidaDocumento, empresa: DadosEmpresaDocumento) {
  if (!saida.data || !dataCivilValida(saida.data) || saida.numero === null || !saida.status) throw new Error('A saída não tem dados válidos para impressão. Atualize a consulta.');
  const total = centavos(saida.total) / 100;
  return documento(`Saída financeira #${saida.numero}`, empresa, [`Data: ${formatDateBR(saida.data)} · Situação: ${situacao[saida.status] || saida.status}`], [
    tabela(['Destinatário', 'Pagamento'], [[saida.cliente_nome || 'Não informado', saida.forma_pagamento_nome || 'Não informado']]),
    { text: 'Descrição', bold: true, margin: [0, 4, 0, 6] }, { text: saida.observacao || 'Não informada', preserveLeadingSpaces: true },
    { text: `Valor da despesa: ${moeda(total)}`, bold: true, fontSize: 16, alignment: 'right', margin: [0, 24, 0, 0] },
    { text: saida.status === 'FINALIZADO' ? 'Despesa finalizada no sistema.' : saida.status === 'CANCELADO' ? 'Saída cancelada. Não compõe o valor de despesas finalizadas.' : 'Registro ainda não finalizado. Não confirma pagamento ou quitação.', color: '#475569', margin: [0, 8, 0, 0] },
  ]);
}
export function criarDefinicaoListaSaidas(saidas: SaidaDocumento[], colunas: ColunaSaida[], empresa: DadosEmpresaDocumento, criterios: string[] = []) {
  const selecionadas = colunas.filter(c => c.selecionada);
  if (!selecionadas.length) throw new Error('Selecione pelo menos uma coluna.');
  const valor = (s: SaidaDocumento, id: string) => {
    const campos: Record<string, string> = { numero: `#${s.numero}`, data: formatDateBR(s.data), destinatario: s.cliente_nome || 'Não informado', pagamento: s.forma_pagamento_nome || 'Não informado', categoria: 'Saída financeira', valor: moeda(centavos(s.total) / 100), status: situacao[s.status ?? ''] || s.status || '-', descricao: s.observacao || '-' };
    return campos[id] ?? '-';
  };
  const soma = (status: string[]) => saidas.filter(s => status.includes(s.status ?? '')).reduce((s, p) => s + centavos(p.total), 0) / 100;
  return documento('Consulta de saídas financeiras', empresa, [...criterios, `${saidas.length} registros exportados`], [
    { text: `Finalizadas: ${moeda(soma(['FINALIZADO']))}   ·   Em aberto: ${moeda(soma(['PENDENTE', 'CONFIRMADO']))}   ·   Canceladas: ${moeda(soma(['CANCELADO']))}`, bold: true },
    tabela(selecionadas.map(c => c.label), saidas.map(s => selecionadas.map(c => valor(s, c.id))), selecionadas.map(c => ['numero', 'data', 'status'].includes(c.id) ? 'auto' : '*'), selecionadas.map((c, i) => c.id === 'valor' ? i : -1)),
  ], selecionadas.length > 5);
}
export function criarDefinicaoPeriodo(dados: PeriodoFinanceiro, empresa: DadosEmpresaDocumento) {
  return documentoRelatorio('RELATÓRIO DE VENDAS POR PERÍODO', empresa, [`Período: ${formatDateBR(dados.dataInicio)} a ${formatDateBR(dados.dataFim)}`, 'Somente vendas finalizadas. Valores líquidos, com desconto geral rateado proporcionalmente entre os itens.'], [
    { text: `Vendas: ${moeda(dados.resumo.totalVendas)} · Pedidos: ${dados.resumo.totalPedidos} · Unidades: ${dados.resumo.totalUnidades} · Ticket médio: ${moeda(dados.resumo.ticketMedio)}`, bold: true },
    tabela(['Data', 'Pedidos', 'Unidades', 'Valor líquido'], dados.dias.map(d => [formatDateBR(d.data), d.total_pedidos, d.total_itens, moeda(d.valor_total)]), undefined, [1, 2, 3]),
    { text: 'Produtos — todos os resultados, por valor líquido', bold: true },
    tabela(['Produto', 'Categoria', 'Quantidade', 'Pedidos', 'Valor líquido'], dados.produtos.map(p => [p.produto_nome, p.categoria_nome, `${p.quantidade_vendida} ${p.unidade}`, p.total_vendas, moeda(p.valor_total)]), ['*', '*', 'auto', 'auto', 'auto'], [2, 3, 4]),
    ...(dados.resumo.valorSemItens ? [{ text: `Vendas sem itens detalhados: ${moeda(dados.resumo.valorSemItens)}`, color: '#475569' }] : []),
  ]);
}
export function criarDefinicaoAnual(dados: AnualFinanceiro, empresa: DadosEmpresaDocumento) {
  const celula = (v: number, despesa = false, forte = false): TableCell => ({ text: v === 0 ? '—' : moeda(v).replace(/\u00a0/g, ' '), alignment: 'right', fontSize: 6.5, color: despesa ? '#c62828' : '#0f172a', bold: despesa || forte, fillColor: despesa ? '#ffebee' : forte ? '#e0e0e0' : '#ffffff' });
  const tabelaMensal: Content = { table: { headerRows: 1, dontBreakRows: true, widths: [105, ...Array(12).fill('*')], body: [
    [cabecalho('TRANSAÇÕES'), ...mesesFinanceiros.map(m => cabecalho(m.toUpperCase(), true))],
    ...dados.linhas.map(l => [{ text: l.natureza + ' / ' + l.pagamento, bold: true, fontSize: 7, fillColor: l.natureza === 'Despesa' ? '#ffebee' : '#ffffff', color: l.natureza === 'Despesa' ? '#c62828' : '#0f172a' }, ...l.valores.map(v => celula(v, l.natureza === 'Despesa'))]),
    [{ text: 'TOTAL VENDAS', bold: true, fillColor: '#e0e0e0' }, ...dados.meses.map(m => celula(m.vendas, false, true))],
    [{ text: 'SAÍDAS FINANCEIRAS', bold: true, fillColor: '#ffebee', color: '#c62828' }, ...dados.meses.map(m => celula(m.despesas, true, true))],
    [{ text: 'SALDO', bold: true, fillColor: '#e0e0e0' }, ...dados.meses.map(m => celula(m.saldo, false, true))],
  ] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#cccccc', vLineColor: () => '#cccccc', paddingLeft: () => 3, paddingRight: () => 3, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 5, 0, 15] };
  return documentoRelatorio('RELATÓRIO MENSAL DE VENDAS', empresa, ['ANO: ' + dados.ano, 'Vendas e saídas finalizadas. Saldo = vendas − despesas.'], [
    ...(!dados.linhas.length ? [{ text: 'Não há vendas ou despesas finalizadas neste ano.', margin: [0, 12, 0, 12] } as Content] : [tabelaMensal]),
    { text: 'TOTAL GERAL DAS TRANSAÇÕES', color: '#1976d2', bold: true, fontSize: 11, margin: [0, 10, 0, 10] },
    ...dados.linhas.map(l => ({ text: l.natureza + ' / ' + l.pagamento + ': ' + moeda(l.total), color: l.natureza === 'Despesa' ? '#c62828' : '#0f172a', fontSize: 9, margin: [0, 2, 0, 2] } as Content)),
    { text: 'TOTAL VENDAS: ' + moeda(dados.vendas), color: '#1976d2', bold: true, fontSize: 11, margin: [0, 8, 0, 2] },
    { text: 'SAÍDAS FINANCEIRAS: ' + moeda(dados.despesas), color: '#c62828', bold: true, fontSize: 11 },
    { text: 'SALDO: ' + moeda(dados.saldo), bold: true, fontSize: 11, margin: [0, 3, 0, 0] },
  ], true);
}
export async function gerarDocumentoFinanceiro(definicao: TDocumentDefinitions, nome: string, acao: 'print' | 'download') {
  const pdfMake = (await import('./fontes')).default;
  const pdf = await new Promise<Blob>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('A geração do PDF demorou demais. Tente novamente.')), 30_000);
    try { pdfMake.createPdf(definicao).getBlob(blob => { clearTimeout(timeout); resolve(blob); }); }
    catch (erro) { clearTimeout(timeout); reject(erro); }
  });
  if (acao === 'print') await (await import('./impressao-browser')).imprimirPDFNaPagina(pdf);
  else (await import('@/lib/utils/csv')).baixarArquivo(pdf, nome);
}
