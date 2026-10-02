import type { Tables, Database } from '@/types/supabase';
type Views<K extends keyof Database['public']['Views']> = Database['public']['Views'][K]['Row'];
import { formatarEndereco } from './endereco';
import { formatarTipoAtendimento } from './tipo-atendimento';
export interface DadosEmpresaDocumento {
  logo_url?: string; instagram?: string; site?: string; nome_empresa: string; razao_social?: string; cnpj?: string; telefone?: string; endereco: string;
}
export function empresaParaDocumento(empresa?: Partial<Tables<'configuracoes_empresa'>> | null): DadosEmpresaDocumento {
  return {
    nome_empresa: empresa?.nome_empresa || 'Lojas Manu', razao_social: empresa?.razao_social || undefined,
    cnpj: empresa?.cnpj || undefined, telefone: empresa?.telefone || undefined,
    endereco: formatarEndereco(empresa), logo_url: empresa?.logo_url || undefined, instagram: empresa?.instagram || undefined, site: empresa?.site || undefined,
  };
}
export interface PedidoExportacao {
  id?: string | null; numero: number | string | null; data: string | null; cliente_nome: string | null;
  tipo_atendimento_nome: string | null; forma_pagamento_nome: string | null;
  total: number | null; status: string | null; total_itens?: number | null;
}
export interface DadosPedidoDocumento {
  numero?: number; data: string; status?: string; rascunho?: boolean; cliente_nome?: string; cliente_cpf?: string; cliente_telefone?: string;
  endereco?: string; tipo_atendimento?: string; forma_pagamento?: string; observacoes?: string;
  itens: { produto_nome: string; produto_codigo?: string; produto_unidade?: string; cor_descricao?: string; quantidade: number; valor_unitario: number; desconto_valor: number; valor_total: number }[];
  subtotal: number; desconto_valor: number; total: number;
}
export function pedidoParaDocumento(pedido: Views<'vw_pedidos_completos'> & { telefone_contato: string | null; endereco: Parameters<typeof formatarEndereco>[0]; itens: Views<'vw_itens_pedido_completos'>[] }): DadosPedidoDocumento {
  if (!pedido.data) throw new Error('Pedido sem data para impressão');
  return {
    numero: pedido.numero ?? undefined, data: pedido.data, status: pedido.status ?? undefined, cliente_nome: pedido.cliente_nome ?? undefined,
    cliente_cpf: pedido.cliente_cpf ?? undefined, cliente_telefone: pedido.telefone_contato || pedido.cliente_telefone || undefined,
    endereco: formatarEndereco(pedido.endereco), tipo_atendimento: pedido.tipo_atendimento_nome ? formatarTipoAtendimento(pedido.tipo_atendimento_nome) : undefined,
    forma_pagamento: pedido.forma_pagamento_nome ?? undefined, observacoes: pedido.observacao ?? undefined,
    itens: pedido.itens.map(i => ({ produto_nome: i.produto_nome || 'Produto', produto_codigo: i.produto_codigo ?? undefined, produto_unidade: i.produto_unidade ?? undefined, cor_descricao: i.cor_descricao ?? undefined, quantidade: i.quantidade ?? 0, valor_unitario: i.valor_unitario ?? 0, desconto_valor: i.desconto_valor ?? 0, valor_total: i.valor_total ?? 0 })),
    subtotal: pedido.subtotal ?? 0, desconto_valor: pedido.desconto_valor ?? 0, total: pedido.total ?? 0,
  };
}
// Busca lotes pequenos, confere contagem e IDs, e falha em vez de exportar silenciosamente um conjunto truncado.
export async function buscarTodosFiltrados<T extends { id: string | null }>(
  buscar: (offset: number, limit: number) => Promise<{ pedidos: T[]; total: number }>,
  progresso?: (quantidade: number, total: number) => void,
) {
  const registros: T[] = []; const ids = new Set<string>(); let esperado: number | undefined;
  do {
    const lote = await buscar(registros.length, 250);
    esperado ??= lote.total;
    if (lote.total !== esperado) throw new Error('Os pedidos mudaram durante a exportação. Tente novamente.');
    for (const registro of lote.pedidos) {
      if (!registro.id || ids.has(registro.id)) throw new Error('Os pedidos mudaram durante a exportação. Tente novamente.');
      ids.add(registro.id); registros.push(registro);
    }
    progresso?.(registros.length, esperado);
    if (registros.length > esperado) throw new Error('Os pedidos mudaram durante a exportação. Tente novamente.');
    if (!lote.pedidos.length && registros.length < esperado) throw new Error('Não foi possível carregar todos os pedidos. Tente novamente.');
  } while (registros.length < esperado);
  return registros;
}
