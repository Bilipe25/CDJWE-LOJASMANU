import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { executarRPC } from './rpc';
import { buscarTodosFiltrados } from '@/lib/utils/documentos';
import { centavos, ratearCentavos } from '@/lib/schemas/financeiro';
type Banco = SupabaseClient<Database>;
type Pedido = Database['public']['Views']['vw_pedidos_completos']['Row'];
type Item = Database['public']['Views']['vw_itens_pedido_completos']['Row'];
type Filtros = Database['public']['Functions']['pdv_listar_pedidos']['Args']['p_filtros'];
export async function listarFinanceiroCompleto(banco: Banco, filtros: Filtros) {
  return buscarTodosFiltrados<Pedido>(async (offset, limit) => await executarRPC(banco, 'pdv_listar_pedidos', {
    p_filtros: filtros, p_offset: offset, p_limite: limit,
  }) as { pedidos: Pedido[]; total: number });
}
export async function consultarEstatisticasSaidas(banco: Banco, filtros: Filtros) {
  const pedidos = await listarFinanceiroCompleto(banco, { ...(filtros as object), tipoAtendimento: 'SAIDA' });
  const porStatus = (status: string) => pedidos.filter(p => p.status === status);
  const valor = (lista: Pedido[]) => lista.reduce((s, p) => s + centavos(p.total), 0) / 100;
  return { total: pedidos.length, valorFinalizado: valor(porStatus('FINALIZADO')), valorPendente: valor([...porStatus('PENDENTE'), ...porStatus('CONFIRMADO')]), valorCancelado: valor(porStatus('CANCELADO')), finalizadas: porStatus('FINALIZADO').length, pendentes: porStatus('PENDENTE').length, confirmadas: porStatus('CONFIRMADO').length, canceladas: porStatus('CANCELADO').length };
}
export interface ProdutoFinanceiro {
  produto_id: string; produto_nome: string; categoria_nome: string; unidade: string;
  quantidade_vendida: number; total_vendas: number; valor_total: number;
}
export interface PeriodoFinanceiro {
  dataInicio: string; dataFim: string; dias: { data: string; total_pedidos: number; total_itens: number; valor_total: number }[];
  produtos: ProdutoFinanceiro[]; categorias: { nome: string; valor: number }[];
  resumo: { totalVendas: number; totalPedidos: number; totalUnidades: number; ticketMedio: number; valorSemItens: number };
}
export async function consultarPeriodoFinanceiro(banco: Banco, dataInicio: string, dataFim: string): Promise<PeriodoFinanceiro> {
  const vendas = await listarFinanceiroCompleto(banco, { status: 'FINALIZADO', tipoAtendimento: 'ENTRADA', dataInicio, dataFim });
  const itensPorPedido = new Map<string, Item[]>();
  for (let i = 0; i < vendas.length; i += 50) {
    const ids = vendas.slice(i, i + 50).map(p => p.id!);
    const itens = await buscarTodosFiltrados<Item>(async (offset, limit) => {
      const { data, error, count } = await banco.from('vw_itens_pedido_completos').select('*', { count: 'exact' })
        .in('pedido_id', ids).order('id').range(offset, offset + limit - 1);
      if (error || count === null) throw new Error('Não foi possível consultar todos os itens vendidos. Tente novamente.');
      return { pedidos: data ?? [], total: count };
    });
    for (const item of itens) {
      if (!item.pedido_id || !item.produto_id) throw new Error('Item vendido sem identificação. Confira o cadastro.');
      const grupo = itensPorPedido.get(item.pedido_id) ?? []; grupo.push(item); itensPorPedido.set(item.pedido_id, grupo);
    }
  }
  const dias = new Map<string, { data: string; total_pedidos: number; total_itens: number; centavos: number }>();
  const produtos = new Map<string, ProdutoFinanceiro & { centavos: number; pedidos: Set<string> }>();
  const categorias = new Map<string, number>();
  let totalCentavos = 0, unidades = 0, semItens = 0;
  for (const pedido of vendas) {
    if (!pedido.id || !pedido.data) throw new Error('Venda sem identificação ou data.');
    const itens = itensPorPedido.get(pedido.id) ?? [];
    const total = centavos(pedido.total); totalCentavos += total;
    const dia = dias.get(pedido.data) ?? { data: pedido.data, total_pedidos: 0, total_itens: 0, centavos: 0 };
    dia.total_pedidos++; dia.centavos += total;
    if (!itens.length) { semItens += total; categorias.set('Sem itens detalhados', (categorias.get('Sem itens detalhados') ?? 0) + total); }
    else {
      const valores = ratearCentavos(total, itens.map(i => centavos(i.valor_total)));
      itens.forEach((item, indice) => {
        const quantidade = Number(item.quantidade ?? 0);
        if (!Number.isFinite(quantidade) || quantidade < 0) throw new Error('Quantidade inválida no relatório.');
        dia.total_itens += quantidade; unidades += quantidade;
        const categoria = item.categoria_nome || 'Sem categoria';
        const produto = produtos.get(item.produto_id!) ?? { produto_id: item.produto_id!, produto_nome: item.produto_nome || 'Produto sem nome', categoria_nome: categoria, unidade: item.produto_unidade || '', quantidade_vendida: 0, total_vendas: 0, valor_total: 0, centavos: 0, pedidos: new Set<string>() };
        produto.quantidade_vendida += quantidade; produto.centavos += valores[indice]; produto.pedidos.add(pedido.id!); produtos.set(item.produto_id!, produto);
        categorias.set(categoria, (categorias.get(categoria) ?? 0) + valores[indice]);
      });
    }
    dias.set(pedido.data, dia);
  }
  return { dataInicio, dataFim,
    dias: [...dias.values()].sort((a, b) => a.data.localeCompare(b.data)).map(d => ({ data: d.data, total_pedidos: d.total_pedidos, total_itens: Math.round(d.total_itens * 1000) / 1000, valor_total: d.centavos / 100 })),
    produtos: [...produtos.values()].map(({ centavos: valor, pedidos, ...p }) => ({ ...p, total_vendas: pedidos.size, quantidade_vendida: Math.round(p.quantidade_vendida * 1000) / 1000, valor_total: valor / 100 })).sort((a, b) => b.valor_total - a.valor_total || a.produto_nome.localeCompare(b.produto_nome, 'pt-BR') || a.produto_id.localeCompare(b.produto_id)),
    categorias: [...categorias].map(([nome, valor]) => ({ nome, valor: valor / 100 })).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR')),
    resumo: { totalVendas: totalCentavos / 100, totalPedidos: vendas.length, totalUnidades: Math.round(unidades * 1000) / 1000, ticketMedio: vendas.length ? Math.round(totalCentavos / vendas.length) / 100 : 0, valorSemItens: semItens / 100 },
  };
}
export interface AnualFinanceiro {
  ano: number; linhas: { natureza: 'Venda' | 'Despesa'; pagamento: string; valores: number[]; total: number }[];
  meses: { mes: number; vendas: number; despesas: number; saldo: number }[];
  vendas: number; despesas: number; saldo: number;
}
export async function consultarAnualFinanceiro(banco: Banco, ano: number): Promise<AnualFinanceiro> {
  const filtros = { status: 'FINALIZADO', dataInicio: `${ano}-01-01`, dataFim: `${ano}-12-31` };
  const [vendas, saidas] = await Promise.all([listarFinanceiroCompleto(banco, { ...filtros, tipoAtendimento: 'ENTRADA' }), listarFinanceiroCompleto(banco, { ...filtros, tipoAtendimento: 'SAIDA' })]);
  const grupos = new Map<string, { natureza: 'Venda' | 'Despesa'; pagamento: string; valores: number[] }>();
  const meses = Array.from({ length: 12 }, (_, mes) => ({ mes: mes + 1, vendas: 0, despesas: 0, saldo: 0 }));
  for (const [natureza, pedidos] of [['Venda', vendas], ['Despesa', saidas]] as const) for (const p of pedidos) {
    const mes = Number(p.data?.slice(5, 7)) - 1;
    if (!Number.isInteger(mes) || mes < 0 || mes > 11) throw new Error('Movimento financeiro sem mês válido.');
    const pagamento = natureza === 'Despesa' && p.cliente_nome?.toLocaleUpperCase('pt-BR') === 'DIZIMO' ? 'Dízimo' : p.forma_pagamento_nome || 'Não informado';
    const chave = JSON.stringify([natureza, pagamento]);
    const grupo = grupos.get(chave) ?? { natureza, pagamento, valores: Array(12).fill(0) as number[] };
    const valor = centavos(p.total); grupo.valores[mes] += valor; grupos.set(chave, grupo);
    meses[mes][natureza === 'Venda' ? 'vendas' : 'despesas'] += valor;
  }
  const totalVendas = meses.reduce((s, m) => s + m.vendas, 0), totalDespesas = meses.reduce((s, m) => s + m.despesas, 0);
  return { ano, linhas: [...grupos.values()].sort((a, b) => a.natureza === b.natureza ? a.pagamento.localeCompare(b.pagamento, 'pt-BR') : a.natureza === 'Venda' ? -1 : 1).map(g => ({ ...g, valores: g.valores.map(v => v / 100), total: g.valores.reduce((s, v) => s + v, 0) / 100 })), meses: meses.map(m => ({ mes: m.mes, vendas: m.vendas / 100, despesas: m.despesas / 100, saldo: (m.vendas - m.despesas) / 100 })), vendas: totalVendas / 100, despesas: totalDespesas / 100, saldo: (totalVendas - totalDespesas) / 100 };
}
