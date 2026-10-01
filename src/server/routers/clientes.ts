import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/server';
import { enderecoSchema } from '@/lib/schemas/endereco';
import { formatarEndereco, selecionarEndereco } from '@/lib/utils/endereco';
import type { Database } from '@/types/supabase';

export const clientesRouter = router({
  // Estatísticas gerais de clientes
  stats: publicProcedure.query(async ({ ctx }) => {
    // Total de clientes (ativos e inativos)
    const { count: total, error: errorTotal } = await ctx.supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });

    if (errorTotal) throw new Error(errorTotal.message);

    // Total de clientes ativos
    const { count: ativos, error: errorAtivos } = await ctx.supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    if (errorAtivos) throw new Error(errorAtivos.message);

    // Buscar estatísticas de pedidos
    const { data: pedidos, error: errorPedidos } = await ctx.supabase
      .from('pedidos')
      .select('cliente_id, total')
      .not('cliente_id', 'is', null);

    if (errorPedidos) throw new Error(errorPedidos.message);

    const totalPedidos = pedidos?.length || 0;
    const valorTotalCompras = pedidos?.reduce((sum: number, p: any) => sum + (p.total || 0), 0) || 0;

    return {
      total: total || 0,
      ativos: ativos || 0,
      totalPedidos,
      valorTotalCompras,
    };
  }),

  // Listar clientes
  list: publicProcedure
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
      const ids = clientesUnicos.map((cliente) => cliente.id).filter(Boolean);
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
          return { ...cliente, endereco_principal_completo: formatarEndereco(selecionarEndereco(enderecosCliente)) };
        }),
        total: count || 0,
      };
    }),

  // Buscar cliente por ID
  getById: publicProcedure
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
  create: publicProcedure
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
      const { endereco, ...clienteData } = input;

      // Criar cliente
      const { data: cliente, error: clienteError } = await ctx.supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (clienteError) throw new Error(clienteError.message);

      // Criar endereço se fornecido
      if (endereco && cliente) {
        const { error: enderecoError } = await ctx.supabase
          .from('enderecos')
          .insert({
            cliente_id: cliente.id,
            ...endereco,
          });

        if (enderecoError) throw new Error(enderecoError.message);
      }

      return cliente;
    }),

  // Atualizar cliente
  update: publicProcedure
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
      const { id, endereco, ...updateData } = input;
      
      // Atualizar dados do cliente
      const { data: cliente, error: clienteError } = await ctx.supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (clienteError) throw new Error(clienteError.message);

      // Atualizar ou criar endereço se fornecido
      if (endereco && cliente) {
        // Usar o mesmo endereço exibido na edição: principal, ou primeiro disponível.
        const { data: enderecosExistentes, error: buscaError } = await ctx.supabase
          .from('enderecos')
          .select('*')
          .eq('cliente_id', id)
          .order('principal', { ascending: false });
        if (buscaError) throw new Error(buscaError.message);
        const enderecoExistente = selecionarEndereco(enderecosExistentes || []);

        if (enderecoExistente) {
          // Atualizar endereço existente
          const { error: enderecoError } = await ctx.supabase
            .from('enderecos')
            .update(endereco)
            .eq('id', enderecoExistente.id);

          if (enderecoError) throw new Error(enderecoError.message);
        } else {
          // Criar novo endereço
          const { error: enderecoError } = await ctx.supabase
            .from('enderecos')
            .insert({
              cliente_id: id,
              ...endereco,
            });

          if (enderecoError) throw new Error(enderecoError.message);
        }
      }

      return cliente;
    }),

  // Desativar cliente
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('clientes')
        .update({ ativo: false })
        .eq('id', input.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
