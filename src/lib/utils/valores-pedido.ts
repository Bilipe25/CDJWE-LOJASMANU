export function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export interface ItemValor { quantidade: number; valor_unitario: number; desconto_valor: number }
export function totalItem(item: ItemValor): number {
  if (!Number.isFinite(item.quantidade) || item.quantidade < 0.001 || !Number.isFinite(item.valor_unitario) || item.valor_unitario < 0 || !Number.isFinite(item.desconto_valor) || item.desconto_valor < 0) {
    throw new Error('Informe quantidade, preço e desconto válidos.');
  }
  const bruto = arredondarMoeda(item.quantidade * item.valor_unitario);
  if (item.desconto_valor > bruto) throw new Error('O desconto do item não pode superar seu valor.');
  return arredondarMoeda(bruto - item.desconto_valor);
}

export function totaisPedido(itens: ItemValor[], desconto: number) {
  const subtotal = arredondarMoeda(itens.reduce((soma, item) => soma + totalItem(item), 0));
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > subtotal) throw new Error('O desconto geral não pode superar o subtotal.');
  return { subtotal, total: arredondarMoeda(subtotal - desconto) };
}
