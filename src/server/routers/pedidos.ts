import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/server';

const itemPedidoSchema = z.object({
  produto_id: z.string().uuid(),
  cor_id: z.string().uuid().optional(),
  quantidade: z.number().min(0.001),
  valor_unitario: z.number().min(0),
  desconto_valor: z.number().min(0).default(0),
  ordem: z.number().default(0),
});

export const pedidosRouter = router({
  // Listar pedidos
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(10000).default(50),
        offset: z.number().min(0).default(0),
        status: z.enum(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'FINALIZADO']).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
        dataInicio: z.string().optional().transform(val => val === '' ? undefined : val),
        dataFim: z.string().optional().transform(val => val === '' ? undefined : val),
        tipoAtendimento: z.string().optional().transform(val => val === '' ? undefined : val),
        formaPagamentoId: z.string().uuid().optional().transform(val => val === '' ? undefined : val),
        clienteId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('vw_pedidos_completos')
        .select('*', { count: 'exact' })
        .range(input.offset, input.offset + input.limit - 1)
        .order('data', { ascending: false });

      if (input.status) {
        query = query.eq('status', input.status);
      }

      if (input.dataInicio) {
        query = query.gte('data', input.dataInicio);
      }

      if (input.dataFim) {
        query = query.lte('data', input.dataFim);
      }

      if (input.tipoAtendimento) {
        if (input.tipoAtendimento === 'SEM_TIPO') {
          query = query.is('tipo_atendimento_tipo', null);
        } else {
          query = query.eq('tipo_atendimento_tipo', input.tipoAtendimento);
        }
      }

      if (input.formaPagamentoId) {
        query = query.eq('forma_pagamento_id', input.formaPagamentoId);
      }

      if (input.clienteId) {
        query = query.eq('cliente_id', input.clienteId);
      }

      const { data, error, count } = await query;

      if (error) throw new Error(error.message);

      return {
        pedidos: data || [],
        total: count || 0,
      };
    }),

  // Listar pedidos por cliente
  listByCliente: publicProcedure
    .input(
      z.object({
        clienteId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pedidos')
        .select('id, numero, data, status, total')
        .eq('cliente_id', input.clienteId)
        .order('data', { ascending: false });

      if (error) throw new Error(error.message);

      return data || [];
    }),

  // Buscar pedido por ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: pedido, error: pedidoError } = await ctx.supabase
        .from('vw_pedidos_completos')
        .select('*')
        .eq('id', input.id)
        .single();

      if (pedidoError) throw new Error(pedidoError.message);

      const { data: itens, error: itensError } = await ctx.supabase
        .from('vw_itens_pedido_completos')
        .select('*')
        .eq('pedido_id', input.id)
        .order('ordem');

      if (itensError) throw new Error(itensError.message);

      return {
        ...pedido,
        itens: itens || [],
      };
    }),

  // Obter próximo número de pedido
  getProximoNumero: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.rpc('obter_proximo_numero_pedido');

    if (error) throw new Error(error.message);
    return data;
  }),

  // Criar pedido
  create: publicProcedure
    .input(
      z.object({
        data: z.string(),
        cliente_id: z.string().uuid().optional(),
        endereco_id: z.string().uuid().optional(),
        tipo_atendimento_id: z.string().uuid(),
        forma_pagamento_id: z.string().uuid().optional(),
        telefone_contato: z.string().max(20).optional(),
        desconto_valor: z.number().min(0).default(0),
        subtotal: z.number().optional(),
        total: z.number().optional(),
        descricao: z.string().optional(),
        observacao: z.string().optional(),
        status: z.enum(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'FINALIZADO']).default('PENDENTE'),
        itens: z.array(itemPedidoSchema).optional().default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { itens, ...pedidoData } = input;

      // Obter próximo número
      const { data: numero } = await ctx.supabase.rpc('obter_proximo_numero_pedido');

      // Criar pedido
      const { data: pedido, error: pedidoError } = await ctx.supabase
        .from('pedidos')
        .insert({
          ...pedidoData,
          numero,
        })
        .select()
        .single();

      if (pedidoError) throw new Error(pedidoError.message);

      // Criar itens (somente se houver)
      if (itens && itens.length > 0) {
        const itensParaInserir = itens.map((item) => ({
          ...item,
          pedido_id: pedido.id,
        }));

        const { error: itensError } = await ctx.supabase
          .from('itens_pedido')
          .insert(itensParaInserir);

        if (itensError) throw new Error(itensError.message);
      }

      return pedido;
    }),

  // Atualizar pedido
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        cliente_id: z.string().uuid().optional(),
        endereco_id: z.string().uuid().optional(),
        tipo_atendimento_id: z.string().uuid().optional(),
        forma_pagamento_id: z.string().uuid().optional(),
        telefone_contato: z.string().max(20).optional(),
        desconto_valor: z.number().min(0).optional(),
        total: z.number().optional(),
        subtotal: z.number().optional(),
        data: z.string().optional(),
        descricao: z.string().optional(),
        observacao: z.string().optional(),
        status: z.enum(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'FINALIZADO']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const { data, error } = await ctx.supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Adicionar item ao pedido
  addItem: publicProcedure
    .input(
      z.object({
        pedido_id: z.string().uuid(),
        item: itemPedidoSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('itens_pedido')
        .insert({
          ...input.item,
          pedido_id: input.pedido_id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Atualizar item do pedido
  updateItem: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        quantidade: z.number().min(0.001).optional(),
        valor_unitario: z.number().min(0).optional(),
        desconto_valor: z.number().min(0).optional(),
        cor_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const { data, error } = await ctx.supabase
        .from('itens_pedido')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Remover item do pedido
  removeItem: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('itens_pedido')
        .delete()
        .eq('id', input.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),

  // Estatísticas agregadas (para cards totais sem buscar todos os registros)
  estatisticas: publicProcedure
    .input(
      z.object({
        tipoAtendimento: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Buscar registros com limit
        let query = ctx.supabase
          .from('vw_pedidos_completos')
          .select('status, total')
          .limit(1000);

        if (input.tipoAtendimento) {
          query = query.eq('tipo_atendimento', input.tipoAtendimento);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar estatísticas:', error);
          return {
            total: 0,
            valorTotal: 0,
            pendentes: 0,
            finalizadas: 0,
            canceladas: 0,
          };
        }

        const pedidos = data || [];
        
        // Calcular agregações
        const valorTotal = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
        const pendentes = pedidos.filter(p => p.status === 'PENDENTE').length;
        const finalizadas = pedidos.filter(p => p.status === 'FINALIZADO').length;
        const canceladas = pedidos.filter(p => p.status === 'CANCELADO').length;
        
        return {
          total: pedidos.length,
          valorTotal,
          pendentes,
          finalizadas,
          canceladas,
        };
      } catch (err) {
        console.error('Erro nas estatísticas:', err);
        return {
          total: 0,
          valorTotal: 0,
          pendentes: 0,
          finalizadas: 0,
          canceladas: 0,
        };
      }
    }),

  // Duplicar pedido
  duplicar: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('duplicar_pedido', {
        pedido_original_id: input.id,
      });

      if (error) throw new Error(error.message);
      return data;
    }),

  // Cancelar pedido
  cancelar: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pedidos')
        .update({ status: 'CANCELADO' })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Finalizar pedido
  finalizar: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('pedidos')
        .update({ status: 'FINALIZADO' })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Excluir pedido
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Primeiro, deletar os itens do pedido
      const { error: itensError } = await ctx.supabase
        .from('itens_pedido')
        .delete()
        .eq('pedido_id', input.id);

      if (itensError) throw new Error(itensError.message);

      // Depois, deletar o pedido
      const { error: pedidoError } = await ctx.supabase
        .from('pedidos')
        .delete()
        .eq('id', input.id);

      if (pedidoError) throw new Error(pedidoError.message);

      return { success: true };
    }),
});
