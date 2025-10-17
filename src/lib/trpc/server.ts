import { initTRPC } from '@trpc/server';
import { supabase } from '@/lib/supabase/client';
import SuperJSON from 'superjson';

export const createTRPCContext = async () => {
  return {
    supabase,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
