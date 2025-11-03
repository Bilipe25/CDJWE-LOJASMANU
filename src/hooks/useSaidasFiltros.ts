/**
 * Hook customizado para gerenciar filtros de saídas financeiras com persistência
 * Salva automaticamente no localStorage
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'saidas_filtros';

export interface FiltrosSaidas {
  status: string;
  search: string;
  dataInicio: string;
  dataFim: string;
  clienteSelecionado: any | null;
  page: number;
  rowsPerPage: number;
}

const filtrosIniciais: FiltrosSaidas = {
  status: '',
  search: '',
  dataInicio: '',
  dataFim: '',
  clienteSelecionado: null,
  page: 0,
  rowsPerPage: 10,
};

export function useSaidasFiltros() {
  // Carregar filtros salvos do localStorage
  const carregarFiltrosSalvos = useCallback((): FiltrosSaidas => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const filtrosSalvos = JSON.parse(saved);
        return { ...filtrosIniciais, ...filtrosSalvos };
      }
    } catch (error) {
      console.error('Erro ao carregar filtros salvos:', error);
    }
    
    return filtrosIniciais;
  }, []);

  const [filtros, setFiltros] = useState<FiltrosSaidas>(carregarFiltrosSalvos);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
    } catch (error) {
      console.error('Erro ao salvar filtros:', error);
    }
  }, [filtros]);

  // Função para atualizar um filtro específico
  const atualizarFiltro = useCallback(<K extends keyof FiltrosSaidas>(
    key: K,
    valor: FiltrosSaidas[K]
  ) => {
    setFiltros(prev => ({
      ...prev,
      [key]: valor,
      // Resetar página quando filtros mudarem (exceto quando mudar a própria página)
      ...(key !== 'page' && key !== 'rowsPerPage' ? { page: 0 } : {})
    }));
  }, []);

  // Função para limpar todos os filtros
  const limparFiltros = useCallback(() => {
    setFiltros(filtrosIniciais);
  }, []);

  // Verificar se há filtros ativos
  const temFiltrosAtivos = useCallback(() => {
    return !!(
      filtros.status ||
      filtros.search ||
      filtros.dataInicio ||
      filtros.dataFim ||
      filtros.clienteSelecionado
    );
  }, [filtros]);

  // Contar quantos filtros estão ativos
  const contarFiltrosAtivos = useCallback(() => {
    let count = 0;
    if (filtros.status) count++;
    if (filtros.search) count++;
    if (filtros.dataInicio || filtros.dataFim) count++;
    if (filtros.clienteSelecionado) count++;
    return count;
  }, [filtros]);

  return {
    filtros,
    atualizarFiltro,
    limparFiltros,
    temFiltrosAtivos: temFiltrosAtivos(),
    contarFiltrosAtivos: contarFiltrosAtivos(),
  };
}

