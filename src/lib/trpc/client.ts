import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: SuperJSON,
    }),
  ],
});
