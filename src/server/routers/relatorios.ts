import { consultarDashboard, consultarVendasDashboard, consultarClientesDashboard, consultarPedidosDashboard, consultarPendentesDashboard, consultarProdutosDashboard } from '@/server/dashboard';
import { consultarPeriodoFinanceiro, consultarAnualFinanceiro } from '@/server/financeiro';
import { periodoFinanceiroSchema, anoFinanceiroSchema } from '@/lib/schemas/financeiro';
import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/server';

export const relatoriosRouter = router({
  financeiroPeriodo: protectedProcedure.input(periodoFinanceiroSchema).query(({ ctx, input }) => consultarPeriodoFinanceiro(ctx.supabase, input.dataInicio, input.dataFim)),
  vendasPeriodo: protectedProcedure.input(periodoFinanceiroSchema).query(async ({ ctx, input }) => (await consultarPeriodoFinanceiro(ctx.supabase, input.dataInicio, input.dataFim)).dias),
  topProdutos: protectedProcedure.input(periodoFinanceiroSchema.and(z.object({ limite: z.number().int().min(1).max(50).default(10) }))).query(async ({ ctx, input }) => (await consultarPeriodoFinanceiro(ctx.supabase, input.dataInicio, input.dataFim)).produtos.slice(0, input.limite)),
  dashboard: protectedProcedure.input(z.object({})).query(({ ctx }) => consultarDashboard(ctx.supabase)),
  dashboardVendas: protectedProcedure.query(({ ctx }) => consultarVendasDashboard(ctx.supabase)),
  dashboardClientes: protectedProcedure.query(({ ctx }) => consultarClientesDashboard(ctx.supabase)),
  dashboardPedidos: protectedProcedure.query(({ ctx }) => consultarPedidosDashboard(ctx.supabase)),
  dashboardPendentes: protectedProcedure.query(({ ctx }) => consultarPendentesDashboard(ctx.supabase)),
  dashboardProdutos: protectedProcedure.query(({ ctx }) => consultarProdutosDashboard(ctx.supabase)),
  relatorioAnual: protectedProcedure.input(z.object({ ano: anoFinanceiroSchema })).query(({ ctx, input }) => consultarAnualFinanceiro(ctx.supabase, input.ano)),
});
