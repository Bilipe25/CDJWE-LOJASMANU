import { TRPCError } from '@trpc/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function executarRPC<N extends keyof Database['public']['Functions']>(
  supabase: SupabaseClient<Database>, nome: N, args: Database['public']['Functions'][N]['Args'],
) {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) {
    const code = error.code === '40001' ? 'CONFLICT' : error.code === '42501' ? 'FORBIDDEN' : error.code === 'PGRST202' || error.code === '42883' ? 'PRECONDITION_FAILED' : 'BAD_REQUEST';
    throw new TRPCError({ code, message: code === 'PRECONDITION_FAILED' ? 'O banco precisa da migração de integridade do PDV. Contate o administrador.' : error.message });
  }
  if (data === null) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'O banco não retornou o resultado da operação.' });
  return data;
}
