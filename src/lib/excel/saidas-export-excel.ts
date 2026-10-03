import * as XLSX from 'xlsx';
import type { DadosEmpresaDocumento } from '@/lib/utils/documentos';
import type { SaidaDocumento, ColunaSaida } from '@/lib/pdf/financeiro-pdf';
import { centavosMovimento as centavos } from '@/lib/schemas/financeiro';
import { formatDateBR } from '@/lib/utils/dateUtils';
export function exportarSaidasParaExcel(saidas: SaidaDocumento[], colunas: ColunaSaida[], empresa: DadosEmpresaDocumento, criterios: string[] = []) {
  const selecionadas = colunas.filter(c => c.selecionada);
  if (!selecionadas.length) throw new Error('Selecione pelo menos uma coluna.');
  const valor = (status: string[]) => saidas.filter(s => status.includes(s.status ?? '')).reduce((s, p) => s + centavos(p.total), 0) / 100;
  const informacoes = XLSX.utils.aoa_to_sheet([
    ['CONSULTA DE SAÍDAS FINANCEIRAS'], ['Empresa', empresa.nome_empresa], ['Razão social', empresa.razao_social || ''],
    ['CNPJ', empresa.cnpj || ''], ['Endereço', empresa.endereco], ['Telefone', empresa.telefone || ''],
    ['Gerado em', new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })],
    ...criterios.map(c => ['Critério', c]), ['Registros exportados', saidas.length],
    ['Valor finalizado', valor(['FINALIZADO'])], ['Valor em aberto', valor(['PENDENTE', 'CONFIRMADO'])], ['Valor cancelado', valor(['CANCELADO'])],
  ]);
  informacoes['!cols'] = [{ wch: 25 }, { wch: 85 }];
  const linhas = saidas.map(s => {
    const valores: Record<string, string | number> = { numero: s.numero ?? '', data: formatDateBR(s.data), destinatario: s.cliente_nome || 'Não informado', pagamento: s.forma_pagamento_nome || 'Não informado', categoria: 'Saída financeira', valor: centavos(s.total) / 100, status: s.status || '', descricao: s.observacao || '' };
    return selecionadas.map(c => valores[c.id] ?? '');
  });
  const dados = XLSX.utils.aoa_to_sheet([selecionadas.map(c => c.label), ...linhas]);
  dados['!cols'] = selecionadas.map(c => ({ wch: ['destinatario', 'descricao'].includes(c.id) ? 42 : 20 }));
  dados['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: linhas.length, c: selecionadas.length - 1 } }) };
  const colunaValor = selecionadas.findIndex(c => c.id === 'valor');
  if (colunaValor >= 0) linhas.forEach((_, i) => { const celula = dados[XLSX.utils.encode_cell({ r: i + 1, c: colunaValor })]; if (celula) celula.z = '"R$" #,##0.00'; });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, informacoes, 'Informações'); XLSX.utils.book_append_sheet(workbook, dados, 'Saídas Financeiras');
  XLSX.writeFile(workbook, 'saidas-financeiras.xlsx');
}
