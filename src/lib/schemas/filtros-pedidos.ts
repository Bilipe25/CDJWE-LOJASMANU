import { z } from 'zod';
const dataCivil = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0,10) === v)).catch('');
const uuidOuVazio = z.string().uuid().or(z.literal('')).catch('');
export const filtrosPedidosSchema = z.object({
  status: z.enum(['','PENDENTE','CONFIRMADO','CANCELADO','FINALIZADO']).catch(''),
  search: z.string().trim().max(200).catch(''), dataInicio: dataCivil, dataFim: dataCivil,
  tipoAtendimento: z.enum(['','ENTRADA','SAIDA','ORÇAMENTO','S/MOVIMENTO','SEM_TIPO']).catch(''),
  formaPagamento: uuidOuVazio,
  clienteSelecionado: z.object({ id: z.string().uuid(), nome: z.string().max(200).catch('') }).nullable().catch(null),
  page: z.coerce.number().int().min(0).max(100000).catch(0),
  rowsPerPage: z.coerce.number().refine(v => [5,10,25,50,100].includes(v)).catch(10),
  filtrosExpanded: z.boolean().catch(false),
});
export type FiltrosPedidos = z.infer<typeof filtrosPedidosSchema>;
export function validarFiltrosPedidos(valor: unknown): FiltrosPedidos {
  const filtro = filtrosPedidosSchema.parse(valor && typeof valor === 'object' ? valor : {});
  if (filtro.dataInicio && filtro.dataFim && filtro.dataInicio > filtro.dataFim) { filtro.dataInicio=''; filtro.dataFim=''; }
  return filtro;
}
export function filtrosDaUrl(params: URLSearchParams) {
  let cliente: unknown = null;
  const id = params.get('filtro_clienteId');
  if (id) cliente = { id, nome: '' };
  else if (params.get('filtro_cliente')) { try { cliente = JSON.parse(decodeURIComponent(params.get('filtro_cliente')!)); } catch {} }
  return validarFiltrosPedidos({ ...Object.fromEntries(['status','search','dataInicio','dataFim','tipoAtendimento','formaPagamento','page','rowsPerPage'].map(k => [k,params.get(`filtro_${k}`) ?? undefined])), clienteSelecionado: cliente, filtrosExpanded: true });
}
export function urlComFiltros(base: string, filtros: FiltrosPedidos) {
  const [path,query] = base.split('?'); const params = new URLSearchParams(query);
  params.set('voltou_edicao','true');
  for (const key of ['status','search','dataInicio','dataFim','tipoAtendimento','formaPagamento','page','rowsPerPage'] as const) params.set(`filtro_${key}`,String(filtros[key]));
  params.delete('filtro_cliente'); params.delete('filtro_clienteId'); if (filtros.clienteSelecionado) params.set('filtro_clienteId',filtros.clienteSelecionado.id);
  return `${path}?${params}`;
}
