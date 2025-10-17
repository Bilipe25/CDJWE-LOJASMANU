import { router } from '@/lib/trpc/server';
import { produtosRouter } from './produtos';
import { clientesRouter } from './clientes';
import { pedidosRouter } from './pedidos';
import { dominiosRouter } from './dominios';
import { relatoriosRouter } from './relatorios';
import { configuracoesRouter } from './configuracoes';

export const appRouter = router({
  produtos: produtosRouter,
  clientes: clientesRouter,
  pedidos: pedidosRouter,
  dominios: dominiosRouter,
  relatorios: relatoriosRouter,
  configuracoes: configuracoesRouter,
});

export type AppRouter = typeof appRouter;
