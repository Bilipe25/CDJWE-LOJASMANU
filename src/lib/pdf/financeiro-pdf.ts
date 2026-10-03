import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { DadosEmpresaDocumento, PedidoExportacao } from '@/lib/utils/documentos';
import type { PeriodoFinanceiro, AnualFinanceiro } from '@/server/financeiro';
import { formatDateBR } from '@/lib/utils/dateUtils';
import { centavos, dataCivilValida } from '@/lib/schemas/financeiro';

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
  return documento('Relatório de vendas', empresa, [`Período: ${formatDateBR(dados.dataInicio)} a ${formatDateBR(dados.dataFim)}`, 'Somente vendas finalizadas. Valores líquidos, com desconto geral rateado proporcionalmente entre os itens.'], [
    { text: `Vendas: ${moeda(dados.resumo.totalVendas)} · Pedidos: ${dados.resumo.totalPedidos} · Unidades: ${dados.resumo.totalUnidades} · Ticket médio: ${moeda(dados.resumo.ticketMedio)}`, bold: true },
    tabela(['Data', 'Pedidos', 'Unidades', 'Valor líquido'], dados.dias.map(d => [formatDateBR(d.data), d.total_pedidos, d.total_itens, moeda(d.valor_total)]), undefined, [1, 2, 3]),
    { text: 'Produtos — todos os resultados, por valor líquido', bold: true },
    tabela(['Produto', 'Categoria', 'Quantidade', 'Pedidos', 'Valor líquido'], dados.produtos.map(p => [p.produto_nome, p.categoria_nome, `${p.quantidade_vendida} ${p.unidade}`, p.total_vendas, moeda(p.valor_total)]), ['*', '*', 'auto', 'auto', 'auto'], [2, 3, 4]),
    ...(dados.resumo.valorSemItens ? [{ text: `Vendas sem itens detalhados: ${moeda(dados.resumo.valorSemItens)}`, color: '#475569' }] : []),
  ]);
}
export function criarDefinicaoAnual(dados: AnualFinanceiro, empresa: DadosEmpresaDocumento) {
  if (!dados.linhas.length) return documento(`Relatório financeiro — ${dados.ano}`, empresa, ['Vendas e saídas finalizadas.'], [
    { text: 'Não há vendas ou despesas finalizadas neste ano.', margin: [0, 12, 0, 12] },
    { text: `Vendas: ${moeda(dados.vendas)} · Despesas: ${moeda(dados.despesas)} · Saldo: ${moeda(dados.saldo)}`, bold: true },
  ]);
  return documento(`Relatório financeiro — ${dados.ano}`, empresa, ['Vendas e saídas finalizadas. Saldo = vendas − despesas.'], [
    { text: `Vendas: ${moeda(dados.vendas)} · Despesas: ${moeda(dados.despesas)} · Saldo: ${moeda(dados.saldo)}`, bold: true, fontSize: 11 },
    ...[0, 6].flatMap(inicio => [
      { text: inicio === 0 ? 'Primeiro semestre' : 'Segundo semestre', bold: true, margin: [0, 16, 0, 2] } as Content,
      tabela(['Natureza / pagamento', ...mesesFinanceiros.slice(inicio, inicio + 6), 'Semestre'], dados.linhas.map(l => {
        const valores = l.valores.slice(inicio, inicio + 6);
        return [`${l.natureza} / ${l.pagamento}`, ...valores.map(moeda), moeda(valores.reduce((s, v) => s + centavos(v), 0) / 100)];
      }), [135, '*', '*', '*', '*', '*', '*', 80], [1, 2, 3, 4, 5, 6, 7]),
    ]),
    { text: 'Totais por natureza e pagamento', bold: true },
    tabela(['Natureza', 'Pagamento', 'Total do ano'], dados.linhas.map(l => [l.natureza, l.pagamento, moeda(l.total)]), ['auto', '*', 'auto'], [2]),
    { text: 'Resumo mensal', bold: true },
    tabela(['Mês', 'Vendas', 'Despesas', 'Saldo'], dados.meses.map(m => [mesesFinanceiros[m.mes - 1], moeda(m.vendas), moeda(m.despesas), moeda(m.saldo)]), undefined, [1, 2, 3]),
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
