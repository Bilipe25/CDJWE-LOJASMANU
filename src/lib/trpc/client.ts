import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { supabase } from '@/lib/supabase/client';
import SuperJSON from 'superjson';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      async headers() {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: 'Bearer ' + data.session.access_token } : {};
      },
      transformer: SuperJSON,
    }),
  ],
});
