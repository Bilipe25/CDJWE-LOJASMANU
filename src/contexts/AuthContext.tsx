'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está autenticado no localStorage
    const authenticated = localStorage.getItem('authenticated') === 'true';
    const storedUsername = localStorage.getItem('username');
    
    if (authenticated && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Aqui você pode adicionar sua lógica de autenticação
    // Por enquanto, vamos usar uma validação simples
    
    // Exemplo: você pode adicionar múltiplos usuários aqui
    const validUsers = [
      { username: 'admin', password: 'admin123' },
      { username: 'lojasmanu', password: '1987' },
      { username: 'operador', password: 'operador123' },
    ];

    const user = validUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      localStorage.setItem('authenticated', 'true');
      localStorage.setItem('username', username);
      setIsAuthenticated(true);
      setUsername(username);
      return true;
    }

    return false;
  };

  const logout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
