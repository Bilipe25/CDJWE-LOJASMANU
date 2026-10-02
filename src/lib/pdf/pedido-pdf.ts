import { formatDateBR } from '@/lib/utils/dateUtils';
import pdfMake from './fontes';
import type { Content, ContentColumns, ContentText, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { DadosPedidoDocumento as DadosPedido, DadosEmpresaDocumento as DadosEmpresa } from '@/lib/utils/documentos';

const cor = { texto: '#0f172a', secundario: '#475569', linha: '#cbd5e1', fundo: '#f1f5f9', azul: '#0369a1' };
const moeda = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const quantidade = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value);
const numeroPedido = (pedido: DadosPedido) => pedido.numero === undefined ? '' : `#${String(pedido.numero).padStart(5, '0')}`;
const situacoes: Record<string, string> = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado' };
const cpf = (value: string) => /^\d{11}$/.test(value) ? value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value;

function validarPedido(pedido: DadosPedido) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedido.data) || Number.isNaN(Date.parse(`${pedido.data}T12:00:00Z`)) || new Date(`${pedido.data}T12:00:00Z`).toISOString().slice(0, 10) !== pedido.data) throw new Error('Confira a data do pedido antes de imprimir.');
  if (!pedido.itens.length) throw new Error('Adicione pelo menos um produto antes de imprimir.');
  const valores = [pedido.subtotal, pedido.desconto_valor, pedido.total, ...pedido.itens.flatMap(i => [i.quantidade, i.valor_unitario, i.desconto_valor, i.valor_total])];
  if (valores.some(v => !Number.isFinite(v) || v < 0) || pedido.itens.some(i => i.quantidade <= 0)) throw new Error('Confira as quantidades e os valores do pedido antes de imprimir.');
}

// Shared definition for download and print. Financial values come from the order, never from display rounding.
export function criarDefinicaoPedido(pedido: DadosPedido, empresa: DadosEmpresa, logo?: string, agora = new Date()): TDocumentDefinitions {
  validarPedido(pedido);
  const rascunho = pedido.rascunho || pedido.numero === undefined;
  const titulo = rascunho ? (pedido.numero === undefined ? 'Rascunho de venda' : `Rascunho ${numeroPedido(pedido)}`) : `Pedido ${numeroPedido(pedido)}`;
  const status = rascunho ? 'Dados em edição no PDV' : situacoes[pedido.status ?? ''];
  const descontosItens = pedido.itens.reduce((soma, i) => soma + Math.round(i.desconto_valor * 100), 0) / 100;
  const temDescontos = descontosItens > 0;
  const gerado = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(agora);
  const secundario = (text: string): Content => ({ text, color: cor.secundario, fontSize: 9, margin: [0, 3, 0, 0] });
  const coluna = (label: string, value?: string): ContentColumns['columns'][number] => ({ stack: [{ text: label, color: cor.secundario, fontSize: 9 }, { text: value || 'Não informado', fontSize: 10, bold: true, margin: [0, 4, 0, 0] }], width: '*' });
  const cabecalho = (text: string, alignment: 'left' | 'right' = 'left'): TableCell => ({ text, bold: true, fontSize: 9, color: cor.texto, fillColor: cor.fundo, alignment });
  const itemDinheiro = (value: number): ContentText => ({ text: moeda(value), alignment: 'right', fontSize: 9 });
  const totais: TableCell[][] = [
    ...(temDescontos ? [[{ text: 'Descontos nos itens (já aplicados)', color: cor.secundario, fontSize: 9 }, itemDinheiro(descontosItens)]] : []),
    [{ text: 'Subtotal dos itens', color: cor.secundario }, itemDinheiro(pedido.subtotal)],
    ...(pedido.desconto_valor > 0 ? [[{ text: 'Desconto do pedido', color: cor.secundario }, itemDinheiro(pedido.desconto_valor)]] : []),
    [{ text: 'Total do pedido', bold: true, fontSize: 12, fillColor: cor.fundo }, { text: moeda(pedido.total), bold: true, fontSize: 16, alignment: 'right', fillColor: cor.fundo }],
  ];
  const corpo: TableCell[][] = [
    [cabecalho('Nº'), cabecalho('Produto'), cabecalho('Qtd.', 'right'), cabecalho('Valor unit.', 'right'), ...(temDescontos ? [cabecalho('Desconto', 'right')] : []), cabecalho('Total', 'right')],
    ...pedido.itens.map((item, idx): TableCell[] => [
      { text: String(idx + 1), color: cor.secundario, fontSize: 9 },
      { stack: [
        { text: item.produto_nome || 'Produto', bold: true, fontSize: 10 },
        ...([item.produto_codigo ? `Cód.: ${item.produto_codigo}` : '', item.cor_descricao ? `Cor: ${item.cor_descricao}` : ''].filter(Boolean).length ? [secundario([item.produto_codigo ? `Cód.: ${item.produto_codigo}` : '', item.cor_descricao ? `Cor: ${item.cor_descricao}` : ''].filter(Boolean).join(' · '))] : []),
      ] },
      { stack: [{ text: quantidade(item.quantidade), alignment: 'right' }, ...(item.produto_unidade ? [{ text: item.produto_unidade, fontSize: 8, color: cor.secundario, alignment: 'right' as const }] : [])] },
      itemDinheiro(item.valor_unitario),
      ...(temDescontos ? [itemDinheiro(item.desconto_valor)] : []),
      { ...itemDinheiro(item.valor_total), bold: true },
    ]),
  ];
  return {
    pageSize: 'A4', pageMargins: [36, 44, 36, 48],
    info: { title: titulo, author: empresa.nome_empresa, subject: 'Pedido de venda' },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: cor.texto, lineHeight: 1.15 },
    header: (pagina) => pagina === 1 ? { text: '' } : {
      columns: [{ text: empresa.nome_empresa, bold: true }, { text: titulo, alignment: 'right' }], fontSize: 9, color: cor.secundario, margin: [36, 20, 36, 0],
    },
    footer: (pagina, total) => ({ columns: [
      { text: `${titulo} · Gerado em ${gerado} (Fortaleza)`, width: '*' },
      { text: `${pagina} / ${total}`, width: 45, alignment: 'right' },
    ], fontSize: 8, color: cor.secundario, margin: [36, 16, 36, 0] }),
    content: [
      { columns: [
        ...(logo ? [{ image: logo, fit: [48, 58] as [number, number], width: 58 }] : []),
        { width: '*', stack: [
          { text: empresa.nome_empresa || 'Lojas Manu', fontSize: 17, bold: true, color: cor.azul },
          ...(empresa.razao_social ? [secundario(empresa.razao_social)] : []),
          ...(empresa.endereco ? [secundario(empresa.endereco)] : []),
          ...([empresa.telefone ? `Tel.: ${empresa.telefone}` : '', empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : ''].some(Boolean) ? [secundario([empresa.telefone ? `Tel.: ${empresa.telefone}` : '', empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : ''].filter(Boolean).join(' · '))] : []),
          ...([empresa.instagram, empresa.site].some(Boolean) ? [secundario([empresa.instagram ? `Instagram: ${empresa.instagram}` : '', empresa.site].filter(Boolean).join(' · '))] : []),
        ] },
        { width: 158, alignment: 'right', stack: [{ text: titulo, bold: true, fontSize: 18 }, ...(status ? [secundario(status)] : []), secundario(formatDateBR(pedido.data))] },
      ], columnGap: 10, margin: [0, 0, 0, 20] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523.28, y2: 0, lineWidth: .6, lineColor: cor.linha }], margin: [0, 0, 0, 16] },
      { text: 'Cliente', bold: true, fontSize: 11, margin: [0, 0, 0, 6] },
      { text: pedido.cliente_nome || 'Cliente não informado', fontSize: 12, bold: true },
      ...([pedido.cliente_cpf, pedido.cliente_telefone].some(Boolean) ? [secundario([pedido.cliente_cpf ? `CPF: ${cpf(pedido.cliente_cpf)}` : '', pedido.cliente_telefone ? `Tel.: ${pedido.cliente_telefone}` : ''].filter(Boolean).join(' · '))] : []),
      secundario(pedido.endereco || 'Endereço não informado'),
      { columns: [coluna('Atendimento', pedido.tipo_atendimento), coluna('Forma de pagamento', pedido.forma_pagamento)], columnGap: 20, margin: [0, 16, 0, 20] },
      { columns: [{ text: 'Itens do pedido', bold: true, fontSize: 11 }, { text: `${pedido.itens.length} ${pedido.itens.length === 1 ? 'item' : 'itens'}`, alignment: 'right', color: cor.secundario, fontSize: 9 }], margin: [0, 0, 0, 8] },
      { table: { headerRows: 1, keepWithHeaderRows: 1, dontBreakRows: false, widths: [20, '*', 38, 72, ...(temDescontos ? [60] : []), 78], body: corpo }, layout: {
        hLineWidth: (i, node) => i === 0 ? 0 : i === 1 || i === node.table.body.length ? .7 : .4,
        vLineWidth: () => 0, hLineColor: () => cor.linha,
        paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 8, paddingBottom: () => 8,
      }, margin: [0, 0, 0, 14] },
      { unbreakable: true, columns: [{ text: '', width: '*' }, { width: 300, table: { widths: ['*', 128], body: totais }, layout: {
        hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6,
      } }] },
      ...(pedido.observacoes?.trim() ? [{ text: 'Observações', fontSize: 11, bold: true, margin: [0, 20, 0, 6] } as Content, { text: pedido.observacoes, fontSize: 10, color: cor.secundario } as Content] : []),
    ],
  };
}

async function carregarLogo(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return;
    const blob = await response.blob();
    if (!['image/png', 'image/jpeg'].includes(blob.type) || blob.size > 2_000_000) return;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Não foi possível ler o logo.'));
      reader.readAsDataURL(blob);
    });
    // Reject HTML disguised as an image and corrupted files before pdfmake decodes them.
    await new Promise<void>((resolve, reject) => {
      const imagem = new Image(); imagem.onload = () => resolve(); imagem.onerror = () => reject(new Error('Logo inválido.')); imagem.src = data;
    });
    return data;
  } catch { return; } finally { clearTimeout(timeout); }
}

export async function gerarPedidoPDF(pedido: DadosPedido, empresa: DadosEmpresa, acao: 'download' | 'print' = 'print', janelaImpressao?: Window) {
  validarPedido(pedido);
  if (janelaImpressao?.closed) throw new Error('A janela de impressão foi fechada. Clique em imprimir novamente.');
  const logo = await carregarLogo(empresa.logo_url || '/icon-192x192.png');
  const doc = criarDefinicaoPedido(pedido, empresa, logo);
  if (acao === 'print') {
    if (janelaImpressao?.closed) throw new Error('A janela de impressão foi fechada. Clique em imprimir novamente.');
    pdfMake.createPdf(doc).print({}, janelaImpressao);
  } else pdfMake.createPdf(doc).download(`pedido-${pedido.numero ?? 'rascunho'}.pdf`);
}
