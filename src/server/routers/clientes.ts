import { z } from 'zod';
import { router, publicProcedure } from '@/lib/trpc/server';

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
        limit: z.number().min(1).max(100).default(50),
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

      return {
        clientes: data || [],
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

      if (enderecosError) {
        // Se houver erro ao buscar endereços, retorna só o cliente sem endereços
        return { ...cliente, enderecos: [] };
      }

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
        endereco: z
          .object({
            logradouro: z.string().min(1),
            cep: z.string().max(20).optional(),
            principal: z.boolean().default(true),
          })
          .optional(),
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
        endereco: z
          .object({
            logradouro: z.string().min(1),
            numero: z.string().optional(),
            complemento: z.string().optional(),
            bairro: z.string().optional(),
            cidade: z.string().optional(),
            estado: z.string().max(2).optional(),
            cep: z.string().max(20).optional(),
            principal: z.boolean().default(true),
          })
          .optional(),
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
        // Verificar se já existe um endereço principal
        const { data: enderecoExistente } = await ctx.supabase
          .from('enderecos')
          .select('id')
          .eq('cliente_id', id)
          .eq('principal', true)
          .single();

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
