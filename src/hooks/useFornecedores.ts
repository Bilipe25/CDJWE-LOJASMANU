/**
 * Hook customizado para gerenciar fornecedores/destinatários
 * Fornecedores são clientes do sistema que podem receber pagamentos
 */

import { trpc } from '@/lib/trpc/client';
import { useMemo } from 'react';

export interface Fornecedor {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}

export function useFornecedores(searchTerm?: string) {
  // Buscar todos os clientes ativos (fornecedores)
  const { data, isLoading, error, refetch } = trpc.clientes.list.useQuery({
    limit: 1000,
    offset: 0,
  });

  // Processar e filtrar localmente
  const fornecedores = useMemo(() => {
    const clientesLista = (data?.clientes || []) as Fornecedor[];
    
    // Remover duplicatas por ID (garantia extra)
    const fornecedoresUnicos = Array.from(
      new Map(clientesLista.map(f => [f.id, f])).values()
    );

    // Filtrar localmente se houver termo de busca
    if (!searchTerm) return fornecedoresUnicos;

    const searchLower = searchTerm.toLowerCase();
    return fornecedoresUnicos.filter(
      f =>
        f.nome?.toLowerCase().includes(searchLower) ||
        f.cpf?.toLowerCase().includes(searchLower) ||
        f.telefone?.toLowerCase().includes(searchLower) ||
        f.email?.toLowerCase().includes(searchLower)
    );
  }, [data, searchTerm]);

  // Buscar fornecedor por ID
  const getFornecedorById = (id: string): Fornecedor | undefined => {
    return fornecedores.find(f => f.id === id);
  };

  // Buscar fornecedor por nome
  const getFornecedorByNome = (nome: string): Fornecedor | undefined => {
    return fornecedores.find(
      f => f.nome.toLowerCase() === nome.toLowerCase()
    );
  };

  return {
    fornecedores,
    isLoading,
    error,
    refetch,
    getFornecedorById,
    getFornecedorByNome,
    total: fornecedores.length,
  };
}
