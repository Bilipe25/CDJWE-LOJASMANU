import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import SuperJSON from 'superjson';
export const createTRPCContext = async (req: Request) => {
  const token = /^Bearer (\S+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: token ? { Authorization: 'Bearer ' + token } : {} },
  });
  if (!token) return { supabase, user: null, role: null };
  const { data, error } = await supabase.auth.getUser(token);
  if (error && (!error.status || error.status >= 500)) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'Não foi possível verificar a sessão. Tente novamente quando o serviço responder.' });
  if (error || !data.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada. Entre novamente.' });
  const { data: operator, error: permissionError } = await supabase.from('pdv_operadores').select('papel').eq('user_id', data.user.id).eq('ativo', true).maybeSingle();
  if (permissionError) throw new TRPCError({ code: 'SERVICE_UNAVAILABLE', message: 'Não foi possível verificar o acesso ao PDV. Tente novamente.' });
  if (!operator) throw new TRPCError({ code: 'FORBIDDEN', message: 'Conta sem acesso ao PDV. Contate o administrador.' });
  return { supabase, user: data.user, role: operator.papel };
};
const t = initTRPC.context<typeof createTRPCContext>().create({ transformer: SuperJSON });
export const router = t.router;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Entre para acessar o sistema.' });
  if (!ctx.role) throw new TRPCError({ code: 'FORBIDDEN', message: 'Conta sem acesso ao PDV.' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.role !== 'ADMIN') throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta operação requer um administrador.' });
  return next();
});
export const createCallerFactory = t.createCallerFactory;
