'use client';
import { useEffect, useState } from 'react';
export function useNetworkAvailable() {
  const [online,setOnline]=useState<boolean | null>(null);
  useEffect(()=>{const atualizar=()=>setOnline(navigator.onLine);atualizar();window.addEventListener('online',atualizar);window.addEventListener('offline',atualizar);return()=>{window.removeEventListener('online',atualizar);window.removeEventListener('offline',atualizar);};},[]);
  return online;
}
