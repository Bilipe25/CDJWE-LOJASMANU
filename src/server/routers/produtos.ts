import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/server';
import { executarRPC } from '@/server/rpc';
import type { Tables } from '@/types/supabase';

export const produtosRouter = router({
  // Estatísticas gerais de produtos
  stats: protectedProcedure.query(async ({ ctx }) => {
    const { data: todosProdutos, error: errorTodos } = await ctx.supabase
      .from('produtos')
      .select('*', { count: 'exact' });

    if (errorTodos) throw new Error(errorTodos.message);

    const { count: totalAtivos, error: errorAtivos } = await ctx.supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (errorAtivos) throw new Error(errorAtivos.message);

    const somaValores = (todosProdutos || []).reduce((sum, p) => sum + p.valor_base, 0);
    const valorMedio = todosProdutos && todosProdutos.length > 0 
      ? somaValores / todosProdutos.length 
      : 0;

    return {
      total: todosProdutos?.length || 0,
      ativos: totalAtivos || 0,
      valorMedio: valorMedio,
      somaTotal: somaValores,
    };
  }),

  // Listar todos os produtos ativos
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        search: z.string().optional(),
        categoriaId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => await executarRPC(ctx.supabase, 'pdv_listar_produtos', {
      p_busca: input.search ?? '', p_categoria: input.categoriaId, p_limite: input.limit, p_offset: input.offset,
    }) as { produtos: Tables<'produtos'>[]; total: number }),

  // Buscar produto por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('produtos')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Criar produto
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1).max(200),
        codigo: z.string().max(50).optional(),
        categoria_id: z.string().uuid().optional(),
        unidade: z.string().max(20).default('UN'),
        valor_base: z.number().min(0),
        descricao: z.string().optional(),
        ativo: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('produtos')
        .insert(input)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Atualizar produto
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(200).optional(),
        codigo: z.string().max(50).optional(),
        categoria_id: z.string().uuid().optional(),
        unidade: z.string().max(20).optional(),
        valor_base: z.number().min(0).optional(),
        descricao: z.string().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const { data, error } = await ctx.supabase
        .from('produtos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // Desativar produto (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', input.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
