import { trpc } from '@/lib/trpc/client';

export function useConfiguracoes() {
  const { data: config, isLoading, error, refetch } = trpc.configuracoes.get.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    }
  );

  return {
    configuracoes: config,
    isLoading,
    error,
    refetch,
    // Helpers
    nomeEmpresa: config?.nome_empresa || 'Lojas Manu',
    nomeSistema: config?.nome_sistema || 'PDV Lojas Manu',
    corPrimaria: config?.cor_primaria || '#0ea5e9',
    corSecundaria: config?.cor_secundaria || '#0369a1',
    logoUrl: config?.logo_url,
    telefone: config?.telefone,
    endereco: config
      ? [
          config.logradouro,
          config.numero,
          config.bairro,
          config.cidade,
          config.estado,
          config.cep,
        ]
          .filter(Boolean)
          .join(', ')
      : '',
  };
}
