/**
 * Função para exportar lista de saídas financeiras para Excel
 * Usa xlsx (SheetJS)
 */

import * as XLSX from 'xlsx';

interface ColunaSelecionada {
  id: string;
  label: string;
  selecionada: boolean;
}

interface Saida {
  numero: string | number;
  data: string;
  cliente_nome: string | null;
  forma_pagamento_nome: string | null;
  total: number | null;
  status: string;
  observacao?: string | null;
}

interface DadosEmpresa {
  nome_empresa?: string;
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
}

export function exportarSaidasParaExcel(
  saidas: Saida[],
  colunas: ColunaSelecionada[],
  dadosEmpresa: DadosEmpresa,
  filtrosAplicados?: string[]
) {
  const colunasSelecionadas = colunas.filter(c => c.selecionada);
  
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Dados da empresa (primeira planilha/aba)
  const dadosEmpresaSheet = [
    ['RELATÓRIO DE SAÍDAS FINANCEIRAS'],
    [''],
    ['Empresa:', dadosEmpresa.nome_empresa || ''],
    ['CNPJ:', dadosEmpresa.cnpj || ''],
    ['Telefone:', dadosEmpresa.telefone || ''],
    ['Endereço:', dadosEmpresa.endereco || ''],
    [''],
    ['Data de Geração:', new Date().toLocaleString('pt-BR')],
  ];

  if (filtrosAplicados && filtrosAplicados.length > 0) {
    dadosEmpresaSheet.push([''], ['Filtros Aplicados:']);
    filtrosAplicados.forEach(filtro => {
      dadosEmpresaSheet.push([filtro]);
    });
  }

  dadosEmpresaSheet.push(
    [''],
    ['Resumo:'],
    ['Total de Saídas:', saidas.length.toString()],
    ['Valor Total:', formatarMoeda(saidas.reduce((sum, s) => sum + (s.total || 0), 0))],
  );

  // Criar planilha de dados da empresa
  const wsInfo = XLSX.utils.aoa_to_sheet(dadosEmpresaSheet);
  
  // Ajustar largura das colunas
  wsInfo['!cols'] = [
    { wch: 20 },
    { wch: 50 },
  ];
  
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');

  // Preparar dados das saídas
  const headers = colunasSelecionadas.map(c => c.label);
  
  const rows = saidas.map(saida => {
    return colunasSelecionadas.map(coluna => {
      switch (coluna.id) {
        case 'numero':
          return `#${saida.numero}`;
        case 'data':
          return formatarData(saida.data);
        case 'destinatario':
          return saida.cliente_nome || 'Não informado';
        case 'pagamento':
          return saida.forma_pagamento_nome || '-';
        case 'categoria':
          return 'Saída Financeira';
        case 'valor':
          return saida.total || 0;
        case 'status':
          return saida.status;
        default:
          return '-';
      }
    });
  });

  // Adicionar linha de totais
  const linhaTotais = colunasSelecionadas.map(coluna => {
    if (coluna.id === 'numero') return 'TOTAL';
    if (coluna.id === 'valor') return saidas.reduce((sum, s) => sum + (s.total || 0), 0);
    return '';
  });

  // Criar planilha de saídas
  const wsSaidas = XLSX.utils.aoa_to_sheet([headers, ...rows, linhaTotais]);
  
  // Ajustar largura das colunas dinamicamente
  const colWidths = colunasSelecionadas.map(coluna => {
    const widths: Record<string, number> = {
      numero: 12,
      data: 12,
      destinatario: 30,
      pagamento: 18,
      categoria: 18,
      valor: 15,
      status: 12,
    };
    return { wch: widths[coluna.id] || 15 };
  });
  
  wsSaidas['!cols'] = colWidths;

  // Aplicar estilo na linha de cabeçalho (primeira linha)
  const range = XLSX.utils.decode_range(wsSaidas['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!wsSaidas[cellAddress]) continue;
    
    wsSaidas[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'DC2626' } },
      alignment: { horizontal: 'center' },
    };
  }

  // Aplicar estilo na linha de totais (última linha)
  const lastRow = range.e.r;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: col });
    if (!wsSaidas[cellAddress]) continue;
    
    wsSaidas[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'FEE2E2' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, wsSaidas, 'Saídas Financeiras');

  // Gerar e baixar arquivo
  const nomeArquivo = `saidas_financeiras_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}

// Helpers
function formatarData(dataString: string): string {
  if (!dataString) return '-';
  try {
    const [year, month, day] = dataString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dataString;
  }
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
}

