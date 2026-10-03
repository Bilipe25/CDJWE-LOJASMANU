import { z } from 'zod';
import { deslocarDataCivil, hojeFinanceiro } from './financeiro';

export const periodoDashboardSchema = z.object({
  periodo: z.enum(['mes', '7dias', '30dias']).default('mes'),
}).default({ periodo: 'mes' });
export type PeriodoDashboard = z.infer<typeof periodoDashboardSchema>['periodo'];

export function intervalosDashboard(periodo: PeriodoDashboard, agora = new Date()) {
  const hoje = hojeFinanceiro(agora);
  if (periodo !== 'mes') {
    const quantidade = periodo === '7dias' ? 7 : 30;
    const inicio = deslocarDataCivil(hoje, 1 - quantidade);
    const fimAnterior = deslocarDataCivil(inicio, -1);
    return { hoje, atual: { dataInicio: inicio, dataFim: hoje }, anterior: {
      dataInicio: deslocarDataCivil(fimAnterior, 1 - quantidade), dataFim: fimAnterior,
    } };
  }
  const data = new Date(hoje + 'T12:00:00Z');
  const ano = data.getUTCFullYear(), mes = data.getUTCMonth();
  const inicioAnterior = new Date(Date.UTC(ano, mes - 1, 1, 12)).toISOString().slice(0, 10);
  const ultimoDiaAnterior = new Date(Date.UTC(ano, mes, 0, 12)).getUTCDate();
  return { hoje, atual: { dataInicio: hoje.slice(0, 7) + '-01', dataFim: hoje }, anterior: {
    dataInicio: inicioAnterior,
    dataFim: deslocarDataCivil(inicioAnterior, Math.min(data.getUTCDate(), ultimoDiaAnterior) - 1),
  } };
}

export function datasDashboard(inicio: string, fim: string) {
  const datas: string[] = [];
  for (let data = inicio; data <= fim; data = deslocarDataCivil(data, 1)) datas.push(data);
  return datas;
}

export function variacaoDashboard(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}
