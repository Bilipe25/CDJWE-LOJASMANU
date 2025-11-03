/**
 * Hook customizado para gerenciar filtros de pedidos com persistência
 * Salva automaticamente no localStorage e na URL
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'pedidos_filtros';

export interface FiltrosPedidos {
  status: string;
  search: string;
  dataInicio: string;
  dataFim: string;
  tipoAtendimento: string;
  clienteSelecionado: any | null;
  page: number;
  rowsPerPage: number;
  filtrosExpanded: boolean;
}

const filtrosIniciais: FiltrosPedidos = {
  status: '',
  search: '',
  dataInicio: '',
  dataFim: '',
  tipoAtendimento: '',
  clienteSelecionado: null,
  page: 0,
  rowsPerPage: 10,
  filtrosExpanded: true,
};

export function usePedidosFiltros() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Carregar filtros salvos do localStorage ou da URL
  const carregarFiltrosSalvos = useCallback((): FiltrosPedidos => {
    try {
      // Primeiro, tentar carregar da URL (tem prioridade)
      const voltouDeEdicao = searchParams.get('voltou_edicao') === 'true';
      
      if (voltouDeEdicao) {
        const statusUrl = searchParams.get('filtro_status') || '';
        const searchUrl = searchParams.get('filtro_search') || '';
        const dataInicioUrl = searchParams.get('filtro_dataInicio') || '';
        const dataFimUrl = searchParams.get('filtro_dataFim') || '';
        const tipoAtendimentoUrl = searchParams.get('filtro_tipoAtendimento') || '';
        const pageUrl = parseInt(searchParams.get('filtro_page') || '0');
        const rowsPerPageUrl = parseInt(searchParams.get('filtro_rowsPerPage') || '10');
        
        // Cliente selecionado da URL (JSON encoded)
        let clienteSelecionadoUrl = null;
        const clienteParam = searchParams.get('filtro_cliente');
        if (clienteParam) {
          try {
            clienteSelecionadoUrl = JSON.parse(decodeURIComponent(clienteParam));
          } catch {}
        }
        
        return {
          status: statusUrl,
          search: searchUrl,
          dataInicio: dataInicioUrl,
          dataFim: dataFimUrl,
          tipoAtendimento: tipoAtendimentoUrl,
          clienteSelecionado: clienteSelecionadoUrl,
          page: pageUrl,
          rowsPerPage: rowsPerPageUrl,
          filtrosExpanded: true,
        };
      }
      
      // Se não veio da URL, carregar do localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const filtrosSalvos = JSON.parse(saved);
        return { ...filtrosIniciais, ...filtrosSalvos };
      }
    } catch (error) {
      console.error('Erro ao carregar filtros salvos:', error);
    }
    
    return filtrosIniciais;
  }, [searchParams]);

  const [filtros, setFiltros] = useState<FiltrosPedidos>(carregarFiltrosSalvos);

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
    } catch (error) {
      console.error('Erro ao salvar filtros:', error);
    }
  }, [filtros]);

  // Limpar query params da URL após carregar filtros
  useEffect(() => {
    const voltouDeEdicao = searchParams.get('voltou_edicao') === 'true';
    if (voltouDeEdicao) {
      // Limpar os parâmetros da URL após 500ms
      setTimeout(() => {
        router.replace('/pedidos', { scroll: false });
      }, 500);
    }
  }, [searchParams, router]);

  // Função para atualizar um filtro específico
  const atualizarFiltro = useCallback(<K extends keyof FiltrosPedidos>(
    key: K,
    valor: FiltrosPedidos[K]
  ) => {
    setFiltros(prev => ({
      ...prev,
      [key]: valor,
      // Resetar página quando filtros mudarem (exceto quando mudar a própria página)
      ...(key !== 'page' && key !== 'rowsPerPage' && key !== 'filtrosExpanded' ? { page: 0 } : {})
    }));
  }, []);

  // Função para limpar todos os filtros
  const limparFiltros = useCallback(() => {
    setFiltros(filtrosIniciais);
  }, []);

  // Função para obter URL com filtros para edição
  const getUrlComFiltros = useCallback((baseUrl: string): string => {
    const params = new URLSearchParams();
    params.set('voltou_edicao', 'true');
    params.set('filtro_status', filtros.status);
    params.set('filtro_search', filtros.search);
    params.set('filtro_dataInicio', filtros.dataInicio);
    params.set('filtro_dataFim', filtros.dataFim);
    params.set('filtro_tipoAtendimento', filtros.tipoAtendimento);
    params.set('filtro_page', filtros.page.toString());
    params.set('filtro_rowsPerPage', filtros.rowsPerPage.toString());
    
    if (filtros.clienteSelecionado) {
      params.set('filtro_cliente', encodeURIComponent(JSON.stringify(filtros.clienteSelecionado)));
    }
    
    return `${baseUrl}?${params.toString()}`;
  }, [filtros]);

  // Verificar se há filtros ativos
  const temFiltrosAtivos = useCallback(() => {
    return !!(
      filtros.status ||
      filtros.search ||
      filtros.dataInicio ||
      filtros.dataFim ||
      filtros.tipoAtendimento ||
      filtros.clienteSelecionado
    );
  }, [filtros]);

  // Contar quantos filtros estão ativos
  const contarFiltrosAtivos = useCallback(() => {
    let count = 0;
    if (filtros.status) count++;
    if (filtros.search) count++;
    if (filtros.dataInicio || filtros.dataFim) count++;
    if (filtros.tipoAtendimento) count++;
    if (filtros.clienteSelecionado) count++;
    return count;
  }, [filtros]);

  return {
    filtros,
    atualizarFiltro,
    limparFiltros,
    getUrlComFiltros,
    temFiltrosAtivos: temFiltrosAtivos(),
    contarFiltrosAtivos: contarFiltrosAtivos(),
  };
}

