import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  login: async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha });
    return response.data;
  },
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
};

// Usuários
export const usuariosService = {
  getAll: async (params?: any) => {
    const response = await api.get('/usuarios', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.patch(`/usuarios/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },
  getEstatisticas: async () => {
    const response = await api.get('/usuarios/estatisticas');
    return response.data;
  },
};

// Caixas
export const caixasService = {
  getAll: async (params?: any) => {
    const response = await api.get('/caixas', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/caixas/${id}`);
    return response.data;
  },
  getByAdmin: async (adminId: string) => {
    const response = await api.get(`/caixas/admin/${adminId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/caixas', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.patch(`/caixas/${id}`, data);
    return response.data;
  },
  alterarStatus: async (id: string, status: string) => {
    const response = await api.patch(`/caixas/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/caixas/${id}`);
    return response.data;
  },
  getEstatisticas: async () => {
    const response = await api.get('/caixas/estatisticas');
    return response.data;
  },
};

// Participantes
export const participantesService = {
  getAll: async (params?: any) => {
    const response = await api.get('/participantes', { params });
    return response.data;
  },
  getByCaixa: async (caixaId: string) => {
    const response = await api.get(`/participantes/caixa/${caixaId}`);
    return response.data;
  },
  getByUsuario: async (usuarioId: string) => {
    const response = await api.get(`/participantes/usuario/${usuarioId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/participantes', data);
    return response.data;
  },
  aceitar: async (id: string) => {
    const response = await api.patch(`/participantes/${id}/aceitar`);
    return response.data;
  },
  sortear: async (caixaId: string) => {
    const response = await api.post(`/participantes/caixa/${caixaId}/sortear`);
    return response.data;
  },
  definirPosicao: async (id: string, posicao: number) => {
    const response = await api.patch(`/participantes/${id}/posicao`, { posicao });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/participantes/${id}`);
    return response.data;
  },
};

// Pagamentos
export const pagamentosService = {
  getAll: async (params?: any) => {
    const response = await api.get('/pagamentos', { params });
    return response.data;
  },
  getByCaixaMes: async (caixaId: string, mes: number) => {
    const response = await api.get(`/pagamentos/caixa/${caixaId}/mes/${mes}`);
    return response.data;
  },
  getEstatisticasCaixa: async (caixaId: string) => {
    const response = await api.get(`/pagamentos/caixa/${caixaId}/estatisticas`);
    return response.data;
  },
  enviarComprovante: async (id: string, comprovanteUrl: string) => {
    const response = await api.patch(`/pagamentos/${id}/comprovante`, { comprovanteUrl });
    return response.data;
  },
  atualizarObservacao: async (id: string, observacao: string) => {
    const response = await api.patch(`/pagamentos/${id}`, { observacao });
    return response.data;
  },
  aprovar: async (id: string) => {
    const response = await api.patch(`/pagamentos/${id}/aprovar`);
    return response.data;
  },
  rejeitar: async (id: string, motivoRejeicao: string) => {
    const response = await api.patch(`/pagamentos/${id}/rejeitar`, { motivoRejeicao });
    return response.data;
  },
};

// Dashboard
export const dashboardService = {
  getMaster: async () => {
    const response = await api.get('/dashboard/master');
    return response.data;
  },
  getAdmin: async (adminId: string) => {
    const response = await api.get(`/dashboard/admin/${adminId}`);
    return response.data;
  },
  getUsuario: async (usuarioId: string) => {
    const response = await api.get(`/dashboard/usuario/${usuarioId}`);
    return response.data;
  },
  getMetricas: async () => {
    const response = await api.get('/dashboard/metricas');
    return response.data;
  },
};

// Notificações
export const notificacoesService = {
  getByUsuario: async (usuarioId: string) => {
    const response = await api.get(`/notificacoes/usuario/${usuarioId}`);
    return response.data;
  },
  contarNaoLidas: async (usuarioId: string) => {
    const response = await api.get(`/notificacoes/usuario/${usuarioId}/nao-lidas`);
    return response.data;
  },
  marcarComoLida: async (id: string) => {
    const response = await api.patch(`/notificacoes/${id}/ler`);
    return response.data;
  },
  marcarTodasComoLidas: async (usuarioId: string) => {
    const response = await api.patch(`/notificacoes/usuario/${usuarioId}/ler-todas`);
    return response.data;
  },
};

// Cobranças (PIX/Boleto via Lytex)
export const cobrancasService = {
  gerar: async (data: {
    participante: {
      nome: string;
      cpf: string;
      email: string;
      telefone: string;
    };
    caixa: {
      nome: string;
      tipo: 'mensal' | 'semanal';
      valorParcela: number;
      taxaServico: number;
      taxaAdministrativa?: number;
      mesOuSemana: number;
      totalParcelas: number;
    };
    dataVencimento: string;
    habilitarPix?: boolean;
    habilitarBoleto?: boolean;
  }) => {
    const response = await api.post('/cobrancas/gerar', data);
    return response.data;
  },
  buscar: async (id: string, context?: { caixaId?: string; participanteId?: string; mes?: number }) => {
    const params = new URLSearchParams();
    if (context?.caixaId) params.append('caixaId', context.caixaId);
    if (context?.participanteId) params.append('participanteId', context.participanteId);
    if (context?.mes) params.append('mes', String(context.mes));
    
    const queryString = params.toString();
    const url = `/cobrancas/${id}${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },
  status: async (id: string) => {
    const response = await api.get(`/cobrancas/status/${id}`);
    return response.data;
  },
  paymentDetail: async (id: string) => {
    const response = await api.get(`/cobrancas/${id}/payment-detail`);
    return response.data;
  },
  getByAssociacao: async (params: {
    caixaId: string;
    participanteId: string;
    mes: number;
  }) => {
    const { caixaId, participanteId, mes } = params;
    const response = await api.get(
      `/cobrancas/por-associacao/${caixaId}/${participanteId}/${mes}`,
    );
    return response.data;
  },
  getAllByAssociacao: async (params: {
    caixaId: string;
    participanteId: string;
  }) => {
    const { caixaId, participanteId } = params;
    const response = await api.get(
      `/cobrancas/todas-por-associacao/${caixaId}/${participanteId}`,
    );
    return response.data;
  },
  wallet: async () => {
    const response = await api.get('/cobrancas/wallet');
    return response.data;
  },
  transactions: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/cobrancas/transactions', { params });
    return response.data;
  },
};

// Bancos (Lytex - via backend)
export const bancosService = {
  getAll: async () => {
    const response = await api.get('/bancos');
    return response.data;
  },
};

export const carteiraService = {
  createSubAccount: async (data: any) => {
    const response = await api.post('/usuarios/me/subconta', data);
    return response.data;
  },
  getSubAccount: async () => {
    const response = await api.get('/usuarios/me/subconta');
    return response.data;
  },
  getBankAccounts: async () => {
    const response = await api.get('/usuarios/me/contas-bancarias');
    return response.data;
  },
  saveBankAccount: async (data: any) => {
    const response = await api.post('/usuarios/me/contas-bancarias', data);
    return response.data;
  },
};
