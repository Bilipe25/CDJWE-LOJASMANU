import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/server';

export const relatoriosRouter = router({
  // Relatório de vendas por período
  vendasPeriodo: publicProcedure
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
  topProdutos: publicProcedure
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

  // Dashboard - Estatísticas gerais
  dashboard: publicProcedure
    .input(
      z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Garantir formato correto da data local (sem conversão UTC)
      const getDataLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const hoje = getDataLocal(new Date());
      const inicioMes = getDataLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      
      // Data de 7 dias atrás (6 dias + hoje = 7 dias)
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
      const dataSeteDias = getDataLocal(seteDiasAtras);

      // Total de vendas do dia (apenas ENTRADA)
      const { data: vendasHoje, error: erroHoje } = await ctx.supabase
        .from('pedidos')
        .select('total, tipo_atendimento_id, tipos_atendimento!inner(tipo)')
        .eq('data', hoje)
        .eq('status', 'FINALIZADO')
        .eq('tipos_atendimento.tipo', 'ENTRADA');

      // Total de vendas do mês (apenas ENTRADA)
      const { data: vendasMes, error: erroMes } = await ctx.supabase
        .from('pedidos')
        .select('total, tipo_atendimento_id, tipos_atendimento!inner(tipo)')
        .gte('data', inicioMes)
        .eq('status', 'FINALIZADO')
        .eq('tipos_atendimento.tipo', 'ENTRADA');

      // Total de pedidos pendentes
      const { count: pedidosPendentes, error: erroPendentes } = await ctx.supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDENTE');

      // Total de clientes ativos
      const { count: totalClientes, error: erroClientes } = await ctx.supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);
      
      // Vendas dos últimos 7 dias (apenas ENTRADA)
      const { data: vendasSemana, error: erroSemana } = await ctx.supabase
        .from('pedidos')
        .select('data, total, tipo_atendimento_id, tipos_atendimento!inner(tipo)')
        .gte('data', dataSeteDias)
        .eq('status', 'FINALIZADO')
        .eq('tipos_atendimento.tipo', 'ENTRADA')
        .order('data');
      
      // Últimos 5 pedidos (apenas ENTRADA)
      const { data: ultimosPedidos, error: erroUltimosPedidos } = await ctx.supabase
        .from('vw_pedidos_completos')
        .select('*')
        .eq('tipo_atendimento_tipo', 'ENTRADA')
        .order('data', { ascending: false })
        .limit(5);
      
      // Top 5 produtos mais vendidos
      const { data: topProdutos, error: erroTopProdutos } = await ctx.supabase
        .rpc('top_produtos_vendidos', {
          limite: 5,
          data_inicio: undefined,
          data_fim: undefined,
        });

      if (erroHoje || erroMes || erroPendentes || erroClientes) {
        throw new Error('Erro ao buscar dados do dashboard');
      }

      const totalVendasHoje = vendasHoje?.reduce((acc, v) => acc + (v.total || 0), 0) || 0;
      const totalVendasMes = vendasMes?.reduce((acc, v) => acc + (v.total || 0), 0) || 0;
      
      // Agrupar vendas por dia
      const vendasPorDia = vendasSemana?.reduce((acc: any, v: any) => {
        const data = v.data;
        if (!acc[data]) {
          acc[data] = 0;
        }
        acc[data] += v.total || 0;
        return acc;
      }, {}) || {};

      return {
        vendasHoje: totalVendasHoje,
        vendasMes: totalVendasMes,
        pedidosPendentes: pedidosPendentes || 0,
        totalClientes: totalClientes || 0,
        vendasSemana: vendasPorDia,
        ultimosPedidos: ultimosPedidos || [],
        topProdutos: topProdutos || [],
      };
    }),

  // Relatório anual
  relatorioAnual: publicProcedure
    .input(
      z.object({
        ano: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('relatorio_vendas_anual', {
        ano: input.ano,
      });

      if (error) throw new Error(error.message);
      return data;
    }),
});
