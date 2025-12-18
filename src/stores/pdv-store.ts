import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ItemCarrinho {
  id?: string; // ID do item_pedido se já salvo
  produto_id: string;
  produto_nome: string;
  produto_codigo?: string;
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

const pedidoInicial: PedidoAtual = {
  data: new Date().toISOString().split('T')[0],
  desconto_valor: 0,
  subtotal: 0,
  total: 0,
  status: 'PENDENTE',
  itens: [],
};

export const usePDVStore = create<PDVStore>()(
  persist(
    (set, get) => ({
      pedidoAtual: pedidoInicial,

      setPedidoAtual: (pedido) => {
        set((state) => ({
          pedidoAtual: { ...state.pedidoAtual, ...pedido },
        }));
        get().calcularTotais();
      },

      adicionarItem: (item) => {
        set((state) => {
          const novoItem: ItemCarrinho = {
            ...item,
            valor_total: item.quantidade * item.valor_unitario - item.desconto_valor,
            ordem: state.pedidoAtual.itens.length,
          };

          return {
            pedidoAtual: {
              ...state.pedidoAtual,
              itens: [...state.pedidoAtual.itens, novoItem],
            },
          };
        });
        get().calcularTotais();
      },

      atualizarItem: (index, itemAtualizado) => {
        set((state) => {
          const itens = [...state.pedidoAtual.itens];
          const itemAntigo = itens[index];

          if (itemAntigo) {
            const itemNovo = { ...itemAntigo, ...itemAtualizado };
            itemNovo.valor_total =
              itemNovo.quantidade * itemNovo.valor_unitario - itemNovo.desconto_valor;
            itens[index] = itemNovo;
          }

          return {
            pedidoAtual: {
              ...state.pedidoAtual,
              itens,
            },
          };
        });
        get().calcularTotais();
      },

      removerItem: (index) => {
        set((state) => {
          const itens = state.pedidoAtual.itens.filter((_, i) => i !== index);
          return {
            pedidoAtual: {
              ...state.pedidoAtual,
              itens,
            },
          };
        });
        get().calcularTotais();
      },

      limparCarrinho: () => {
        set((state) => ({
          pedidoAtual: {
            ...state.pedidoAtual,
            itens: [],
            subtotal: 0,
            total: 0,
          },
        }));
      },

      calcularTotais: () => {
        set((state) => {
          const subtotal = state.pedidoAtual.itens.reduce(
            (acc, item) => acc + item.valor_total,
            0
          );
          const total = subtotal - state.pedidoAtual.desconto_valor;

          return {
            pedidoAtual: {
              ...state.pedidoAtual,
              subtotal,
              total: total >= 0 ? total : 0,
            },
          };
        });
      },

      novoPedido: () => {
        set({
          pedidoAtual: {
            ...pedidoInicial,
            data: new Date().toISOString().split('T')[0],
            itens: [], // Garantir que a lista seja limpa
            subtotal: 0,
            total: 0,
            desconto_valor: 0,
          },
        });
      },
    }),
    {
      name: 'pdv-storage',
      partialize: (state) => ({ pedidoAtual: state.pedidoAtual }),
    }
  )
);
