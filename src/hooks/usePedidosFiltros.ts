'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { filtrosDaUrl, urlComFiltros, validarFiltrosPedidos, erroPeriodoPedidos, type FiltrosPedidos } from '@/lib/schemas/filtros-pedidos';
export type { FiltrosPedidos } from '@/lib/schemas/filtros-pedidos';
const STORAGE_KEY='pedidos_filtros';
export function usePedidosFiltros() {
  const router=useRouter(),searchParams=useSearchParams();
  const [estado,setEstado]=useState(() => { const filtros = validarFiltrosPedidos({}); return { filtros, aplicados: filtros }; });
  const { filtros, aplicados: filtrosAplicados } = estado;
  const erroPeriodo = erroPeriodoPedidos(filtros);
  const restaurar = useCallback((filtros: FiltrosPedidos) => setEstado(atual => ({ filtros, aplicados: erroPeriodoPedidos(filtros) ? atual.aplicados : filtros })), []);
  const [pronto,setPronto]=useState(false);
  useEffect(()=>{
    // Hidratação externa de URL/storage após SSR; uma atualização inicial controlada.
    if (searchParams.get('voltou_edicao')==='true' || Array.from(searchParams.keys()).some(key => key.startsWith('filtro_'))) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratar filtros externos uma vez após SSR
      restaurar(filtrosDaUrl(new URLSearchParams(searchParams.toString())));setPronto(true);
      const timeout=setTimeout(()=>{
        const params=new URLSearchParams(searchParams.toString());
        for (const key of Array.from(params.keys())) if(key.startsWith('filtro_')||key==='voltou_edicao')params.delete(key);
        router.replace(`/pedidos${params.size?'?'+params:''}`,{scroll:false});
      },500);
      return ()=>clearTimeout(timeout);
    }
    if(!pronto){ try {restaurar(validarFiltrosPedidos(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')));}catch {restaurar(validarFiltrosPedidos({}));} setPronto(true); }
  },[searchParams,router,pronto,restaurar]);
  useEffect(()=>{ if(!pronto)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...filtros,clienteSelecionado:filtros.clienteSelecionado?{id:filtros.clienteSelecionado.id,nome:''}:null}));}catch{} },[filtros,pronto]);
  const atualizarFiltros=useCallback((mudancas: Partial<FiltrosPedidos>)=>{
    setEstado(prev=>{
      const reiniciar = Object.keys(mudancas).some(key => !['page','filtrosExpanded'].includes(key));
      const proximos = validarFiltrosPedidos({...prev.filtros,...mudancas,...(reiniciar?{page:0}:{})});
      return { filtros: proximos, aplicados: erroPeriodoPedidos(proximos) ? prev.aplicados : proximos };
    });
  },[]);
  const atualizarFiltro=useCallback(<K extends keyof FiltrosPedidos>(key:K,valor:FiltrosPedidos[K])=>atualizarFiltros({[key]:valor}),[atualizarFiltros]);
  const limparFiltros=useCallback(()=>{const filtros=validarFiltrosPedidos({});setEstado({filtros,aplicados:filtros});},[]);
  const getUrlComFiltros=useCallback((base:string)=>urlComFiltros(base,filtros),[filtros]);
  const contarFiltrosAtivos=[filtros.status,filtros.search,filtros.dataInicio||filtros.dataFim,filtros.tipoAtendimento,filtros.formaPagamento,filtros.clienteSelecionado].filter(Boolean).length;
  return {filtros,filtrosAplicados,erroPeriodo,atualizarFiltro,atualizarFiltros,limparFiltros,getUrlComFiltros,temFiltrosAtivos:contarFiltrosAtivos>0,contarFiltrosAtivos,pronto};
}
