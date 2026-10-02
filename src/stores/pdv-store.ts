import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dateToString } from '@/lib/utils/dateUtils';
import { arredondarMoeda, totalItem, totaisPedido } from '@/lib/utils/valores-pedido';
export interface ItemCarrinho {
  id?: string; // ID do item_pedido se já salvo
  produto_id: string;
  produto_nome: string;
  produto_codigo?: string;
  produto_unidade?: string;
  cor_id?: string;
  cor_descricao?: string;
  quantidade: number;
  valor_unitario: number;
  desconto_valor: number;
  valor_total: number;
  ordem: number;
}

export interface PedidoAtual {
  id?: string;
  numero?: number;
  versao?: number;
  chave_requisicao: string;
  telefone_contato?: string;
  cliente?: { id: string; nome: string; cpf?: string | null; telefone?: string | null };
  data: string;
  cliente_id?: string;
  cliente_nome?: string;
  endereco_id?: string;
  tipo_atendimento_id?: string;
  forma_pagamento_id?: string;
  desconto_valor: number;
  subtotal: number;
  total: number;
  descricao?: string;
  observacao?: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'FINALIZADO';
  itens: ItemCarrinho[];
}

interface PDVStore {
  pedidoAtual: PedidoAtual;
  setPedidoAtual: (pedido: Partial<PedidoAtual>) => void;
  adicionarItem: (item: Omit<ItemCarrinho, 'valor_total' | 'ordem'>) => void;
  atualizarItem: (index: number, item: Partial<ItemCarrinho>) => void;
  removerItem: (index: number) => void;
  limparCarrinho: () => void;
  calcularTotais: () => void;
  novoPedido: () => void;
}


const pedidoInicial = (): PedidoAtual => ({ data: dateToString(new Date()), chave_requisicao: crypto.randomUUID(), desconto_valor: 0, subtotal: 0, total: 0, status: 'PENDENTE', itens: [] });
function consolidar(pedido: PedidoAtual): PedidoAtual {
  const itens = pedido.itens.map((item, ordem) => ({ ...item, ordem, desconto_valor: arredondarMoeda(item.desconto_valor), valor_total: totalItem(item) }));
  return { ...pedido, itens, ...totaisPedido(itens, pedido.desconto_valor) };
}
export const usePDVStore = create<PDVStore>()(persist((set) => ({
  pedidoAtual: pedidoInicial(),
  setPedidoAtual: (pedido) => set(state => ({ pedidoAtual: consolidar({ ...state.pedidoAtual, ...pedido }) })),
  adicionarItem: (item) => set(state => ({ pedidoAtual: consolidar({ ...state.pedidoAtual, itens: [...state.pedidoAtual.itens, { ...item, valor_total: totalItem(item), ordem: state.pedidoAtual.itens.length }] }) })),
  atualizarItem: (index, alteracao) => set(state => ({ pedidoAtual: consolidar({ ...state.pedidoAtual, itens: state.pedidoAtual.itens.map((item,i) => i === index ? { ...item, ...alteracao } : item) }) })),
  removerItem: (index) => set(state => {
    const itens = state.pedidoAtual.itens.filter((_,i) => i !== index);
    const subtotal = totaisPedido(itens,0).subtotal;
    return { pedidoAtual: consolidar({ ...state.pedidoAtual, itens, desconto_valor: Math.min(state.pedidoAtual.desconto_valor,subtotal) }) };
  }),
  limparCarrinho: () => set(state => ({ pedidoAtual: consolidar({ ...state.pedidoAtual, itens: [], desconto_valor: 0 }) })),
  calcularTotais: () => set(state => ({ pedidoAtual: consolidar(state.pedidoAtual) })),
  novoPedido: () => set({ pedidoAtual: pedidoInicial() }),
}), {
  name: 'pdv-storage', version: 2,
  partialize: state => ({ pedidoAtual: state.pedidoAtual }),
  migrate: (persistido) => {
    const antigo = (persistido as { pedidoAtual?: Partial<PedidoAtual> })?.pedidoAtual;
    if (!antigo) return { pedidoAtual: pedidoInicial() };
    try {
      const itens = (antigo.itens ?? []).filter(item => { try { totalItem(item); return true; } catch { return false; } });
      const subtotal = totaisPedido(itens,0).subtotal;
      return { pedidoAtual: consolidar({ ...pedidoInicial(), ...antigo, cliente: antigo.cliente ?? (antigo.cliente_id ? { id: antigo.cliente_id, nome: antigo.cliente_nome ?? '' } : undefined), itens, desconto_valor: Math.min(Math.max(antigo.desconto_valor ?? 0,0),subtotal) }) };
    } catch { return { pedidoAtual: pedidoInicial() }; }
  },
}));
