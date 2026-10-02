import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { enderecoSnapshotSchema } from '@/lib/schemas/endereco';
import { executarRPC } from '@/server/rpc';
import { totaisPedido } from '@/lib/utils/valores-pedido';
import type { Database } from '@/types/supabase';
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc/server';

const itemPedidoSchema = z.object({
  produto_id: z.string().uuid(),
  cor_id: z.string().uuid().optional(),
  quantidade: z.number().finite().min(0.001),
  valor_unitario: z.number().finite().min(0),
  desconto_valor: z.number().finite().min(0).default(0),
  ordem: z.number().int().min(0).default(0),
}).refine(item => item.desconto_valor <= Math.round(item.quantidade * item.valor_unitario * 100) / 100, { message: 'O desconto do item não pode superar seu valor', path: ['desconto_valor'] });

export type PedidoListado = Omit<Database['public']['Views']['vw_pedidos_completos']['Row'], 'id'> & { id: string };
type PedidoRow = Database['public']['Tables']['pedidos']['Row'];
const filtrosSchema = z.object({
  limit: z.number().int().min(1).max(10000).default(50), offset: z.number().int().min(0).default(0),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['PENDENTE','CONFIRMADO','CANCELADO','FINALIZADO']).optional().or(z.literal('')).transform(v => v || undefined),
  dataInicio: z.string().optional().transform(v => v || undefined), dataFim: z.string().optional().transform(v => v || undefined),
  tipoAtendimento: z.string().optional().transform(v => v || undefined),
  formaPagamentoId: z.string().uuid().optional(), clienteId: z.string().uuid().optional(),
  ordenarPor: z.enum(['data','numero','total']).optional(),
  direcao: z.enum(['asc','desc']).default('desc'),
});
const periodoValido = (f: { dataInicio?: string; dataFim?: string }) => !f.dataInicio || !f.dataFim || f.dataInicio <= f.dataFim;
const erroPeriodo = { message: 'A data final deve ser igual ou posterior à data inicial.', path: ['dataFim'] };
const identidadeSchema = z.object({ id: z.string().uuid(), versao: z.number().int().positive() });

export const pedidosRouter = router({
  // Listar pedidos
  list: protectedProcedure
    .input(filtrosSchema.refine(periodoValido, erroPeriodo))
    .query(async ({ ctx, input }) => {
      const { limit, offset, ordenarPor, direcao, ...filtros } = input;
      const resultado: { pedidos: (Database['public']['Views']['vw_pedidos_completos']['Row'] & { cpf?: string | null; telefone?: string | null })[]; total: number } = ordenarPor ? await (async () => {
        // A RPC retorna uma relação protegida por RLS; PostgREST ordena antes do range.
        const { data, error, count } = await ctx.supabase.rpc('pdv_filtrar_pedidos', { p_filtros: filtros }, { count: 'exact' })
          .select('*').order(ordenarPor, { ascending: direcao === 'asc', nullsFirst: false })
          .order('id', { ascending: direcao === 'asc' }).range(offset, offset + limit - 1);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não foi possível ordenar os pedidos. Tente novamente.', cause: error });
        return { pedidos: data || [], total: count ?? 0 };
      })() : await executarRPC(ctx.supabase, 'pdv_listar_pedidos', {
        p_filtros: filtros, p_limite: limit, p_offset: offset,
      }) as { pedidos: (Database['public']['Views']['vw_pedidos_completos']['Row'] & { cpf?: string | null; telefone?: string | null })[]; total: number };
      return { total: resultado.total, pedidos: resultado.pedidos.map(pedido => {
        if (!pedido.id) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pedido sem identificação na consulta.' });
        return { ...pedido, id: pedido.id, cliente_cpf: pedido.cliente_cpf ?? pedido.cpf ?? null, cliente_telefone: pedido.cliente_telefone ?? pedido.telefone ?? null };
      }) };
    }),

  // Listar pedidos por cliente
  listByCliente: protectedProcedure
    .input(
      z.object({
        clienteId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error, count } = await ctx.supabase
        .from('pedidos')
        .select('id, numero, data, status, total', { count: 'exact' })
        .eq('cliente_id', input.clienteId)
        .order('data', { ascending: false }).order('id').range(input.offset, input.offset + input.limit - 1);

      if (error) throw new Error(error.message);

      return { pedidos: data || [], total: count ?? 0 };
    }),

  // Buscar pedido por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: pedido, error: pedidoError } = await ctx.supabase
        .from('vw_pedidos_completos')
        .select('*')
        .eq('id', input.id)
        .single();

      if (pedidoError) throw new Error(pedidoError.message);
      if (!pedido?.id) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pedido não encontrado' });

      const { data: meta, error: metaError } = await ctx.supabase.from('pedidos').select('versao, finalizado_em, telefone_contato, endereco_snapshot').eq('id', input.id).single();
      if (metaError) throw new Error(metaError.message);
      const { data: contato, error: contatoError } = pedido.cliente_id
        ? await ctx.supabase.from('clientes').select('cpf, telefone').eq('id', pedido.cliente_id).single()
        : { data: null, error: null };
      if (contatoError) throw new Error(contatoError.message);
      const snapshot = enderecoSnapshotSchema.safeParse(meta.endereco_snapshot);
      // Snapshot conserva a impressão mesmo quando o cadastro muda.
      const { data: endereco, error: enderecoError } = pedido.endereco_id && !snapshot.success
        ? await ctx.supabase.from('enderecos').select('*').eq('id', pedido.endereco_id).single()
        : { data: null, error: null };
      if (enderecoError) throw new Error(enderecoError.message);

      const { data: itens, error: itensError } = await ctx.supabase
        .from('vw_itens_pedido_completos')
        .select('*')
        .eq('pedido_id', input.id)
        .order('ordem');

      if (itensError) throw new Error(itensError.message);

      return {
        ...pedido,
        id: pedido.id,
        ...meta,
        cliente_cpf: contato?.cpf ?? null, cliente_telefone: contato?.telefone ?? null,
        endereco: snapshot.success ? snapshot.data : endereco,
        itens: itens || [],
      };
    }),

  // A numeração é atribuída somente na gravação transacional.
  create: protectedProcedure.input(z.object({
    chave_requisicao: z.string().uuid(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cliente_id: z.string().uuid().nullable().optional(), endereco_id: z.string().uuid().nullable().optional(),
    tipo_atendimento_id: z.string().uuid(), forma_pagamento_id: z.string().uuid().nullable().optional(),
    telefone_contato: z.string().max(20).nullable().optional(), desconto_valor: z.number().finite().min(0).default(0),
    subtotal: z.number().finite().min(0).optional(), total: z.number().finite().min(0).optional(),
    descricao: z.string().optional(), observacao: z.string().nullable().optional(),
    status: z.enum(['PENDENTE','CONFIRMADO']).default('PENDENTE'), itens: z.array(itemPedidoSchema).default([]),
  })).mutation(async ({ ctx, input }) => {
    const { chave_requisicao, ...dados } = input;
    if (dados.itens.length) {
      try { Object.assign(dados, totaisPedido(dados.itens, dados.desconto_valor)); }
      catch (erro) { throw new TRPCError({ code: 'BAD_REQUEST', message: (erro as Error).message }); }
    }
    return await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'criar', p_dados: dados, p_chave: chave_requisicao }) as PedidoRow;
  }),
  update: protectedProcedure.input(identidadeSchema.extend({
    cliente_id: z.string().uuid().nullable().optional(), endereco_id: z.string().uuid().nullable().optional(),
    tipo_atendimento_id: z.string().uuid().optional(), forma_pagamento_id: z.string().uuid().nullable().optional(),
    telefone_contato: z.string().max(20).nullable().optional(), desconto_valor: z.number().finite().min(0).optional(),
    total: z.number().finite().min(0).optional(), subtotal: z.number().finite().min(0).optional(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), descricao: z.string().optional(), observacao: z.string().nullable().optional(),
    status: z.enum(['PENDENTE','CONFIRMADO']).optional(), itens: z.array(itemPedidoSchema).optional(),
  })).mutation(async ({ ctx, input }) => {
    const { id, versao, ...dados } = input;
    return await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'editar', p_id: id, p_versao: versao, p_dados: dados }) as PedidoRow;
  }),
  addItem: protectedProcedure.input(z.object({ pedido_id: z.string().uuid(), versao: z.number().int().positive(), item: itemPedidoSchema }))
    .mutation(async ({ ctx, input }) => await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'adicionar_item', p_id: input.pedido_id, p_versao: input.versao, p_dados: { item: input.item } }) as Database['public']['Tables']['itens_pedido']['Row']),
  updateItem: protectedProcedure.input(identidadeSchema.extend({ quantidade: z.number().finite().min(0.001).optional(), valor_unitario: z.number().finite().min(0).optional(), desconto_valor: z.number().finite().min(0).optional(), cor_id: z.string().uuid().nullable().optional() }))
    .mutation(async ({ ctx, input }) => { const { id, versao, ...dados } = input; return await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'atualizar_item', p_item_id: id, p_versao: versao, p_dados: dados }) as Database['public']['Tables']['itens_pedido']['Row']; }),
  removeItem: protectedProcedure.input(identidadeSchema).mutation(async ({ ctx, input }) => {
    await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'remover_item', p_item_id: input.id, p_versao: input.versao }); return { success: true };
  }),
  estatisticas: protectedProcedure.input(filtrosSchema.omit({ limit: true, offset: true }).refine(periodoValido, erroPeriodo))
    .query(async ({ ctx, input }) => await executarRPC(ctx.supabase, 'pdv_estatisticas_pedidos', { p_filtros: input }) as { total: number; valorTotal: number; pendentes: number; finalizadas: number; canceladas: number; finalizadosHoje: number }),
  duplicar: protectedProcedure.input(identidadeSchema.extend({ chave_requisicao: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const pedido = await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'duplicar', p_id: input.id, p_versao: input.versao, p_chave: input.chave_requisicao }) as PedidoRow;
    return pedido.id;
  }),
  cancelar: protectedProcedure.input(identidadeSchema).mutation(async ({ ctx, input }) => await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'cancelar', p_id: input.id, p_versao: input.versao }) as PedidoRow),
  finalizar: protectedProcedure.input(identidadeSchema).mutation(async ({ ctx, input }) => await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'finalizar', p_id: input.id, p_versao: input.versao }) as PedidoRow),
  delete: adminProcedure.input(identidadeSchema).mutation(async ({ ctx, input }) => {
    await executarRPC(ctx.supabase, 'pdv_mutar_pedido', { p_acao: 'excluir', p_id: input.id, p_versao: input.versao }); return { success: true };
  }),
});
