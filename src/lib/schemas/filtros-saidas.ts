import { filtrosPedidosSchema } from './filtros-pedidos';
import { z } from 'zod';
export const filtrosSaidasSchema = filtrosPedidosSchema.omit({ tipoAtendimento: true, ordenarPor: true, direcao: true });
export type FiltrosSaidas = z.infer<typeof filtrosSaidasSchema>;
export function validarFiltrosSaidas(valor: unknown): FiltrosSaidas {
  return filtrosSaidasSchema.parse(valor && typeof valor === 'object' ? valor : {});
}
