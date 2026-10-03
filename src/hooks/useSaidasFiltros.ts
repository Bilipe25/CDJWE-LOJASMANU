'use client';
import { useState, useEffect, useCallback } from 'react';
import { validarFiltrosSaidas, type FiltrosSaidas } from '@/lib/schemas/filtros-saidas';
import { erroPeriodoPedidos } from '@/lib/schemas/filtros-pedidos';
export type { FiltrosSaidas } from '@/lib/schemas/filtros-saidas';
const STORAGE_KEY = 'saidas_filtros';
export function useSaidasFiltros() {
  const [filtros, setFiltros] = useState(() => validarFiltrosSaidas({}));
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let restaurados;
    try { restaurados = validarFiltrosSaidas(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
    catch { restaurados = validarFiltrosSaidas({}); }
    if (erroPeriodoPedidos(restaurados)) { restaurados.dataInicio = ''; restaurados.dataFim = ''; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restauração controlada de armazenamento externo após SSR
    setFiltros(restaurados); setPronto(true);
  }, []);
  useEffect(() => {
    if (!pronto) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filtros, clienteSelecionado: filtros.clienteSelecionado ? { id: filtros.clienteSelecionado.id, nome: '' } : null })); } catch {}
  }, [filtros, pronto]);
  const atualizarFiltro = useCallback(<K extends keyof FiltrosSaidas>(key: K, valor: FiltrosSaidas[K]) => {
    setFiltros(prev => validarFiltrosSaidas({ ...prev, [key]: valor, ...(!['page', 'filtrosExpanded'].includes(key) ? { page: 0 } : {}) }));
  }, []);
  const limparFiltros = useCallback(() => setFiltros(validarFiltrosSaidas({})), []);
  const contarFiltrosAtivos = [filtros.status, filtros.search, filtros.dataInicio || filtros.dataFim, filtros.clienteSelecionado, filtros.formaPagamento].filter(Boolean).length;
  return { filtros, atualizarFiltro, limparFiltros, temFiltrosAtivos: contarFiltrosAtivos > 0, contarFiltrosAtivos, pronto, erroPeriodo: erroPeriodoPedidos(filtros) };
}
