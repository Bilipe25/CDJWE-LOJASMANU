import { consultarDashboard } from '@/server/dashboard';
import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/server';

export const relatoriosRouter = router({
  // Relatório de vendas por período
  vendasPeriodo: protectedProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('relatorio_vendas_periodo', {
        data_inicio: input.dataInicio,
        data_fim: input.dataFim,
      });

      if (error) throw new Error(error.message);
      return data;
    }),

  // Top produtos mais vendidos
  topProdutos: protectedProcedure
    .input(
      z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        limite: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('top_produtos_vendidos', {
        data_inicio: input.dataInicio || undefined,
        data_fim: input.dataFim || undefined,
        limite: input.limite,
      });

      if (error) throw new Error(error.message);
      return data;
    }),

  // Dashboard uses protected filters and the business calendar.
  dashboard: protectedProcedure.input(z.object({})).query(({ ctx }) => consultarDashboard(ctx.supabase)),
  // Relatório anual
  relatorioAnual: protectedProcedure
    .input(
      z.object({
        ano: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      console.log('🔍 Buscando relatório anual para o ano:', input.ano);
      
      const { data, error } = await ctx.supabase.rpc('relatorio_vendas_anual', {
        ano: input.ano,
      });

      if (error) {
        console.error('❌ Erro ao buscar relatório anual:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Dados retornados do relatório anual:', data);
      console.log('📊 Total de registros:', data?.length || 0);
      
      return data;
    }),
});
