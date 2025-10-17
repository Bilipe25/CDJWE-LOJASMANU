import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = pdfFonts;

interface ItemPedido {
  produto_nome: string;
  produto_codigo?: string;
  cor_descricao?: string;
  quantidade: number;
  valor_unitario: number;
  desconto_valor: number;
  valor_total: number;
}

interface DadosPedido {
  numero?: number;
  data: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  endereco?: string;
  tipo_atendimento?: string;
  forma_pagamento?: string;
  observacoes?: string;
  itens: ItemPedido[];
  subtotal: number;
  desconto_valor: number;
  total: number;
}

interface DadosEmpresa {
  nome_empresa?: string;
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  logo_url?: string;
  instagram?: string;
  site?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

export const gerarPedidoPDF = async (
  pedido: DadosPedido,
  empresa: DadosEmpresa,
  acao: 'download' | 'print' = 'print'
) => {
  // Converter logo para base64 se disponível
  let logoBase64 = null;
  if (empresa.logo_url) {
    try {
      const response = await fetch(empresa.logo_url);
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 40],
    
    content: [
      // Data e Número do Atendimento no topo
      {
        columns: [
          { text: formatDate(pedido.data), fontSize: 9, alignment: 'left' },
          { text: '', width: '*' },
          { text: 'ATENDIMENTO', fontSize: 9, alignment: 'right', bold: true },
          { text: (pedido.numero?.toString() || '---').padStart(5, ' '), fontSize: 11, alignment: 'right', bold: true, width: 50 },
        ],
        margin: [0, 0, 0, 10],
      },

      // Linha separadora
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }] },

      // Logo e Nome da Empresa
      {
        columns: [
          // Logo à esquerda
          ...(logoBase64 ? [{
            image: logoBase64,
            width: 65,
            height: 65,
            alignment: 'left' as const,
            margin: [0, 5, 20, 0],  // Aumentado espaçamento à direita de 15 para 20
            fit: [65, 65]  // Garantir que a imagem se ajuste
          }] : []),
          // Informações da empresa à direita
          {
            stack: [
              { text: empresa.nome_empresa?.toUpperCase() || 'EMPRESA', fontSize: 14, bold: true, alignment: logoBase64 ? 'left' : 'center', margin: [0, 0, 0, 2] },
              ...(empresa.razao_social ? [
                { text: empresa.razao_social, fontSize: 8, alignment: logoBase64 ? 'left' : 'center', color: '#666', margin: [0, 0, 0, 2] }
              ] : []),
              { text: empresa.endereco || '', fontSize: 7, alignment: logoBase64 ? 'left' : 'center', color: '#333', margin: [0, 0, 0, 2] },
              { 
                text: [
                  { text: empresa.telefone ? `TEL: ${empresa.telefone}` : '', fontSize: 7 },
                  { text: empresa.cnpj ? ` - CNPJ: ${empresa.cnpj}` : '', fontSize: 7 }
                ],
                alignment: logoBase64 ? 'left' : 'center',
                color: '#333',
                margin: [0, 0, 0, 2]
              },
              {
                text: [
                  { text: empresa.instagram ? `Instagram: ${empresa.instagram}` : '', fontSize: 7 },
                  { text: (empresa.instagram && empresa.site) ? ' - ' : '', fontSize: 7 },
                  { text: empresa.site ? `Site: ${empresa.site}` : '', fontSize: 7 }
                ],
                alignment: logoBase64 ? 'left' : 'center',
                color: '#666',
                margin: [0, 0, 0, 0]
              },
            ],
            width: '*',
            margin: logoBase64 ? [0, 5, 0, 0] : [0, 5, 0, 0],  // Margem superior para alinhar com a logo
          },
        ],
        margin: [0, 10, 0, 15],
      },

      // Linha separadora
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 0, 0, 15] },

      // Box de Dados do Cliente - Layout Profissional
      {
        table: {
          widths: [60, '*', 60, 120],
          body: [
            [
              { text: 'NOME:', fontSize: 9, bold: true, fillColor: '#f0f0f0', margin: [3, 3, 3, 3] },
              { text: pedido.cliente_nome?.toUpperCase() || 'CLIENTE CONSUMIDOR', fontSize: 9, margin: [3, 3, 3, 3], colSpan: 2 },
              {},
              { 
                text: `TEL.: ${pedido.cliente_telefone || ''}`, 
                fontSize: 9, 
                margin: [3, 3, 3, 3]
              },
            ],
            [
              { text: 'CPF:', fontSize: 9, bold: true, fillColor: '#f0f0f0', margin: [3, 3, 3, 3] },
              { text: '', fontSize: 9, margin: [3, 3, 3, 3], colSpan: 3 },
              {},
              {},
            ],
            [
              { text: 'ENDEREÇO:', fontSize: 9, bold: true, fillColor: '#f0f0f0', margin: [3, 3, 3, 3] },
              { 
                text: pedido.endereco?.toUpperCase() || '', 
                fontSize: 9, 
                margin: [3, 3, 3, 3], 
                colSpan: 3,
                // Quebrar linha se necessário
                noWrap: false
              },
              {},
              {},
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#999',
          vLineColor: () => '#999',
        },
        margin: [0, 0, 0, 15],
      },

      // Linha separadora
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 0, 0, 10] },

      // Cabeçalho da tabela com total de itens
      {
        columns: [
          { text: '', width: '*' },
          { text: `TOTAL DE ITENS: ${pedido.itens.length}`, fontSize: 9, bold: true, alignment: 'right' },
        ],
        margin: [0, 0, 0, 5],
      },

      // Tabela de Itens
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 50, 30, 65, 55, 70],
          body: [
            [
              { text: 'Item\nNº', bold: true, fontSize: 8, alignment: 'center', fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
              { text: 'Descrição', bold: true, fontSize: 8, fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
              { text: 'COR', bold: true, fontSize: 8, alignment: 'center', fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
              { text: 'Qtde', bold: true, fontSize: 8, alignment: 'center', fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
              { text: 'Preço Unitário', bold: true, fontSize: 8, alignment: 'right', fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
              { text: 'Desconto', bold: true, fontSize: 8, alignment: 'right', fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
              { text: 'Total', bold: true, fontSize: 8, alignment: 'right', fillColor: '#e0e0e0', margin: [2, 3, 2, 3] },
            ],
            ...pedido.itens.map((item, idx) => [
              { text: (idx + 1).toString(), fontSize: 9, alignment: 'center', fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
              { text: item.produto_nome.toUpperCase(), fontSize: 9, fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
              { text: item.cor_descricao?.toUpperCase() || 'S/N', fontSize: 8, alignment: 'center', fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
              { text: item.quantidade.toString(), fontSize: 9, alignment: 'center', fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
              { text: formatCurrency(item.valor_unitario), fontSize: 9, alignment: 'right', fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
              { text: item.desconto_valor > 0 ? formatCurrency(item.desconto_valor) : 'R$ 0,00', fontSize: 9, alignment: 'right', fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
              { text: formatCurrency(item.valor_total), fontSize: 10, alignment: 'right', bold: true, fillColor: idx % 2 === 0 ? '#f9f9f9' : null, margin: [2, 3, 2, 3] },
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#999',
          vLineColor: () => '#999',
        },
      },

      // Linha separadora
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },

      // Totais - Mais profissional
      {
        columns: [
          { text: '', width: '*' },
          {
            table: {
              widths: [100, 80],
              body: [
                [
                  { text: 'Subtotal', fontSize: 10, alignment: 'right', border: [false, false, false, false], margin: [5, 2, 5, 2] },
                  { text: formatCurrency(pedido.subtotal), fontSize: 10, alignment: 'right', border: [false, false, false, false], margin: [5, 2, 5, 2] },
                ],
                ...(pedido.desconto_valor > 0 ? [[
                  { text: 'Descontos (R$)', fontSize: 10, alignment: 'right', border: [false, false, false, false], margin: [5, 2, 5, 2] },
                  { text: `R$ ${pedido.desconto_valor.toFixed(2).replace('.', ',')}`, fontSize: 10, alignment: 'right', color: '#ef4444', border: [false, false, false, false], margin: [5, 2, 5, 2] },
                ]] : []),
                [
                  { text: 'Total', fontSize: 12, bold: true, alignment: 'right', border: [false, true, false, false], margin: [5, 5, 5, 2], fillColor: '#f0f0f0' },
                  { text: formatCurrency(pedido.total), fontSize: 12, bold: true, alignment: 'right', border: [false, true, false, false], margin: [5, 5, 5, 2], fillColor: '#f0f0f0' },
                ],
              ],
            },
            width: 180,
            layout: {
              hLineWidth: (i: number) => i === 2 ? 1.5 : 0,
              vLineWidth: () => 0,
              hLineColor: () => '#333',
            },
          },
        ],
      },

      // Informações de Pagamento
      ...(pedido.forma_pagamento ? [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 15, 0, 10] },
        { 
          text: [
            { text: 'Pagar: ', fontSize: 10, bold: true },
            { text: pedido.forma_pagamento.toUpperCase(), fontSize: 10 }
          ],
          margin: [0, 0, 0, 5]
        }
      ] : []),

      // Observações
      ...(pedido.observacoes ? [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },
        { text: 'obs.:', fontSize: 9, bold: true, margin: [0, 0, 0, 5] },
        { text: pedido.observacoes, fontSize: 9, color: '#333' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 15] },
      ] : [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },
        { text: 'obs.:', fontSize: 9, bold: true, margin: [0, 0, 0, 5] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }], margin: [0, 30, 0, 15] },
      ]),
    ],
    
    // Rodapé
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { 
            text: `Documento gerado em ${formatDate(new Date().toISOString())}`, 
            fontSize: 7, 
            color: '#666',
            alignment: 'left',
            margin: [30, 10, 30, 10]
          },
          { 
            text: `Página ${currentPage} de ${pageCount}`, 
            fontSize: 7, 
            color: '#666',
            alignment: 'right',
            margin: [30, 10, 30, 10]
          },
        ],
      };
    },
  };

  if (acao === 'print') {
    pdfMake.createPdf(docDefinition).print();
  } else {
    pdfMake.createPdf(docDefinition).download(`pedido-${pedido.numero || 'sn'}.pdf`);
  }
};
