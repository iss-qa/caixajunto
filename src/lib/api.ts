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
  getAdministradores: async () => {
    const response = await api.get('/usuarios/administradores');
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
  /**
   * Sincroniza status de cobranças do banco local (sem chamar Lytex)
   * Usado para verificar pagamentos sem gerar novas cobranças
   */
  syncStatus: async (caixaId: string) => {
    const response = await api.get(`/cobrancas/sync-status/${caixaId}`);
    return response.data;
  },
};

// Bancos (Lytex - via backend)
export const bancosService = {
  getAll: async (search?: string) => {
    const response = await api.get('/bancos', { params: search ? { search } : undefined });
    return response.data;
  },
  getAccounts: async (subrecipientid?: string) => {
    const response = await api.get('/bancos/contas', {
      params: subrecipientid ? { subrecipientid } : undefined,
    });
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
  getBankAccountsWithAdminToken: async (subrecipientId: string) => {
    const response = await api.get('/usuarios/bank-accounts-admin', {
      params: { subrecipientId },
    });
    return response.data;
  },
  saveBankAccount: async (data: any) => {
    const response = await api.post('/usuarios/me/contas-bancarias', data);
    return response.data;
  },
  updateBankAccount: async (id: string, data: any) => {
    const response = await api.patch(`/usuarios/me/contas-bancarias/${id}`, data);
    return response.data;
  },
  deleteBankAccount: async (id: string) => {
    const response = await api.delete(`/usuarios/me/contas-bancarias/${id}`);
    return response.data;
  },
};

export const subcontasService = {
  getAll: async () => {
    const response = await api.get('/subcontas');
    return response.data;
  },
  getMine: async () => {
    const response = await api.get('/subcontas/me');
    return response.data;
  },
  createMine: async (data: any) => {
    const response = await api.post('/subcontas/me', data);
    return response.data;
  },
  // Busca subconta por ID local (MongoDB _id)
  getById: async (id: string) => {
    const response = await api.get(`/subcontas/id/${id}`);
    return response.data;
  },
  // Busca dados bancários do Lytex por ID local da subconta
  getBankAccounts: async (id: string) => {
    const response = await api.get(`/subcontas/id/${id}/bank-accounts`);
    return response.data;
  },
  // Salva dados bancários localmente
  saveBankAccounts: async (id: string) => {
    const response = await api.post(`/subcontas/id/${id}/bank-accounts/save`);
    return response.data;
  },
  // Busca dados bancários salvos localmente
  getLocalBankAccounts: async (id: string) => {
    const response = await api.get(`/subcontas/id/${id}/bank-accounts/local`);
    return response.data;
  },
  getByLytexId: async (lytexId: string) => {
    const response = await api.get(`/subcontas/${lytexId}`);
    return response.data;
  },
  checkByCpf: async (cpf: string) => {
    const response = await api.get(`/subcontas/check/${cpf}`);
    return response.data;
  },
  // Busca subconta por usuarioId
  getByUsuarioId: async (usuarioId: string) => {
    const response = await api.get(`/subcontas/usuario/${usuarioId}`);
    return response.data;
  },
  // Atualiza credenciais Lytex de uma subconta por usuarioId
  updateCredentials: async (usuarioId: string, data: { clientId?: string; clientSecret?: string; nomeCaixa?: string }) => {
    const response = await api.patch(`/subcontas/usuario/${usuarioId}/credentials`, data);
    return response.data;
  },
  // Obtém carteira do participante usando suas credenciais Lytex
  getMyWallet: async () => {
    const response = await api.get('/subcontas/me/wallet');
    return response.data;
  },
};

export const splitService = {
  calculate: async (params: { caixaId: string; mes?: number }) => {
    const response = await api.get('/split/calculate', {
      params: { caixaId: params.caixaId, mes: params.mes ?? 1 },
    });
    return response.data as {
      caixaId: string;
      tipoParcela: 'primeira' | 'intermediaria' | 'ultima';
      participantes: number;
      meses: number;
      valorCaixa: number;
      valorParcela: number;
      totalArrecadado: number;
      distribuicao: Array<{
        chave: 'participante' | 'taxa' | 'fundo_reserva' | 'admin';
        descricao: string;
        percentual: number;
        valor: number;
        recipientId?: string;
      }>;
    };
  },
};

export const splitConfigService = {
  getAll: async () => {
    const response = await api.get('/split-config');
    return response.data;
  },
  getByCaixa: async (caixaId: string) => {
    const response = await api.get(`/split-config/${caixaId}`);
    return response.data;
  },
  saveForCaixa: async (
    caixaId: string,
    data: {
      taxaServicoSubId?: string;
      fundoReservaSubId?: string;
      adminSubId?: string;
      participantesMesOrdem?: string[];
      dadosBancarios?: {
        banco: string;
        agencia: string;
        conta: string;
      };
    },
  ) => {
    const response = await api.post(`/split-config/${caixaId}`, data);
    return response.data;
  },
  update: async (
    id: string,
    data: {
      taxaServicoSubId?: string;
      fundoReservaSubId?: string;
      adminSubId?: string;
      participantesMesOrdem?: string[];
      dadosBancarios?: {
        banco: string;
        agencia: string;
        conta: string;
      };
    },
  ) => {
    const response = await api.put(`/split-config/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/split-config/${id}`);
    return response.data;
  },
  migrateAll: async () => {
    const response = await api.post('/split-config/migrate-all');
    return response.data;
  },
};

export const transacoesService = {
  getDetalhadas: async () => {
    const response = await api.get('/split-history/transacoes-detalhadas');
    return response.data;
  },
};

// Contas Bancárias
export const contaBancariaService = {
  // Busca contas bancárias do usuário logado
  getMyBankAccounts: async () => {
    const response = await api.get('/usuarios/me/contas-bancarias');
    return response.data;
  },
};

// Recebimentos (Saques do participante)
export const recebimentosService = {
  // Busca recebimentos do usuário logado
  getMyRecebimentos: async () => {
    const token = localStorage.getItem('token');
    // Decodificar token para pegar usuarioId
    if (!token) return { recebimentos: [], totalPago: 0 };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const usuarioId = payload.sub;
      const response = await api.get(`/recebimentos/usuario/${usuarioId}`);
      return response.data;
    } catch (e) {
      console.error('Erro ao buscar recebimentos:', e);
      return { recebimentos: [], totalPago: 0 };
    }
  },
  // Busca total pago ao usuário
  getTotalPago: async (usuarioId: string) => {
    const response = await api.get(`/recebimentos/usuario/${usuarioId}`);
    const data = response.data;
    const recebimentos = data.recebimentos || data || [];
    const total = recebimentos
      .filter((r: any) => r.status === 'concluido')
      .reduce((acc: number, r: any) => acc + (r.valorTotal || 0), 0);
    return total;
  },
};

// Regras de Comissão
export const regrasComissaoService = {
  getComissaoCaixa: async (adminId: string, valorCaixa: number) => {
    const response = await api.get(`/regras-comissao/admin/${adminId}/caixa/${valorCaixa}/comissao`);
    return response.data;
  },
  getInfoTaxaAdmin: async (adminId: string) => {
    const response = await api.get(`/regras-comissao/admin/${adminId}/taxa`);
    return response.data;
  },
};

// Comunicação (Evolution API - WhatsApp)
export { comunicacaoService } from './api/comunicacao.service';
