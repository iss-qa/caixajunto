import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService, api } from '../lib/api';

interface TaxaAdesao {
  status: 'pendente' | 'pago' | 'isento';
  lytexInvoiceId?: string;
  linkBoleto?: string;
  linkCheckout?: string;
  pixQrCode?: string;
  pixCopiaECola?: string;
  dataPagamento?: string;
  isentoPorId?: string;
  isentoPorNome?: string;
  dataIsencao?: string;
}

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
  cpf?: string;
  lytexSubAccountId?: string;
  contratoAssinado?: boolean;
  taxaAdesao?: TaxaAdesao;
}

interface AuthContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUsuario: (data: Partial<Usuario>) => void;
  recarregarUsuario: () => Promise<void>;
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

    // Só salva token e faz login se o token não estiver vazio
    // Administradores recebem token vazio e não devem fazer login automático
    if (response.accessToken && response.accessToken.trim() !== '') {
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('usuario', JSON.stringify(response.usuario));
      setUsuario(response.usuario);
    }
    // Se token vazio, não salva nada (administrador pendente de aprovação)
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

  // Recarrega dados do usuário do servidor (útil após pagamento/isenção de taxa)
  const recarregarUsuario = useCallback(async () => {
    if (!usuario?._id) return;

    try {
      const response = await api.get(`/usuarios/${usuario._id}`);
      const usuarioAtualizado = response.data;
      localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));
      setUsuario(usuarioAtualizado);
    } catch (error) {
      console.error('Erro ao recarregar usuário:', error);
    }
  }, [usuario?._id]);

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
        recarregarUsuario,
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
