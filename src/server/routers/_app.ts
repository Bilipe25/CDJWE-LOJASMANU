import { router, protectedProcedure } from '@/lib/trpc/server';
import { produtosRouter } from './produtos';
import { clientesRouter } from './clientes';
import { pedidosRouter } from './pedidos';
import { dominiosRouter } from './dominios';
import { relatoriosRouter } from './relatorios';
import { configuracoesRouter } from './configuracoes';

export const appRouter = router({
  auth: router({ me: protectedProcedure.query(({ ctx }) => ({ id: ctx.user.id, papel: ctx.role })) }),
  produtos: produtosRouter,
  clientes: clientesRouter,
  pedidos: pedidosRouter,
  dominios: dominiosRouter,
  relatorios: relatoriosRouter,
  configuracoes: configuracoesRouter,
});

export type AppRouter = typeof appRouter;
