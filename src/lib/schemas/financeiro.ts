import { z } from 'zod';

export function dataCivilValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}
export const dataFinanceiraSchema = z.string().refine(dataCivilValida, 'Informe uma data válida.');
export const periodoFinanceiroSchema = z.object({ dataInicio: dataFinanceiraSchema, dataFim: dataFinanceiraSchema })
  .refine(p => p.dataInicio <= p.dataFim, { message: 'A data final deve ser igual ou posterior à inicial.', path: ['dataFim'] });
export const anoFinanceiroSchema = z.number().int().min(1900).max(2100);
export function hojeFinanceiro(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(agora);
  return ['year', 'month', 'day'].map(tipo => partes.find(p => p.type === tipo)!.value).join('-');
}
export function deslocarDataCivil(data: string, dias: number) {
  const valor = new Date(`${data}T12:00:00Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}
export function centavos(valor: number | null | undefined) {
  const resultado = centavosMovimento(valor);
  if (resultado < 0) throw new Error('Valor financeiro inválido. Confira os registros da consulta.');
  return resultado;
}
// Movimentos históricos conservam o sinal; cadastros novos continuam não negativos.
export function centavosMovimento(valor: number | null | undefined) {
  const resultado = Math.round(Number(valor ?? 0) * 100);
  if (!Number.isSafeInteger(resultado)) throw new Error('Valor financeiro inválido. Confira os registros da consulta.');
  return resultado;
}
// Rateio em centavos com maior resto; desempate estável pela ordem dos itens.
export function ratearCentavos(total: number, pesos: number[]) {
  if (!Number.isSafeInteger(total) || total < 0 || pesos.some(p => !Number.isSafeInteger(p) || p < 0)) throw new Error('Valores inválidos para rateio.');
  const soma = pesos.reduce((s, p) => s + BigInt(p), BigInt(0));
  if (soma === BigInt(0)) { if (total !== 0) throw new Error('Venda sem valores de itens para distribuir.'); return pesos.map(() => 0); }
  const parcelas = pesos.map((p, indice) => { const produto = BigInt(total) * BigInt(p); return { indice, valor: Number(produto / soma), resto: produto % soma }; });
  let sobra = total - parcelas.reduce((s, p) => s + p.valor, 0);
  for (const p of [...parcelas].sort((a, b) => a.resto === b.resto ? a.indice - b.indice : a.resto > b.resto ? -1 : 1)) {
    if (sobra-- <= 0) break;
    p.valor++;
  }
  return parcelas.map(p => p.valor);
}
