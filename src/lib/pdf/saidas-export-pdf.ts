/**
 * Função para exportar lista de saídas financeiras para PDF usando pdfmake
 */

import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore - pdfFonts types are not well supported
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Registrar fontes
// @ts-ignore
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;

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

export async function exportarSaidasParaPDF(
  saidas: Saida[],
  colunas: ColunaSelecionada[],
  dadosEmpresa: DadosEmpresa,
  filtrosAplicados?: string[]
) {
  const colunasSelecionadas = colunas.filter(c => c.selecionada);
  
  // Preparar cabeçalho da tabela
  const headerRow = colunasSelecionadas.map(col => ({
    text: col.label,
    style: 'tableHeader',
    fillColor: '#dc2626',
    color: '#ffffff',
    bold: true,
  }));

  // Preparar linhas de dados
  const dataRows = saidas.map((saida, index) => {
    return colunasSelecionadas.map(coluna => {
      let valor: any;
      
      switch (coluna.id) {
        case 'numero':
          valor = `#${saida.numero}`;
          break;
        case 'data':
          valor = formatarData(saida.data);
          break;
        case 'destinatario':
          valor = saida.cliente_nome || 'Não informado';
          break;
        case 'pagamento':
          valor = saida.forma_pagamento_nome || '-';
          break;
        case 'categoria':
          valor = 'Saída Financeira';
          break;
        case 'valor':
          valor = formatarMoeda(saida.total || 0);
          break;
        case 'status':
          valor = saida.status;
          break;
        default:
          valor = '-';
      }

      return {
        text: valor,
        fontSize: 9,
        fillColor: index % 2 === 0 ? '#fef2f2' : '#ffffff',
      };
    });
  });

  // Linha de totais
  const totalRow = colunasSelecionadas.map(coluna => {
    if (coluna.id === 'numero') {
      return { text: 'TOTAL', bold: true, fillColor: '#fee2e2', color: '#991b1b' };
    }
    if (coluna.id === 'valor') {
      return {
        text: formatarMoeda(saidas.reduce((sum, s) => sum + (s.total || 0), 0)),
        bold: true,
        fillColor: '#fee2e2',
        color: '#991b1b',
      };
    }
    return { text: '', fillColor: '#fee2e2' };
  });

  // Larguras dinâmicas das colunas
  const widthsMap: Record<string, string | number> = {
    numero: 50,
    data: 60,
    destinatario: '*',
    pagamento: 80,
    categoria: 80,
    valor: 70,
    status: 70,
  };

  const columnWidths = colunasSelecionadas.map(col => widthsMap[col.id] || 'auto');

  // Montar documento
  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: colunasSelecionadas.length > 5 ? 'landscape' : 'portrait',
    pageMargins: [40, 60, 40, 60],
    
    header: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: dadosEmpresa.nome_empresa || 'Relatório de Saídas Financeiras',
          style: 'header',
          alignment: 'left',
          margin: [40, 20, 0, 0],
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'right',
          fontSize: 9,
          color: '#718096',
          margin: [0, 20, 40, 0],
        },
      ],
    }),

    footer: (currentPage: number, pageCount: number) => ({
      text: `Gerado em ${new Date().toLocaleString('pt-BR')}`,
      alignment: 'center',
      fontSize: 8,
      color: '#a0aec0',
      margin: [0, 10, 0, 0],
    }),

    content: [
      // Informações da empresa
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: dadosEmpresa.nome_empresa || '', style: 'companyName' },
              { text: dadosEmpresa.cnpj ? `CNPJ: ${dadosEmpresa.cnpj}` : '', style: 'companyInfo' },
              { text: dadosEmpresa.telefone || '', style: 'companyInfo' },
              { text: dadosEmpresa.endereco || '', style: 'companyInfo' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: 'SAÍDAS FINANCEIRAS', style: 'reportTitle', alignment: 'right', color: '#dc2626' },
              { text: new Date().toLocaleDateString('pt-BR'), style: 'reportDate', alignment: 'right' },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Filtros aplicados
      ...(filtrosAplicados && filtrosAplicados.length > 0
        ? [
            { text: 'Filtros Aplicados:', style: 'sectionTitle', margin: [0, 10, 0, 5] },
            {
              ul: filtrosAplicados.map(filtro => ({ text: filtro, fontSize: 9, color: '#4a5568' })),
              margin: [0, 0, 0, 15],
            },
          ]
        : []),

      // Resumo
      {
        columns: [
          {
            width: '*',
            text: [
              { text: 'Total de Saídas: ', bold: true },
              { text: saidas.length.toString(), color: '#dc2626' },
            ],
            fontSize: 11,
          },
          {
            width: '*',
            text: [
              { text: 'Valor Total: ', bold: true },
              {
                text: formatarMoeda(saidas.reduce((sum, s) => sum + (s.total || 0), 0)),
                color: '#dc2626',
                bold: true,
              },
            ],
            fontSize: 11,
            alignment: 'right',
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Tabela de saídas
      {
        table: {
          headerRows: 1,
          widths: columnWidths,
          body: [headerRow, ...dataRows, totalRow],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: (i: number) => (i === 0 || i === 1 ? '#dc2626' : '#fecaca'),
          vLineColor: () => '#fecaca',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
    ],

    styles: {
      header: {
        fontSize: 14,
        bold: true,
        color: '#1a202c',
      },
      companyName: {
        fontSize: 16,
        bold: true,
        color: '#1a202c',
        margin: [0, 0, 0, 5],
      },
      companyInfo: {
        fontSize: 9,
        color: '#4a5568',
        margin: [0, 2, 0, 0],
      },
      reportTitle: {
        fontSize: 18,
        bold: true,
      },
      reportDate: {
        fontSize: 10,
        color: '#64748b',
        margin: [0, 5, 0, 0],
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: '#b91c1c',
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        alignment: 'center',
      },
    },

    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: '#374151',
    },
  };

  // Gerar e abrir PDF
  pdfMake.createPdf(docDefinition).download(`saidas_financeiras_${new Date().toISOString().split('T')[0]}.pdf`);
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

