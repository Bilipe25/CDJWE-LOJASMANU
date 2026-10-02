'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { usePDVStore } from '@/stores/pdv-store';
interface AuthContextType {
  isAuthenticated: boolean; username: string | null; isLoading: boolean;
  authError: string | null; retryAuth: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let revisao = 0;
    const validarSessao = async (session: { access_token: string; user: { email?: string } } | null) => {
      const atual = ++revisao;
      try {
        if (!session) { if (active && atual === revisao) { setUsername(null); setAuthError(null); } return; }
        const response = await fetch('/api/trpc/auth.me', {
          headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store',
        });
        if (!active || atual !== revisao) return;
        if (!response.ok && ![401,403].includes(response.status)) { setAuthError('Não foi possível verificar a sessão e as permissões. Reconecte e tente novamente.'); return; }
        setAuthError(null); setUsername(response.ok ? session.user.email ?? null : null);
      } catch { if (active && atual === revisao) setAuthError('Não foi possível conectar ao serviço. Reconecte e tente novamente.'); }
      finally { if (active && atual === revisao) setIsLoading(false); }
    };
    try { localStorage.removeItem('authenticated'); localStorage.removeItem('username'); }
    catch { /* Legacy flags are optional; blocked storage must not prevent authentication. */ }
    void supabase.auth.getSession().then(({ data }) => {
      if (active) void validarSessao(data.session);
    }).catch(() => { if (active) { setAuthError('Não foi possível restaurar a sessão. Reconecte e tente novamente.'); setIsLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      void validarSessao(session);
      if (event === 'SIGNED_OUT') { queryClient.clear(); usePDVStore.getState().novoPedido(); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient, tentativa]);
  const retryAuth = () => { setIsLoading(true); setTentativa(t => t + 1); };
  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) { if (error && (!error.status || error.status >= 500)) setAuthError('Serviço indisponível. Tente novamente sem alterar sua senha.'); return false; }
      const response = await fetch('/api/trpc/auth.me', {
        headers: { Authorization: 'Bearer ' + data.session.access_token }, cache: 'no-store',
      });
      if (!response.ok && ![401,403].includes(response.status)) { setAuthError('Não foi possível verificar o acesso. Tente novamente quando o serviço responder.'); return false; }
      if (!response.ok) { await supabase.auth.signOut({ scope: 'local' }); setUsername(null); return false; }
      queryClient.clear(); setUsername(data.user.email ?? null); return true;
    } catch {
      setAuthError('Não foi possível conectar ao serviço. Reconecte e tente novamente.'); return false;
    }
  };
  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' }); queryClient.clear();
    usePDVStore.getState().novoPedido(); setUsername(null); router.replace('/login');
  };
  return <AuthContext.Provider value={{ isAuthenticated: !!username, username, isLoading, authError, retryAuth, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}
