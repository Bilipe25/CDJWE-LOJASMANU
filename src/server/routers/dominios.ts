import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/server';

// Router para tabelas de domínio (categorias, cores, formas_pagamento, tipos_atendimento)
export const dominiosRouter = router({
  // ============================================
  // CATEGORIAS
  // ============================================
  categorias: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('categorias')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw new Error(error.message);
      return data;
    }),

    create: publicProcedure
      .input(
        z.object({
          nome: z.string().min(1).max(100),
          descricao: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase
          .from('categorias')
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          nome: z.string().min(1).max(100).optional(),
          descricao: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updateData } = input;
        const { data, error } = await ctx.supabase
          .from('categorias')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    delete: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { error } = await ctx.supabase
          .from('categorias')
          .delete()
          .eq('id', input.id);

        if (error) throw new Error(error.message);
        return { success: true };
      }),
  }),

  // ============================================
  // CORES
  // ============================================
  cores: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('cores')
        .select('*')
        .eq('ativo', true)
        .order('descricao');

      if (error) throw new Error(error.message);
      return data;
    }),

    create: publicProcedure
      .input(
        z.object({
          codigo: z.string().max(20).optional(),
          descricao: z.string().min(1).max(100),
          linha: z.string().max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase
          .from('cores')
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          codigo: z.string().max(20).optional(),
          descricao: z.string().min(1).max(100).optional(),
          linha: z.string().max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updateData } = input;
        const { data, error } = await ctx.supabase
          .from('cores')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),

    delete: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { error } = await ctx.supabase
          .from('cores')
          .delete()
          .eq('id', input.id);

        if (error) throw new Error(error.message);
        return { success: true };
      }),
  }),

  // ============================================
  // FORMAS DE PAGAMENTO
  // ============================================
  formasPagamento: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('formas_pagamento')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw new Error(error.message);
      return data;
    }),

    create: publicProcedure
      .input(
        z.object({
          nome: z.string().min(1).max(50),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase
          .from('formas_pagamento')
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),
  }),

  // ============================================
  // TIPOS DE ATENDIMENTO
  // ============================================
  tiposAtendimento: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('tipos_atendimento')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw new Error(error.message);
      return data;
    }),

    create: publicProcedure
      .input(
        z.object({
          nome: z.string().min(1).max(50),
          tipo: z.enum(['ENTRADA', 'SAIDA', 'ORÇAMENTO', 'S/MOVIMENTO']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { data, error } = await ctx.supabase
          .from('tipos_atendimento')
          .insert(input)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }),
  }),
});
