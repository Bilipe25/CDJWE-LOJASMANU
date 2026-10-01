'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { usePDVStore } from '@/stores/pdv-store';
interface AuthContextType {
  isAuthenticated: boolean; username: string | null; isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let revisao = 0;
    const validarSessao = async (session: { access_token: string; user: { email?: string } } | null) => {
      const atual = ++revisao;
      try {
        const autorizado = session && (await fetch('/api/trpc/auth.me', {
          headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store',
        })).ok;
        if (active && atual === revisao) setUsername(autorizado ? session?.user.email ?? null : null);
      } catch { if (active && atual === revisao) setUsername(null); }
      finally { if (active && atual === revisao) setIsLoading(false); }
    };
    localStorage.removeItem('authenticated'); localStorage.removeItem('username');
    void supabase.auth.getSession().then(({ data }) => {
      if (active) void validarSessao(data.session);
    }).catch(() => { if (active) setIsLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      void validarSessao(session);
      if (event === 'SIGNED_OUT') { queryClient.clear(); usePDVStore.getState().novoPedido(); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient]);
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) return false;
      const response = await fetch('/api/trpc/auth.me', {
        headers: { Authorization: 'Bearer ' + data.session.access_token }, cache: 'no-store',
      });
      if (!response.ok) { await supabase.auth.signOut({ scope: 'local' }); setUsername(null); return false; }
      queryClient.clear(); setUsername(data.user.email ?? null); return true;
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      queryClient.clear(); setUsername(null); return false;
    }
  };
  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' }); queryClient.clear();
    usePDVStore.getState().novoPedido(); setUsername(null); router.replace('/login');
  };
  return <AuthContext.Provider value={{ isAuthenticated: !!username, username, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}
