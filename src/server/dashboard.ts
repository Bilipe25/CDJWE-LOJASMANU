import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { executarRPC } from './rpc';
import { buscarTodosFiltrados } from '@/lib/utils/documentos';

type Pedido = Database['public']['Views']['vw_pedidos_completos']['Row'];
type Item = Database['public']['Views']['vw_itens_pedido_completos']['Row'];
export function referenciaDashboard(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(agora);
  const parte = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  const hoje = `${parte('year')}-${parte('month')}-${parte('day')}`;
  const dias = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(`${hoje}T12:00:00Z`); dia.setUTCDate(dia.getUTCDate() - 6 + i);
    return dia.toISOString().slice(0, 10);
  });
  return { hoje, inicioMes: hoje.slice(0, 7) + '-01', dias };
}

export async function consultarDashboard(supabase: SupabaseClient<Database>, agora = new Date()) {
  const { hoje, inicioMes, dias } = referenciaDashboard(agora);
  const inicio = inicioMes < dias[0] ? inicioMes : dias[0];
  const listar = async (filtros: Database['public']['Functions']['pdv_listar_pedidos']['Args']['p_filtros'], offset: number, limit: number) =>
    await executarRPC(supabase, 'pdv_listar_pedidos', { p_filtros: filtros, p_offset: offset, p_limite: limit }) as { pedidos: Pedido[]; total: number };
  // Existing protected RPCs aggregate before pagination; no new database migration is needed.
  const [vendas, pendentes, clientes, recentes] = await Promise.all([
    buscarTodosFiltrados<Pedido>((offset, limit) => listar({ status: 'FINALIZADO', tipoAtendimento: 'ENTRADA', dataInicio: inicio, dataFim: hoje }, offset, limit)),
    executarRPC(supabase, 'pdv_estatisticas_pedidos', { p_filtros: { status: 'PENDENTE' } }) as Promise<{ pendentes: number }>,
    executarRPC(supabase, 'pdv_estatisticas_clientes', {}) as Promise<{ ativos: number }>,
    listar({ dataFim: hoje }, 0, 5),
  ]);
  const vendasMes = vendas.filter(p => p.data && p.data >= inicioMes);
  const soma = (registros: Pedido[]) => registros.reduce((total, p) => total + Math.round(Number(p.total ?? 0) * 100), 0) / 100;
  const produtos = new Map<string, { produto_id: string; produto_nome: string; categoria_nome: string | null; unidade: string; quantidade_vendida: number }>();
  // Small ID batches avoid oversized URLs, and item pages avoid the API's max_rows truncation.
  for (let i = 0; i < vendasMes.length; i += 50) {
    const ids = vendasMes.slice(i, i + 50).map(p => p.id!);
    const itens = await buscarTodosFiltrados<Item>(async (offset, limit) => {
      const { data, error, count } = await supabase.from('vw_itens_pedido_completos')
        .select('id, produto_id, produto_nome, categoria_nome, produto_unidade, quantidade', { count: 'exact' })
        .in('pedido_id', ids).order('id').range(offset, offset + limit - 1);
      if (error) throw new Error('Não foi possível consultar os produtos vendidos. Tente novamente.');
      if (count === null) throw new Error('A consulta de produtos não retornou a contagem completa.');
      return { pedidos: data as Item[], total: count };
    });
    for (const item of itens) {
      if (!item.produto_id) throw new Error('Item vendido sem identificação do produto.');
      const produto = produtos.get(item.produto_id) ?? { produto_id: item.produto_id, produto_nome: item.produto_nome || 'Produto sem nome', categoria_nome: item.categoria_nome, unidade: item.produto_unidade || '', quantidade_vendida: 0 };
      produto.quantidade_vendida += Number(item.quantidade ?? 0);
      produtos.set(item.produto_id, produto);
    }
  }
  return {
    dataReferencia: hoje, inicioMes,
    vendasHoje: soma(vendas.filter(p => p.data === hoje)), vendasMes: soma(vendasMes),
    pedidosPendentes: Number(pendentes.pendentes), totalClientes: Number(clientes.ativos),
    serieSemana: dias.map(data => ({ data, vendas: soma(vendas.filter(p => p.data === data)) })),
    ultimosPedidos: recentes.pedidos.map(p => ({ id: p.id!, numero: p.numero, cliente_nome: p.cliente_nome, data: p.data, status: p.status, total: p.total, tipo_atendimento_nome: p.tipo_atendimento_nome })),
    topProdutos: Array.from(produtos.values()).map(p => ({ ...p, quantidade_vendida: Math.round(p.quantidade_vendida * 1000) / 1000 }))
      .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida || a.produto_nome.localeCompare(b.produto_nome, 'pt-BR') || a.produto_id.localeCompare(b.produto_id)).slice(0, 5),
  };
}
