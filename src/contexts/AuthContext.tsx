import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/api';

interface Usuario {
  _id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: 'usuario' | 'administrador' | 'master';
  score: number;
  caixasConcluidos: number;
  chavePix?: string;
  picture?: string;
  avatar?: string;
  fotoUrl?: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUsuario: (data: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUsuario = localStorage.getItem('usuario');
    const storedToken = localStorage.getItem('token');
    
    if (storedUsuario && storedToken) {
      setUsuario(JSON.parse(storedUsuario));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    const response = await authService.login(email, senha);
    localStorage.setItem('token', response.accessToken);
    localStorage.setItem('usuario', JSON.stringify(response.usuario));
    setUsuario(response.usuario);
  };

  const register = async (data: any) => {
    const response = await authService.register(data);
    localStorage.setItem('token', response.accessToken);
    localStorage.setItem('usuario', JSON.stringify(response.usuario));
    setUsuario(response.usuario);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const updateUsuario = (data: Partial<Usuario>) => {
    if (usuario) {
      const updated = { ...usuario, ...data };
      localStorage.setItem('usuario', JSON.stringify(updated));
      setUsuario(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isAuthenticated: !!usuario,
        isLoading,
        login,
        register,
        logout,
        updateUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

