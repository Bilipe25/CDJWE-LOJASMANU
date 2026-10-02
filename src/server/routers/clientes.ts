import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/server';
import { clienteSchema, clienteUpdateSchema } from '@/lib/schemas/cliente';
import { executarRPC } from '@/server/rpc';
import type { Database } from '@/types/supabase';

export const clientesRouter = router({
  // Estatísticas gerais de clientes
  stats: protectedProcedure.query(async ({ ctx }) => {
    const data = await executarRPC(ctx.supabase, 'pdv_estatisticas_clientes', {});
    return data as { total: number; ativos: number; totalPedidos: number; valorTotalCompras: number };
  }),

  // Uma RPC agrega endereço/totais antes de paginar, sem truncar lotes pelo max_rows.
  list: protectedProcedure.input(z.object({
    limit: z.number().int().min(1).max(1000).default(50), offset: z.number().int().min(0).default(0),
    search: z.string().trim().max(200).optional(), ativo: z.boolean().nullable().default(true),
  })).query(async ({ ctx, input }) => await executarRPC(ctx.supabase, 'pdv_listar_clientes', {
    p_busca: input.search ?? '', p_ativo: input.ativo, p_limite: input.limit, p_offset: input.offset,
  }) as { clientes: (Database['public']['Tables']['clientes']['Row'] & { total_pedidos: number; valor_total_compras: number; endereco_principal: string | null; endereco_principal_completo: string; total_enderecos: number })[]; total: number }),

  // Buscar cliente por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: cliente, error } = await ctx.supabase.from('clientes').select('*').eq('id', input.id).single();
      if (error) throw new Error(error.message);
      const { data: enderecos, error: erroEnderecos } = await ctx.supabase.from('enderecos').select('*').eq('cliente_id', input.id).order('principal', { ascending: false });
      if (erroEnderecos) throw new Error(erroEnderecos.message);
      return { ...cliente, enderecos: enderecos || [] };
    }),
  create: protectedProcedure
    .input(clienteSchema)
    .mutation(async ({ ctx, input }) => {
      return await executarRPC(ctx.supabase, 'pdv_salvar_cliente', { p_dados: input }) as Database['public']['Tables']['clientes']['Row'];
    }),

  // Atualizar cliente
  update: protectedProcedure
    .input(clienteUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...dados } = input;
      return await executarRPC(ctx.supabase, 'pdv_salvar_cliente', { p_id: id, p_dados: dados }) as Database['public']['Tables']['clientes']['Row'];
    }),

  // Desativar cliente
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await executarRPC(ctx.supabase, 'pdv_salvar_cliente', { p_id: input.id, p_dados: { ativo: false } });
      return { success: true };
    }),
});
