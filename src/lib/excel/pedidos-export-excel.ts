/**
 * Função para exportar lista de pedidos para Excel
 * Usa xlsx (SheetJS)
 */

import * as XLSX from 'xlsx';

interface ColunaSelecionada {
  id: string;
  label: string;
  selecionada: boolean;
}

interface Pedido {
  numero: string | number;
  data: string;
  cliente_nome: string | null;
  tipo_atendimento_nome: string | null;
  forma_pagamento_nome: string | null;
  total: number | null;
  status: string;
  total_itens?: number | null;
}

interface DadosEmpresa {
  nome_empresa?: string;
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
}

export function exportarPedidosParaExcel(
  pedidos: Pedido[],
  colunas: ColunaSelecionada[],
  dadosEmpresa: DadosEmpresa,
  filtrosAplicados?: string[]
) {
  const colunasSelecionadas = colunas.filter(c => c.selecionada);
  
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Dados da empresa (primeira planilha/aba)
  const dadosEmpresaSheet = [
    ['RELATÓRIO DE PEDIDOS'],
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
    ['Total de Pedidos:', pedidos.length.toString()],
    ['Valor Total:', formatarMoeda(pedidos.reduce((sum, p) => sum + (p.total || 0), 0))],
  );

  // Criar planilha de dados da empresa
  const wsInfo = XLSX.utils.aoa_to_sheet(dadosEmpresaSheet);
  
  // Ajustar largura das colunas
  wsInfo['!cols'] = [
    { wch: 20 },
    { wch: 50 },
  ];
  
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');

  // Preparar dados dos pedidos
  const headers = colunasSelecionadas.map(c => c.label);
  
  const rows = pedidos.map(pedido => {
    return colunasSelecionadas.map(coluna => {
      switch (coluna.id) {
        case 'numero':
          return `#${pedido.numero}`;
        case 'data':
          return formatarData(pedido.data);
        case 'cliente':
          return pedido.cliente_nome || '-';
        case 'tipo':
          return pedido.tipo_atendimento_nome || '-';
        case 'pagamento':
          return pedido.forma_pagamento_nome || '-';
        case 'itens':
          return pedido.total_itens || 0;
        case 'total':
          return pedido.total || 0;
        case 'status':
          return pedido.status;
        default:
          return '-';
      }
    });
  });

  // Adicionar linha de totais
  const linhaTotais = colunasSelecionadas.map(coluna => {
    if (coluna.id === 'numero') return 'TOTAL';
    if (coluna.id === 'total') return pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
    if (coluna.id === 'itens') return pedidos.reduce((sum, p) => sum + (p.total_itens || 0), 0);
    return '';
  });

  // Criar planilha de pedidos
  const wsPedidos = XLSX.utils.aoa_to_sheet([headers, ...rows, linhaTotais]);
  
  // Ajustar largura das colunas dinamicamente
  const colWidths = colunasSelecionadas.map(coluna => {
    const widths: Record<string, number> = {
      numero: 12,
      data: 12,
      cliente: 30,
      tipo: 15,
      pagamento: 18,
      itens: 10,
      total: 15,
      status: 12,
    };
    return { wch: widths[coluna.id] || 15 };
  });
  
  wsPedidos['!cols'] = colWidths;

  // Aplicar estilo na linha de cabeçalho (primeira linha)
  const range = XLSX.utils.decode_range(wsPedidos['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!wsPedidos[cellAddress]) continue;
    
    wsPedidos[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E0E0E0' } },
      alignment: { horizontal: 'center' },
    };
  }

  // Aplicar estilo na linha de totais (última linha)
  const lastRow = range.e.r;
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: lastRow, c: col });
    if (!wsPedidos[cellAddress]) continue;
    
    wsPedidos[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'FFF3E0' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos');

  // Gerar e baixar arquivo
  const nomeArquivo = `pedidos_${new Date().toISOString().split('T')[0]}.xlsx`;
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

