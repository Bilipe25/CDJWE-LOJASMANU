import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/server';
import { enderecoSchema } from '@/lib/schemas/endereco';
import { formatarEndereco, selecionarEndereco } from '@/lib/utils/endereco';
import { executarRPC } from '@/server/rpc';
import type { Database } from '@/types/supabase';

export const clientesRouter = router({
  // Estatísticas gerais de clientes
  stats: protectedProcedure.query(async ({ ctx }) => {
    const data = await executarRPC(ctx.supabase, 'pdv_estatisticas_clientes', {});
    return data as { total: number; ativos: number; totalPedidos: number; valorTotalCompras: number };
  }),

  // Listar clientes
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('vw_clientes_completos')
        .select('*', { count: 'exact' })
        .eq('ativo', true)
        .range(input.offset, input.offset + input.limit - 1)
        .order('nome');

      if (input.search) {
        query = query.or(
          `nome.ilike.%${input.search}%,cpf.ilike.%${input.search}%,telefone.ilike.%${input.search}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw new Error(error.message);

      // Remover duplicatas baseado no ID (garantir que cada cliente apareça apenas uma vez)
      const clientesUnicos = data ? 
        Array.from(new Map(data.map((cliente: any) => [cliente.id, cliente])).values()) 
        : [];

      // Busca em lote: as views antigas podem expor somente o logradouro.
      const ids = clientesUnicos.map((cliente) => cliente.id).filter((id): id is string => !!id);
      const totais = ids.length ? await executarRPC(ctx.supabase, 'pdv_totais_clientes', { p_ids: ids }) as { cliente_id: string; total_pedidos: number; valor_total_compras: number }[] : [];
      const totaisPorCliente = new Map(totais.map(item => [item.cliente_id,item]));
      const { data: enderecos, error: enderecosError } = ids.length
        ? await ctx.supabase.from('enderecos').select('*').in('cliente_id', ids).order('principal', { ascending: false })
        : { data: [], error: null };
      if (enderecosError) throw new Error(enderecosError.message);
      const enderecosPorCliente = new Map<string, Database['public']['Tables']['enderecos']['Row'][]>();
      for (const endereco of enderecos || []) {
        const grupo = enderecosPorCliente.get(endereco.cliente_id) || [];
        grupo.push(endereco);
        enderecosPorCliente.set(endereco.cliente_id, grupo);
      }

      return {
        clientes: clientesUnicos.map((cliente) => {
          const enderecosCliente = enderecosPorCliente.get(cliente.id) || [];
          return { ...cliente, total_pedidos: totaisPorCliente.get(cliente.id!)?.total_pedidos ?? 0, valor_total_compras: totaisPorCliente.get(cliente.id!)?.valor_total_compras ?? 0, endereco_principal_completo: formatarEndereco(selecionarEndereco(enderecosCliente)) };
        }),
        total: count || 0,
      };
    }),

  // Buscar cliente por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Buscar dados do cliente
      const { data: cliente, error: clienteError } = await ctx.supabase
        .from('clientes')
        .select('*')
        .eq('id', input.id)
        .single();

      if (clienteError) throw new Error(clienteError.message);

      // Buscar endereços do cliente
      const { data: enderecos, error: enderecosError } = await ctx.supabase
        .from('enderecos')
        .select('*')
        .eq('cliente_id', input.id)
        .order('principal', { ascending: false });

      if (enderecosError) throw new Error(enderecosError.message);

      return { ...cliente, enderecos: enderecos || [] };
    }),

  // Criar cliente
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1).max(200),
        cpf: z.string().max(14).optional(),
        telefone: z.string().max(20).optional(),
        email: z.string().email().max(255).optional(),
        ativo: z.boolean().default(true),
        endereco: enderecoSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executarRPC(ctx.supabase, 'pdv_salvar_cliente', { p_dados: input }) as Database['public']['Tables']['clientes']['Row'];
    }),

  // Atualizar cliente
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(200).optional(),
        cpf: z.string().max(14).optional(),
        telefone: z.string().max(20).optional(),
        email: z.string().email().max(255).optional(),
        ativo: z.boolean().optional(),
        endereco: enderecoSchema.optional(),
      })
    )
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
