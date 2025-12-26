import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Wallet,
  Calendar,
  Copy,
  Share2,
  Settings,
  UserPlus,
  Shuffle,
  Play,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  TrendingUp,
  Shield,
  Edit,
  Trash2,
  GripVertical,
  AlertTriangle,
  FileText,
  X,
  User,
  CreditCard,
  QrCode,
  Loader2,
  Download,
  ExternalLink,
  Printer,
  Search,
  UserCheck,
  Home,
  MapPin,
  Camera,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { caixasService, participantesService, usuariosService, cobrancasService, pagamentosService, splitConfigService, subcontasService } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { DetalhesPagamento } from './DetalhesPagamento';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { ConfiguracoesObrigatoriasCaixa } from '../components/ConfiguracoesObrigatoriasCaixa';
import { useCaixaConfiguracao } from '../hooks/useCaixaConfiguracao';

interface Participante {
  _id: string;
  usuarioId: {
    _id: string;
    nome: string;
    email: string;
    telefone: string;
    cpf?: string;
    chavePix?: string;
    score: number;
    fotoUrl?: string;
  };
  posicao?: number;
  aceite: boolean;
  status: string;
  mesRecebimento?: number;
  totalPago: number;
  jaRecebeu: boolean;
  dataRecebimento?: string;
}

interface Caixa {
  _id: string;
  nome: string;
  descricao?: string;
  tipo?: 'mensal' | 'semanal';
  valorTotal: number;
  valorParcela: number;
  taxaApp: number;
  taxaAdmin: number;
  qtdParticipantes: number;
  duracaoMeses: number;
  status: string;
  mesAtual: number;
  diaVencimento: number;
  fundoGarantidor: number;
  codigoConvite: string;
  dataInicio?: string;
  dataVencimento?: string;
  adminId: {
    _id: string;
    nome: string;
    email: string;
  };
}

interface Boleto {
  mes: number;
  valorParcela: number;
  taxaServico: number;
  fundoReserva: number;
  taxaAdmin: number;
  comissaoAdmin: number;
  correcaoIPCA: number;
  valorTotal: number;
  dataVencimento: string;
  status: 'pago' | 'pendente' | 'atrasado';
  dataPagamento?: string;
}

type CobrancaInfo = {
  id: string;
  valor: number;
  descricao: string;
  paymentUrl?: string;
  pixGeneratedAt?: string;
  pix?: {
    qrCode: string;
    copiaCola: string;
  };
  boleto?: {
    codigoBarras: string;
    linhaDigitavel: string;
    url: string;
  };
};

const tabs = [
  { id: 'participantes', label: 'Participantes', icon: Users },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

// Taxa IPCA mensal estimada (0.4% ao mês)
const TAXA_IPCA_MENSAL = 0.0041;
const TAXA_SERVICO = 10.00
const FUNDO_RESERVA = 50;

export function CaixaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('participantes');
  const [showAddParticipante, setShowAddParticipante] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [showAddExistente, setShowAddExistente] = useState(false);
  const [showEditCaixa, setShowEditCaixa] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showParticipanteDetail, setShowParticipanteDetail] = useState(false);
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [showRemoveParticipanteModal, setShowRemoveParticipanteModal] = useState(false);
  const [participanteToRemove, setParticipanteToRemove] = useState<Participante | null>(null);

  // Estados de UI gerais
  const [newParticipante, setNewParticipante] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    chavePix: '',
    picture: '',
    senha: '',
    address: {
      street: '',
      zone: '',
      city: '',
      state: '',
      number: '',
      complement: '',
      zip: '',
    },
  });
  const [usuariosSemCaixa, setUsuariosSemCaixa] = useState<Array<{ _id: string; nome: string; email: string; telefone: string; cpf?: string; chavePix?: string; score?: number; fotoUrl?: string }>>([]);
  const [searchUsuario, setSearchUsuario] = useState('');
  const [usuariosSelecionadosIds, setUsuariosSelecionadosIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: '',
    descricao: '',
    tipo: 'mensal' as 'mensal' | 'semanal',
    valorTotal: 5000,
    qtdParticipantes: 10,
    duracaoMeses: 10,
    dataVencimento: '',
  });
  const [showIniciarCaixa, setShowIniciarCaixa] = useState(false);
  const [aceiteContrato, setAceiteContrato] = useState(false);
  const [showSplitConfigModal, setShowSplitConfigModal] = useState(false);

  // Use custom hook for configuration verification
  const {
    splitConfigStatus,
    participantesSubcontasStatus,
    loading: configLoading,
    error: configError,
    verificarConfiguracaoSplitDetalhada,
    validarIniciarCaixa,
  } = useCaixaConfiguracao(
    id || '',
    participantes,
    caixa?.adminId?._id || '',
    caixa?.adminId?.email || '',
    caixa?.adminId?.nome || ''
  );
  const [customParticipantes, setCustomParticipantes] = useState(false);
  const [customDuracao, setCustomDuracao] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);


  const [pagamentosMes, setPagamentosMes] = useState<any[]>([]);
  const [todosPagamentos, setTodosPagamentos] = useState<any[]>([]);
  const [pagamentosParticipante, setPagamentosParticipante] = useState<any[]>([]);
  const [localPaidByMes, setLocalPaidByMes] = useState<Record<number, Set<string>>>({});

  const markPaid = (mes: number, participanteId: string) => {
    setLocalPaidByMes((prev) => {
      const set = new Set(prev[mes] || []);
      set.add(String(participanteId));
      return { ...prev, [mes]: set };
    });
  };
  const [cronogramaParcela, setCronogramaParcela] = useState<number>(1);

  // ============================================================================
  // MELHORIAS ADICIONADAS
  // ============================================================================

  // MELHORIA 2: Verificação de pagamento por participante/mês
  const verificarPagamento = useCallback((usuarioId: string, participanteId: string, mes: number) => {
    const statusValidos = ['aprovado', 'pago', 'paid', 'liquidated', 'settled', 'inqueue'];

    // Verificar cache local (atualização otimista)
    // localPaidByMes armazena o ID do Participante (não do Usuário)
    const localSet = localPaidByMes[mes];
    if (localSet && localSet.has(String(participanteId))) {
      return true;
    }

    return todosPagamentos.some(p => {
      const pagadorId = p.pagadorId?._id || p.pagadorId;
      const status = String(p.status || '').toLowerCase();

      return (
        String(pagadorId) === String(usuarioId) &&
        p.mesReferencia === mes &&
        statusValidos.includes(status)
      );
    });
  }, [todosPagamentos, localPaidByMes]);

  // MELHORIA 1: Cálculo de progresso otimizado
  const { progressoPercentual, pagamentosRealizados, totalPagamentosNecessarios } = useMemo(() => {
    if (!caixa) return { progressoPercentual: 0, pagamentosRealizados: 0, totalPagamentosNecessarios: 0 };

    // Total necessário = participantes × duração
    const total = caixa.qtdParticipantes * caixa.duracaoMeses;

    // Contar pagamentos realizados verificando status consolidado (Local + Remoto)
    let realizados = 0;

    if (participantes.length > 0) {
      participantes.forEach(p => {
        const usuarioId = p.usuarioId?._id || p.usuarioId;
        const participanteId = p._id;

        // Verificar cada mês possível
        for (let mes = 1; mes <= caixa.duracaoMeses; mes++) {
          if (verificarPagamento(String(usuarioId), String(participanteId), mes)) {
            realizados++;
          }
        }
      });
    } else {
      // Fallback se não houver participantes carregados (usa apenas todosPagamentos)
      const statusValidos = ['aprovado', 'pago', 'paid', 'liquidated', 'settled', 'inqueue'];
      realizados = todosPagamentos.filter(p =>
        statusValidos.includes(String(p.status || '').toLowerCase())
      ).length;
    }

    // Calcular percentual
    const percentual = total > 0 ? Math.round((realizados / total) * 100) : 0;

    return {
      progressoPercentual: percentual,
      pagamentosRealizados: realizados,
      totalPagamentosNecessarios: total
    };
  }, [caixa, participantes, todosPagamentos, verificarPagamento]);

  // MELHORIA 3: Status consolidado do participante
  const obterStatusParticipante = useCallback((participante: Participante, mes: number) => {
    const usuarioId = participante.usuarioId?._id || participante.usuarioId;
    const participanteId = participante._id;
    const isPago = verificarPagamento(String(usuarioId), String(participanteId), mes);

    if (!caixa) return { isPago: false, isAtrasado: false, isVenceHoje: false };

    const dataBase = new Date(caixa.dataVencimento || caixa.dataInicio || new Date());
    const dataVencimento = new Date(dataBase);

    if (caixa.tipo === 'semanal') {
      dataVencimento.setDate(dataVencimento.getDate() + ((mes - 1) * 7));
    } else {
      dataVencimento.setMonth(dataVencimento.getMonth() + mes - 1);
      dataVencimento.setDate(caixa.diaVencimento);
    }

    const hoje = new Date();
    const vencHoje = dataVencimento.toDateString() === hoje.toDateString();
    const atrasado = caixa.status === 'ativo' && !isPago && dataVencimento < hoje;

    return { isPago, isAtrasado: atrasado, isVenceHoje: vencHoje };
  }, [caixa, verificarPagamento]);

  // Calcular data mínima de vencimento (hoje + 5 dias)
  const getMinDataVencimento = () => {
    const data = new Date();
    data.setDate(data.getDate() + 5);
    return data.toISOString().split('T')[0];
  };

  // Validar se a data de vencimento é válida (mínimo 5 dias no futuro)
  const isDataVencimentoValida = (data: string) => {
    if (!data) return false;
    const dataVenc = new Date(data);
    const minData = new Date();
    minData.setDate(minData.getDate() + 5);
    return dataVenc >= minData;
  };

  // Carregar participantes do localStorage
  const getStoredParticipantes = (): Participante[] => {
    try {
      const stored = localStorage.getItem(`caixa_${id}_participantes`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Salvar participantes no localStorage
  const saveParticipantes = (parts: Participante[]) => {
    try {
      localStorage.setItem(`caixa_${id}_participantes`, JSON.stringify(parts));
    } catch (e) {
      console.error('Erro ao salvar participantes:', e);
    }
  };

  // ✅ NOVA FUNÇÃO: sincronizarStatusCobrancas
  // Esta função busca APENAS do banco local (MongoDB) os status das cobranças existentes.
  // NÃO chama a API do Lytex, então NÃO gera novas cobranças.
  // Atualiza o localPaidByMes para refletir os pagamentos já realizados.
  const sincronizarStatusCobrancas = async (listaParticipantes: Participante[]) => {
    if (!id || !listaParticipantes.length) return;

    const statusPagos = ['pago', 'paid', 'liquidated', 'settled', 'aprovado', 'inqueue'];

    try {
      // Processar cada participante
      await Promise.all(listaParticipantes.map(async (p) => {
        try {
          // Buscar cobranças existentes do banco LOCAL (não chama Lytex)
          const response = await cobrancasService.getAllByAssociacao({
            caixaId: id,
            participanteId: p._id,
          });

          const cobrancas = response?.cobrancas || [];

          // Atualizar localPaidByMes para cada cobrança paga
          cobrancas.forEach((c: any) => {
            const status = String(c.status || '').toLowerCase();
            const mes = c.mesReferencia;

            if (mes && statusPagos.includes(status)) {
              markPaid(mes, p._id);
            }
          });
        } catch (err) {
          // Silently ignore errors - não queremos bloquear a UI
          console.debug(`Erro ao sincronizar status para participante ${p._id}:`, err);
        }
      }));
    } catch (e) {
      console.error('Erro ao sincronizar status de cobranças:', e);
    }
  };


  // Função para calcular valor com IPCA aplicado
  const calcularValorComIPCA = (mes: number, valorBase: number): number => {
    if (mes <= 1) return valorBase; // Primeira parcela sem IPCA

    const taxaIPCA = 0.004; // 0.4% ao mês
    const mesesIPCA = mes - 1; // IPCA acumulado desde o mês 2
    const valorIPCA = valorBase * (Math.pow(1 + taxaIPCA, mesesIPCA) - 1);

    return valorBase + valorIPCA;
  };

  useEffect(() => {
    if (id) {
      loadCaixa();
      loadParticipantes();
      loadPagamentos();

      // Polling para atualizar o dashboard em tempo real (a cada 10s)
      const intervalId = setInterval(loadPagamentos, 10000);
      return () => clearInterval(intervalId);
    }
  }, [id]);

  const loadPagamentos = async () => {
    if (!id) return;
    try {
      const response = await pagamentosService.getAll({ caixaId: id });
      const lista = Array.isArray(response) ? response : (response.data || []);
      setTodosPagamentos(lista);

      // Atualizar pagamentosMes para compatibilidade
      if (caixa?.mesAtual) {
        setPagamentosMes(lista.filter((p: any) => p.mesReferencia === caixa.mesAtual));
      } else {
        setPagamentosMes(lista);
      }
    } catch (e) {
      console.error("Erro ao carregar pagamentos", e);
    }
  };

  useEffect(() => {
    // Atualizar pagamentosMes quando caixa ou todosPagamentos mudar
    if (caixa?.mesAtual && todosPagamentos.length > 0) {
      setPagamentosMes(todosPagamentos.filter((p: any) => p.mesReferencia === caixa.mesAtual));
    }
  }, [caixa?.mesAtual, todosPagamentos]);

  useEffect(() => {
    // Atualizar resumo ao trocar aba do cronograma
    if (id) {
      try { loadPagamentos(); } catch { }
    }
  }, [cronogramaParcela]);

  useEffect(() => {
    // Verificar configuração de split quando o modal for aberto
    if (showSplitConfigModal) {
      verificarConfiguracaoSplitDetalhada();
    }
  }, [showSplitConfigModal]);

  const loadCaixa = async () => {
    try {
      const response = await caixasService.getById(id!);
      setCaixa(response);

      // Usar dataVencimento salva, ou calcular uma nova se não existir
      let dataVencFormatted: string;
      if (response.dataVencimento) {
        // Usar a data de vencimento salva
        const dataVencSalva = new Date(response.dataVencimento);
        dataVencFormatted = dataVencSalva.toISOString().split('T')[0];
      } else {
        // Calcular uma nova data de vencimento (fallback)
        const dataVenc = new Date();
        if (response.diaVencimento) {
          dataVenc.setDate(response.diaVencimento);
          if (dataVenc <= new Date()) {
            dataVenc.setMonth(dataVenc.getMonth() + 1);
          }
        } else {
          dataVenc.setDate(dataVenc.getDate() + 5);
        }
        dataVencFormatted = dataVenc.toISOString().split('T')[0];
      }

      setEditForm({
        nome: response.nome,
        descricao: response.descricao || '',
        tipo: response.tipo || 'mensal',
        valorTotal: response.valorTotal,
        qtdParticipantes: response.qtdParticipantes,
        duracaoMeses: response.duracaoMeses,
        dataVencimento: dataVencFormatted,
      });

    } catch (error) {
      console.error('Erro ao carregar caixa:', error);
      // Mock data
      const mockCaixa = {
        _id: id!,
        nome: 'Caixa da Família',
        descricao: 'Caixa mensal da família Silva',
        tipo: 'mensal' as const,
        valorTotal: 5000,
        valorParcela: 500,
        taxaApp: 50,
        taxaAdmin: 50,
        qtdParticipantes: 10,
        duracaoMeses: 10,
        status: 'aguardando',
        mesAtual: 0,
        diaVencimento: 10,
        fundoGarantidor: 500,
        codigoConvite: 'FAM2024',
        dataInicio: '2024-01-01',
        adminId: { _id: '1', nome: 'João Silva', email: 'joao@email.com' },
      };
      setCaixa(mockCaixa);
      const dataVenc = new Date();
      dataVenc.setDate(dataVenc.getDate() + 5);
      setEditForm({
        nome: mockCaixa.nome,
        descricao: mockCaixa.descricao || '',
        tipo: mockCaixa.tipo || 'mensal',
        valorTotal: mockCaixa.valorTotal,
        qtdParticipantes: mockCaixa.qtdParticipantes,
        duracaoMeses: mockCaixa.duracaoMeses,
        dataVencimento: dataVenc.toISOString().split('T')[0],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantes = async () => {
    try {
      const response = await participantesService.getByCaixa(id!);
      if (response && response.length > 0) {
        const participantesValidos = response.filter((p: Participante) =>
          p.usuarioId && p.usuarioId._id
        );
        setParticipantes(participantesValidos);
        saveParticipantes(participantesValidos);

        // ✅ Sincronizar status de cobranças existentes (lê apenas do banco local)
        // NÃO gera novas cobranças no Lytex - apenas atualiza localPaidByMes
        await sincronizarStatusCobrancas(participantesValidos);
      } else {
        setParticipantes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      setParticipantes([]);
    }
  };

  const handleCopyCode = () => {
    if (caixa?.codigoConvite) {
      navigator.clipboard.writeText(caixa.codigoConvite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSortear = async () => {
    if (!caixa || participantes.length === 0) return;
    if (participantes.length < caixa.qtdParticipantes) {
      alert('Só é possível sortear quando o caixa estiver completo.');
      return;
    }
    try {
      await participantesService.sortear(id!);
      loadParticipantes();
    } catch (error) {
      console.error('Erro ao sortear:', error);
      const shuffled = [...participantes].sort(() => Math.random() - 0.5);
      setParticipantes(shuffled.map((p, idx) => ({ ...p, posicao: idx + 1 })));
    }
  };

  const handleAtivarCaixa = async () => {
    // Validação: só iniciar se posições estiverem sorteadas para todos
    const total = caixa?.qtdParticipantes || 0;
    const completo = participantes.length === total && total > 0;
    const todasPosicoes = completo && participantes.every((p) => (p.posicao || 0) > 0);
    if (!completo || !todasPosicoes) {
      setErrorMessage('Sorteie as posições e garanta que todos os participantes tenham uma posição antes de iniciar.');
      setShowErrorModal(true);
      return;
    }

    // VALIDAÇÃO CRÍTICA: Verificar configuração de split antes de ativar
    const splitConfigurado = await verificarConfiguracaoSplit();
    if (!splitConfigurado) {
      setErrorMessage('Configure o split de pagamentos antes de iniciar o caixa. Acesse a aba Configurações.');
      setShowErrorModal(true);
      setShowSplitConfigModal(true);
      return;
    }

    try {
      await caixasService.alterarStatus(id!, 'ativo');
      loadCaixa();
    } catch (error) {
      console.error('Erro ao ativar:', error);
    }
  };

  const handlePause = async () => {
    if (!id) return;
    try {
      await caixasService.alterarStatus(id, 'pausado');
      if (caixa) setCaixa({ ...caixa, status: 'pausado' });
    } catch (error) {
      console.error('Erro ao pausar caixa:', error);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    try {
      await caixasService.alterarStatus(id, 'ativo');
      if (caixa) setCaixa({ ...caixa, status: 'ativo' });
    } catch (error) {
      console.error('Erro ao reativar caixa:', error);
    }
  };

  // Note: verificarConfiguracaoSplitDetalhada is now provided by the useCaixaConfiguracao hook

  const verificarConfiguracaoSplit = async (): Promise<boolean> => {
    try {
      if (!id) return false;

      const config = await splitConfigService.getByCaixa(id);

      // Verificar se existe configuração
      if (!config) return false;

      // Verificar se tem IDs de subcontas configurados
      if (!config.taxaServicoSubId || !config.adminSubId) return false;

      // Verificar se tem participantes vinculados
      if (!config.participantesMesOrdem || config.participantesMesOrdem.length === 0) return false;

      return true;
    } catch (error) {
      console.error('Erro ao verificar configuração de split:', error);
      return false;
    }
  };

  const handleIniciarCaixa = async () => {
    console.log('🚀 handleIniciarCaixa called');
    console.log('📋 aceiteContrato:', aceiteContrato);
    console.log('📋 splitConfigStatus:', splitConfigStatus);

    // Check if all configurations are complete (from the configuration modal)
    const allConfigsComplete = splitConfigStatus.participantesVinculados &&
      splitConfigStatus.adminTemSubconta &&
      splitConfigStatus.regrasSplit;

    // If called from normal flow, require aceiteContrato
    // If called from config modal with all complete, skip aceiteContrato check
    if (!aceiteContrato && !allConfigsComplete) {
      console.log('❌ Aceite contrato not checked and configs not complete');
      return;
    }

    // Validação: só iniciar se posições estiverem sorteadas para todos
    const total = caixa?.qtdParticipantes || 0;
    const completo = participantes.length === total && total > 0;
    const todasPosicoes = completo && participantes.every((p) => (p.posicao || 0) > 0);

    if (!completo || !todasPosicoes) {
      console.log('❌ Positions not sorted:', { completo, todasPosicoes, total, participantesCount: participantes.length });
      setErrorMessage('Sorteie as posições e garanta que todos os participantes tenham uma posição antes de iniciar.');
      setShowErrorModal(true);
      return;
    }

    // MEGA IMPORTANTE: Validação de configuração de split
    if (!allConfigsComplete) {
      const splitConfigurado = await verificarConfiguracaoSplit();
      if (!splitConfigurado) {
        setShowSplitConfigModal(true);
        setShowIniciarCaixa(false);
        setAceiteContrato(false);
        return;
      }
    }

    try {
      console.log('🚀 Calling API to start caixa...');
      await caixasService.alterarStatus(id!, 'ativo');
      console.log('✅ Caixa started successfully!');

      if (caixa) {
        setCaixa({ ...caixa, status: 'ativo', mesAtual: 1, dataInicio: new Date().toISOString() });
      }
      setShowIniciarCaixa(false);
      setShowSplitConfigModal(false);
      setAceiteContrato(false);

      // Show success message
      setSuccessMessage('🎉 Caixa iniciado com sucesso!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('❌ Erro ao iniciar caixa:', error);
      setErrorMessage('Erro ao iniciar caixa. Tente novamente.');
      setShowErrorModal(true);
    }
  };

  const gerarCronograma = () => {
    if (!caixa) return [];

    const cronograma = [];
    const dataBase = caixa.dataVencimento ? new Date(caixa.dataVencimento) : (caixa.dataInicio ? new Date(caixa.dataInicio) : new Date());
    const isSemanal = caixa.tipo === 'semanal';

    for (let i = 0; i < caixa.qtdParticipantes; i++) {
      const dataRecebimento = new Date(dataBase);
      if (isSemanal) {
        dataRecebimento.setDate(dataRecebimento.getDate() + (i * 7));
      } else {
        dataRecebimento.setMonth(dataRecebimento.getMonth() + i);
        dataRecebimento.setDate(caixa.diaVencimento);
      }

      const participante = participantes.find(p => p.posicao === i + 1);

      cronograma.push({
        posicao: i + 1,
        dataRecebimento: dataRecebimento.toISOString(),
        participante: participante?.usuarioId?.nome || `Posição ${i + 1}`,
        valor: caixa.valorTotal,
        status: i + 1 < (caixa.mesAtual || 1) ? 'recebido' : i + 1 === (caixa.mesAtual || 1) ? 'atual' : 'futuro',
      });
    }

    return cronograma;
  };

  const handleUpdateCaixa = async () => {
    // Validações
    if (editForm.qtdParticipantes < 2) {
      alert('Mínimo de 2 participantes');
      return;
    }
    if (editForm.tipo === 'semanal' && editForm.qtdParticipantes > 24) {
      alert('Máximo de 24 participantes para caixa semanal');
      return;
    }
    if (editForm.tipo === 'mensal' && editForm.qtdParticipantes > 12) {
      alert('Máximo de 12 participantes para caixa mensal');
      return;
    }
    if (editForm.tipo === 'semanal' && editForm.duracaoMeses > 24) {
      alert('Máximo de 24 semanas para caixa semanal');
      return;
    }
    if (editForm.tipo === 'mensal' && editForm.duracaoMeses > 12) {
      alert('Máximo de 12 meses para caixa mensal');
      return;
    }
    if (!isDataVencimentoValida(editForm.dataVencimento)) {
      alert('A data de vencimento deve ser no mínimo 5 dias após hoje');
      return;
    }

    try {
      const dataVenc = new Date(editForm.dataVencimento);
      const updateData = {
        ...editForm,
        diaVencimento: dataVenc.getDate(),
        dataVencimento: editForm.dataVencimento,
        dataInicio: editForm.dataVencimento,
        valorParcela: editForm.valorTotal / editForm.qtdParticipantes,
      };
      await caixasService.update(id!, updateData);
      if (caixa) {
        setCaixa({
          ...caixa,
          ...editForm,
          diaVencimento: dataVenc.getDate(),
          dataVencimento: editForm.dataVencimento,
          valorParcela: editForm.valorTotal / editForm.qtdParticipantes,
        });
      }
      loadCaixa();
      setShowEditCaixa(false);

    } catch (error) {
      console.error('Erro ao atualizar:', error);
      if (caixa) {
        const dataVenc = new Date(editForm.dataVencimento);
        setCaixa({
          ...caixa,
          ...editForm,
          diaVencimento: dataVenc.getDate(),
          valorParcela: editForm.valorTotal / editForm.qtdParticipantes,
        });
      }
      setShowEditCaixa(false);
    }
  };

  const handleDeleteCaixa = async () => {
    if (caixa?.status === 'ativo') {
      alert('Não é possível excluir um caixa ativo. Apenas administradores master podem realizar esta ação.');
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await caixasService.delete(id!);
      navigate('/caixas');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      navigate('/caixas');
    }
  };

  // Função para comprimir imagem
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 400;
          const maxHeight = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        setImagePreview(compressedImage);
        setNewParticipante({ ...newParticipante, picture: compressedImage });
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        setErrorMessage('Erro ao processar imagem. Tente outra foto.');
        setShowErrorModal(true);
      }
    }
  };


  const handleAddParticipante = async () => {
    if (caixa && participantes.length >= (caixa.qtdParticipantes || 0)) {
      setErrorMessage('O caixa já está completo. Edite o caixa para aumentar participantes antes de adicionar.');
      setShowErrorModal(true);
      return;
    }
    if (!newParticipante.nome || !newParticipante.email || !newParticipante.telefone) {
      setErrorMessage('Preencha nome, email e telefone.');
      setShowErrorModal(true);
      return;
    }
    // Validar senha
    if (!newParticipante.senha || newParticipante.senha.length < 6) {
      setErrorMessage('Defina uma senha com pelo menos 6 caracteres.');
      setShowErrorModal(true);
      return;
    }
    try {
      const telefoneDigits = newParticipante.telefone.replace(/\D/g, '');
      const cpfDigits = newParticipante.cpf.replace(/\D/g, '');
      const zipDigits = newParticipante.address.zip.replace(/\D/g, '');

      const usuarioData = {
        nome: newParticipante.nome,
        email: newParticipante.email,
        telefone: telefoneDigits,
        cpf: cpfDigits,
        chavePix: newParticipante.chavePix,
        picture: newParticipante.picture,
        senha: newParticipante.senha,
        tipo: 'usuario' as const,
        criadoPorId: usuario?._id || '',
        criadoPorNome: usuario?.nome || '',
        address: {
          street: newParticipante.address.street,
          zone: newParticipante.address.zone,
          city: newParticipante.address.city,
          state: newParticipante.address.state,
          number: newParticipante.address.number,
          complement: newParticipante.address.complement,
          zip: zipDigits,
        },
      };

      const novoUsuario = await usuariosService.create(usuarioData);

      if (!novoUsuario || !novoUsuario._id) {
        throw new Error('Erro ao criar usuário no servidor');
      }

      const participante = await participantesService.create({
        caixaId: id,
        usuarioId: novoUsuario._id,
        aceite: true,
        status: 'ativo',
      });

      if (!participante) {
        throw new Error('Erro ao vincular participante ao caixa');
      }

      await loadParticipantes();
      setShowAddParticipante(false);
      setNewParticipante({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        chavePix: '',
        picture: '',
        senha: '',
        address: {
          street: '',
          zone: '',
          city: '',
          state: '',
          number: '',
          complement: '',
          zip: '',
        },
      });
      setSuccessMessage('Participante adicionado com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao adicionar participante:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao adicionar participante. Verifique os dados e tente novamente.';
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };


  const handleCepLookup = async (cep: string) => {
    // Remove non-digit characters
    const cepDigits = cep.replace(/\D/g, '');

    // Only proceed if we have 8 digits
    if (cepDigits.length !== 8) {
      return;
    }

    setCepLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await response.json();

      if (data.erro) {
        setErrorMessage('CEP não encontrado. Verifique e tente novamente.');
        setShowErrorModal(true);
        return;
      }

      // Auto-fill address fields
      setNewParticipante({
        ...newParticipante,
        address: {
          ...newParticipante.address,
          street: data.logradouro || newParticipante.address.street,
          zone: data.bairro || newParticipante.address.zone,
          city: data.localidade || newParticipante.address.city,
          state: data.uf || newParticipante.address.state,
          zip: cep,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setErrorMessage('Erro ao buscar CEP. Verifique sua conexão e tente novamente.');
      setShowErrorModal(true);
    } finally {
      setCepLoading(false);
    }
  };



  const loadUsuariosSemCaixa = async () => {
    try {
      // Buscar todos os usuários do tipo 'usuario'
      const responseUsuarios = await usuariosService.getAll();
      const listaUsuarios = Array.isArray(responseUsuarios) ? responseUsuarios : responseUsuarios.usuarios || [];
      const usuarios = listaUsuarios.filter((u: any) => u.tipo === 'usuario');

      // Buscar vínculos existentes de participantes
      const responseParticipantes = await participantesService.getAll();
      const listaParticipantes = Array.isArray(responseParticipantes) ? responseParticipantes : responseParticipantes.participantes || [];
      const usuariosComVinculo = new Set(
        listaParticipantes.map((p: any) => p.usuarioId?._id || p.usuarioId)
      );

      // Filtrar participantes que JÁ ESTÃO NESTE CAIXA
      const participantesNesteCaixa = new Set(
        participantes.map(p => p.usuarioId._id)
      );

      // Regra: não pode estar em 2 caixas simultaneamente → somente usuários sem vínculo
      // E também não pode adicionar quem já está neste caixa
      const livres = usuarios.filter((u: any) => !usuariosComVinculo.has(u._id) && !participantesNesteCaixa.has(u._id));
      setUsuariosSemCaixa(livres);
    } catch (error) {
      console.error('Erro ao carregar usuários sem caixa:', error);
      setUsuariosSemCaixa([]);
    }
  };

  const handleAddExistente = async () => {
    if (caixa && participantes.length >= (caixa.qtdParticipantes || 0)) {
      setErrorMessage('O caixa já está completo. Edite o caixa para aumentar participantes antes de adicionar.');
      setShowErrorModal(true);
      return;
    }
    if (!usuariosSelecionadosIds.length) {
      setErrorMessage('Selecione pelo menos um participante existente.');
      setShowErrorModal(true);
      return;
    }

    try {
      await Promise.all(
        usuariosSelecionadosIds.map(async (usuarioId) => {
          // TODO: impedir múltiplos caixas simultâneos para o mesmo participante (regra pode ser revista futuramente)
          try {
            const participacoes = await participantesService.getByUsuario(usuarioId);
            const lista = Array.isArray(participacoes) ? participacoes : participacoes?.participacoes || [];
            const temCaixaAtivo = lista.some((p: any) => String(p.caixaId?.status || p.status || '').toLowerCase() === 'ativo');
            if (temCaixaAtivo) {
              throw new Error('Este participante já está em um caixa em andamento.');
            }
          } catch (e: any) {
            if (e?.message?.includes('em andamento')) {
              throw e;
            }
          }
          const participante = await participantesService.create({
            caixaId: id,
            usuarioId,
            aceite: true,
            status: 'ativo',
          });

          if (!participante) {
            throw new Error('Erro ao vincular participante existente ao caixa');
          }
        })
      );

      await loadParticipantes();
      setShowAddExistente(false);
      setUsuariosSelecionadosIds([]);
      setSuccessMessage('Participantes existentes adicionados com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao adicionar participante existente:', error);
      const message = error.response?.data?.message || error.message || 'Erro ao adicionar participante existente.';
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };

  const handleRemoveParticipante = async (participanteId: string) => {
    try {
      await participantesService.delete(participanteId);
      const updatedParticipantes = participantes.filter((p) => p._id !== participanteId);
      setParticipantes(updatedParticipantes);
      saveParticipantes(updatedParticipantes);
      setShowParticipanteDetail(false);
      setSelectedParticipante(null);
      setShowRemoveParticipanteModal(false);
      setParticipanteToRemove(null);
      setSuccessMessage('Participante removido com sucesso!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao remover participante:', error);
      const message = error.response?.data?.message || 'Erro ao remover participante.';
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };

  const handleReorder = (newOrder: Participante[]) => {
    const updated = newOrder.map((p, idx) => ({ ...p, posicao: idx + 1 }));
    setParticipantes(updated);
    saveParticipantes(updated);
  };

  const saveOrder = async () => {
    try {
      for (const p of participantes) {
        await participantesService.definirPosicao(p._id, p.posicao || 0);
      }
      setIsReordering(false);
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      setIsReordering(false);
    }
  };

  const calcularBoletos = (participante: Participante): Boleto[] => {
    if (!caixa) return [];

    const boletos: Boleto[] = [];
    const isSemanal = caixa.tipo === 'semanal';

    // Parse the date without timezone conversion issues
    const dataInicioStr = caixa.dataVencimento || caixa.dataInicio || new Date().toISOString();
    const parts = dataInicioStr.split('T')[0].split('-');
    const baseYear = parseInt(parts[0]);
    const baseMonth = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const baseDay = caixa.diaVencimento || parseInt(parts[2]);

    const valorParcelaReal = caixa.valorTotal / caixa.qtdParticipantes;
    const numParcelas = caixa.qtdParticipantes;

    for (let parcela = 1; parcela <= numParcelas; parcela++) {
      let dataVencimento: Date;

      if (isSemanal) {
        dataVencimento = new Date(baseYear, baseMonth, baseDay);
        dataVencimento.setDate(dataVencimento.getDate() + ((parcela - 1) * 7));
      } else {
        const targetMonth = baseMonth + (parcela - 1);
        dataVencimento = new Date(baseYear, targetMonth, baseDay);
      }

      const correcaoIPCA = parcela > 1 ? valorParcelaReal * TAXA_IPCA_MENSAL : 0;
      const fundoReserva = parcela === 1 ? (valorParcelaReal / caixa.qtdParticipantes) : 0;
      const taxaAdmin = 0;
      const comissaoAdmin = parcela === numParcelas ? (caixa.valorTotal * 0.10) / caixa.qtdParticipantes : 0;

      const valorTotal = valorParcelaReal + TAXA_SERVICO + correcaoIPCA + fundoReserva + comissaoAdmin;
      const basePagamentos = selectedParticipante ? pagamentosParticipante : pagamentosMes;
      const pagamentoDoMes = basePagamentos.find((p) => {
        const pagador = p.pagadorId?._id || p.pagadorId;
        const usuarioId = (participante.usuarioId as any)?._id || participante.usuarioId;
        const statusPag = String(p.status || '').toLowerCase();
        return String(p.mesReferencia) === String(parcela) &&
          String(pagador) === String(usuarioId) &&
          ['aprovado', 'pago', 'paid'].includes(statusPag);
      });

      const isPago = Boolean(pagamentoDoMes);
      const isAtrasado = caixa.status === 'ativo' && !isPago && dataVencimento < new Date();

      boletos.push({
        mes: parcela,
        valorParcela: valorParcelaReal,
        taxaServico: TAXA_SERVICO,
        fundoReserva,
        taxaAdmin,
        comissaoAdmin,
        correcaoIPCA,
        valorTotal,
        dataVencimento: dataVencimento.toISOString(),
        status: caixa.status !== 'ativo' ? 'pendente' : (isPago ? 'pago' : isAtrasado ? 'atrasado' : 'pendente'),
        dataPagamento: isPago ? dataVencimento.toISOString() : undefined,
      });
    }

    return boletos;
  };

  const calcularDataRecebimento = (posicao: number): string => {
    if (!caixa?.dataInicio) return '-';
    const data = new Date(caixa.dataInicio);
    if (caixa.tipo === 'semanal') {
      data.setDate(data.getDate() + ((posicao - 1) * 7));
    } else {
      data.setMonth(data.getMonth() + posicao - 1);
      data.setDate(caixa.diaVencimento);
    }
    return formatDate(data.toISOString());
  };

  const getVencimentoAtual = (): string => {
    if (!caixa?.dataInicio) return '-';

    // Parse the date without timezone conversion issues
    const dataInicioStr = caixa.dataInicio;
    const parts = dataInicioStr.split('T')[0].split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const day = caixa.diaVencimento || parseInt(parts[2]);

    const atual = Math.max(1, caixa.mesAtual || 1);

    if (caixa.tipo === 'semanal') {
      // For weekly: add weeks
      const baseDate = new Date(year, month, day);
      baseDate.setDate(baseDate.getDate() + ((atual - 1) * 7));
      return formatDate(baseDate.toISOString());
    } else {
      // For monthly: add months and set day
      const targetMonth = month + (atual - 1);
      const data = new Date(year, targetMonth, day);
      return formatDate(data.toISOString());
    }
  };

  const getPrimeiraParcelaData = (): string => {
    if (!caixa?.dataInicio) return '-';
    const parts = caixa.dataInicio.split('T')[0].split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = caixa.tipo !== 'semanal' ? caixa.diaVencimento : parseInt(parts[2]);
    return formatDate(new Date(year, month, day).toISOString());
  };

  const getUltimaParcelaData = (): string => {
    if (!caixa?.dataInicio) return '-';
    const parts = caixa.dataInicio.split('T')[0].split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = caixa.diaVencimento || parseInt(parts[2]);

    if (caixa.tipo === 'semanal') {
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + ((caixa.qtdParticipantes - 1) * 7));
      return formatDate(d.toISOString());
    } else {
      const targetMonth = month + (caixa.qtdParticipantes - 1);
      return formatDate(new Date(year, targetMonth, day).toISOString());
    }
  };

  const getDataVencimentoParcela = (parcela: number): string => {
    if (!caixa?.dataInicio) return '-';

    // Parse the date without timezone conversion issues
    const parts = caixa.dataInicio.split('T')[0].split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const day = caixa.diaVencimento || parseInt(parts[2]);

    if (caixa.tipo === 'semanal') {
      const baseDate = new Date(year, month, day);
      baseDate.setDate(baseDate.getDate() + ((parcela - 1) * 7));
      return formatDate(baseDate.toISOString());
    } else {
      const targetMonth = month + (parcela - 1);
      const data = new Date(year, targetMonth, day);
      return formatDate(data.toISOString());
    }
  };

  const getStatusVencimento = (vencISO: string, isPago: boolean) => {
    const hoje = new Date();
    const venc = new Date(vencISO);
    const h0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const v0 = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());
    const diff = Math.floor((h0.getTime() - v0.getTime()) / 86400000);
    if (isPago) return { label: 'PAGO', variant: 'success' as const };
    if (diff === 0) return { label: 'VENCE HOJE', variant: 'warning' as const };
    if (diff > 0) return { label: `ATRASADO há ${diff} dia${diff > 1 ? 's' : ''}`, variant: 'danger' as const };
    return { label: 'EM DIA', variant: 'success' as const };
  };

  const pagosCount = pagamentosMes.filter((p) => {
    const s = String(p.status || '').toLowerCase();
    return ['aprovado', 'pago', 'paid', 'liquidated', 'settled'].includes(s);
  }).length;
  const pendentesCount = Math.max(0, participantes.length - pagosCount);
  const pagosSemana = caixa && participantes.length > 0
    ? pagamentosMes.filter((p) => {
      const s = String(p.status || '').toLowerCase();
      return ['aprovado', 'pago', 'paid', 'liquidated', 'settled'].includes(s);
    }).length
    : 0;
  const pendentesSemana = participantes.length - pagosSemana;
  const participantesFaltando = caixa ? Math.max(0, caixa.qtdParticipantes - participantes.length) : 0;
  const caixaCompleto = participantesFaltando === 0 && participantes.length > 0;
  const caixaIniciado = caixa?.status === 'ativo';


  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!caixa) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-center text-gray-500">Caixa não encontrado</p>
      </div>
    );
  }

  const recebedorAtual = participantes.find((p) => p.posicao === caixa.mesAtual);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>

        {/* Ações do Caixa */}
        <div className="flex gap-2">
          {/* Botões de Editar e Excluir - APENAS ADMIN/MASTER */}
          {(usuario?.tipo === 'master' || usuario?.tipo === 'administrador') && (
            <>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Edit className="w-4 h-4" />}
                onClick={() => setShowEditCaixa(true)}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Excluir
              </Button>
            </>
          )}
          {(usuario?.tipo === 'master' || caixa?.adminId?._id === usuario?._id) && (
            caixa?.status === 'ativo' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePause}
                className="bg-amber-500 text-white hover:bg-amber-600"
              >
                Pausar Caixa
              </Button>
            ) : caixa?.status === 'pausado' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleResume}
              >
                Reativar Caixa
              </Button>
            ) : null
          )}
        </div>
      </div>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={cn(
          "mb-6 overflow-hidden",
          caixaIniciado && "ring-2 ring-green-400"
        )}>
          <div className={cn(
            "-m-4 md:-m-5 mb-4 p-4 md:p-5 text-white",
            caixaIniciado
              ? "bg-gradient-to-r from-green-600 to-emerald-600"
              : "bg-gradient-to-r from-green-500 to-green-600"
          )}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold">{caixa.nome}</h1>
                  {caixaIniciado && (
                    <Badge className="bg-white text-green-600">
                      <Play className="w-3 h-3 mr-1" />
                      Em andamento
                    </Badge>
                  )}
                  {caixa?.status === 'pausado' && (
                    <Badge variant="warning" className="bg-white text-amber-600">
                      Pausado
                    </Badge>
                  )}
                  <span className="text-white/90 text-sm font-medium border-l border-white/30 pl-2 ml-1">
                    Tipo de Caixa: {caixa.tipo === 'semanal' ? 'Semanal' : 'Mensal'}
                  </span>
                </div>
                {caixa.adminId?.nome && (
                  <p className="text-white/80 text-xs mt-1">
                    Organizado por: {caixa.adminId.nome}
                  </p>
                )}
                <p className="text-white/80 text-sm mt-1">{caixa.descricao || 'Sem descrição'}</p>
              </div>
              <div className="flex items-center gap-2">
                {caixaCompleto && !caixaIniciado && (
                  <Badge className="bg-green-400/80 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Completo
                  </Badge>
                )}
                {participantesFaltando > 0 && (
                  <Badge variant="danger" className="bg-red-500/80 text-white">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Faltam {participantesFaltando}
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-end mb-2">
                <div className="flex flex-col">
                  <span className="text-white/90 font-medium text-lg">{progressoPercentual}%</span>
                  <span className="text-white/70 text-xs">Concluído</span>
                </div>
                <div className="text-right">
                  <span className="text-white/90 font-medium text-lg">{pagamentosRealizados}</span>
                  <span className="text-white/70 text-xs ml-1">pagamentos</span>
                </div>
              </div>

              <div className="h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressoPercentual}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                />
              </div>

              <div className="flex justify-end mt-1">
                <span className="text-white/60 text-xs">Meta: {totalPagamentosNecessarios} pagamentos</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className={cn(
              "text-center p-3 rounded-xl",
              participantesFaltando > 0 ? "bg-red-50 ring-2 ring-red-200" : "bg-gray-50"
            )}>
              <Users className={cn("w-5 h-5 mx-auto mb-1", participantesFaltando > 0 ? "text-red-500" : "text-green-500")} />
              <p className="text-xs text-gray-500">Participantes</p>
              <p className={cn("font-bold", participantesFaltando > 0 ? "text-red-600" : "text-gray-900")}>
                {participantes.length}/{caixa.qtdParticipantes}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <Wallet className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-gray-500">Valor Total</p>
              <p className="font-bold text-gray-900">{formatCurrency(caixa.valorTotal)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-gray-500">Primeira Parcela</p>
              <p className="font-bold text-gray-900">{getPrimeiraParcelaData()}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <Calendar className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-gray-500">Última Parcela</p>
              <p className="font-bold text-gray-900">{getUltimaParcelaData()}</p>
            </div>
          </div>

          {/* Alerta de participantes faltando */}
          {participantesFaltando > 0 && !caixaIniciado && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Caixa incompleto! Adicione mais {participantesFaltando} participante{participantesFaltando > 1 ? 's' : ''}.
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    O caixa só pode ser iniciado quando todos os participantes forem adicionados.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddParticipante(true)}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {/* Botão Iniciar Caixa - quando completo - APENAS ADMIN/MASTER */}
          {caixaCompleto && !caixaIniciado && (usuario?.tipo === 'master' || caixa?.adminId?._id === usuario?._id) && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-800">
                    🎉 Caixa completo! Pronto para iniciar.
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Todos os {caixa.qtdParticipantes} participantes foram adicionados.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowIniciarCaixa(true)}
                  leftIcon={<Play className="w-4 h-4" />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Iniciar Caixa
                </Button>
              </div>
            </div>
          )}

          {/* Convite */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Código de Convite</p>
              <p className="font-mono font-bold text-green-600">{caixa.codigoConvite}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                leftIcon={copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>
                Compartilhar
              </Button>
            </div>
          </div>

          {/* Pagamentos da Semana/Mês e Ganho do Admin */}
          {participantes.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Valor da Parcela</p>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total de {caixa.qtdParticipantes} parcelas</p>
                  <p className="text-sm text-gray-600">
                    {caixa.tipo === 'semanal' ? 'Semanais' : 'Mensais'}
                  </p>
                </div>
              </div>
              {caixaIniciado ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Resumo de Pagamentos
                    </h3>
                    <span className="text-sm text-gray-500">{participantes.length} participantes</span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {Array.from({ length: caixa.duracaoMeses }).map((_, idx) => {
                      const mes = idx + 1;
                      const pagosApiSet = new Set<string>();
                      todosPagamentos.forEach((p: any) => {
                        const s = String(p.status || '').toLowerCase();
                        if (p.mesReferencia === mes && ['aprovado', 'pago', 'paid', 'liquidated', 'settled'].includes(s)) {
                          const pid = p.pagadorId?._id || p.pagadorId;
                          pagosApiSet.add(String(pid));
                        }
                      });
                      const localSet = localPaidByMes[mes] || new Set<string>();
                      const pagos = new Set<string>([...pagosApiSet, ...localSet]).size;
                      const pendentes = Math.max(0, participantes.length - pagos);
                      const isCurrent = mes === caixa.mesAtual;
                      const isPast = mes < caixa.mesAtual;

                      return (
                        <div key={mes} className={cn(
                          "min-w-[150px] flex-1 p-3 rounded-xl border transition-all",
                          isCurrent
                            ? "bg-white border-blue-200 shadow-md ring-1 ring-blue-100 scale-105"
                            : isPast
                              ? "bg-gray-50 border-gray-100 opacity-80"
                              : "bg-white border-gray-200"
                        )}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className={cn("font-semibold text-sm", isCurrent ? "text-blue-700" : "text-gray-700")}>
                              {caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} {mes}
                            </h4>
                            {isCurrent && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">Atual</Badge>}
                            {isPast && pagos === participantes.length && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center bg-green-50/50 p-1.5 rounded">
                              <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Pagos
                              </span>
                              <span className="text-sm font-bold text-green-700">{pagos}</span>
                            </div>
                            <div className="flex justify-between items-center bg-amber-50/50 p-1.5 rounded">
                              <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pendentes
                              </span>
                              <span className="text-sm font-bold text-amber-700">{pendentes}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <Clock className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">Os pagamentos serão exibidos após o caixa ser iniciado</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">Seu ganho como administrador (10%)</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(caixa.valorTotal * 0.10)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recebedor do Mês */}
      {recebedorAtual && participantes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200/50">
            <div className="flex items-center gap-4">
              <Avatar
                name={recebedorAtual.usuarioId.nome}
                src={recebedorAtual.usuarioId.fotoUrl}
                size="lg"
              />
              <div className="flex-1">
                <p className="text-xs text-amber-700 font-medium">Recebe este mês</p>
                <p className="font-bold text-gray-900">{recebedorAtual.usuarioId.nome}</p>
                <p className="text-sm text-amber-600">
                  Valor: {formatCurrency(caixa.valorTotal)} • Vencimento: {getVencimentoAtual()}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30"
              >
                Pagar
              </Button>
            </div>
          </Card>
        </motion.div>
      )}


      {/* Tabs posicionadas acima do Cronograma */}

      {/* Tabs */}
      <div className="mb-2 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-green-600" />
        <h3 className="font-semibold text-gray-900">Cronograma de Pagamentos e Recebimentos</h3>
      </div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'participantes' && (
          <motion.div
            key="participantes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {/* BOTÕES APENAS PARA ADMIN/MASTER */}
              {(usuario?.tipo === 'master' || caixa?.adminId?._id === usuario?._id) && (
                <>
                  {participantes.length > 0 && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<UserPlus className="w-4 h-4" />}
                        onClick={() => setShowAddParticipante(true)}
                        disabled={caixaCompleto}
                      >
                        Cadastrar Participante
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<UserCheck className="w-4 h-4" />}
                        onClick={async () => {
                          await loadUsuariosSemCaixa();
                          setShowAddExistente(true);
                        }}
                        disabled={caixaCompleto}
                      >
                        Adicionar Existente
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Shuffle className="w-4 h-4" />}
                    onClick={handleSortear}
                    disabled={!caixaCompleto || caixaIniciado}
                  >
                    Sortear Posições
                  </Button>
                  <Button
                    variant={isReordering ? 'primary' : 'secondary'}
                    size="sm"
                    leftIcon={<GripVertical className="w-4 h-4" />}
                    onClick={() => isReordering ? saveOrder() : setIsReordering(true)}
                    disabled={!caixaCompleto || caixaIniciado}
                  >
                    {isReordering ? 'Salvar Ordem' : 'Reordenar'}
                  </Button>
                  {isReordering && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsReordering(false);
                        loadParticipantes();
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </>
              )}
              {caixa.status === 'aguardando' && participantesFaltando === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Play className="w-4 h-4" />}
                  onClick={handleAtivarCaixa}
                >
                  Iniciar Caixa
                </Button>
              )}
            </div>

            {/* Participantes List */}
            {participantes.length > 0 ? (
              (isReordering && !caixaIniciado) ? (
                <Reorder.Group
                  axis="y"
                  values={participantes}
                  onReorder={handleReorder}
                  className="space-y-3"
                >
                  {participantes.map((participante) => (
                    <Reorder.Item
                      key={participante._id}
                      value={participante}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <Card className="bg-white">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                            'bg-gray-100 text-gray-500'
                          )}>
                            {participante.posicao || '-'}
                          </div>
                          <Avatar
                            name={participante?.usuarioId?.nome || 'Sem nome'}
                            src={participante?.usuarioId?.fotoUrl}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {participante?.usuarioId?.nome || 'Sem nome'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {calcularDataRecebimento(participante.posicao || 0)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 p-2 bg-gray-100 rounded-2xl mb-4 overflow-x-auto shadow-sm">
                    {Array.from({ length: caixa.qtdParticipantes }).map((_, i) => {
                      const num = i + 1;
                      return (
                        <button
                          key={num}
                          onClick={() => setCronogramaParcela(num)}
                          className={cn(
                            'px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all',
                            cronogramaParcela === num
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md scale-105'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                          )}
                        >
                          {caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} {num}
                        </button>
                      );
                    })}
                  </div>
                  {participantes.map((participante, index) => {
                    const { isPago, isAtrasado, isVenceHoje } = obterStatusParticipante(participante, cronogramaParcela);
                    const isMaster = usuario?.tipo === 'master';
                    const isAdmin = isMaster || caixa?.adminId?._id === usuario?._id;
                    // Master: sempre vê lixeira
                    // Admin: vê lixeira apenas se participante SEM posição
                    // Participante comum: nunca vê lixeira
                    const canRemove = isMaster || (isAdmin && !participante.posicao);

                    // Check if this card belongs to the logged user (for participants only)
                    const isOwnCard = usuario?.tipo === 'usuario'
                      ? (participante.usuarioId?._id || participante.usuarioId) === usuario._id
                      : true; // Admin/Master can interact with all cards
                    const canInteract = usuario?.tipo !== 'usuario' || isOwnCard;

                    return (
                      <motion.div
                        key={participante._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          hover={canInteract}
                          onClick={() => {
                            if (!canInteract) return; // Block click for other participants' cards
                            setSelectedParticipante(participante);
                            setShowParticipanteDetail(true);
                          }}
                          className={cn(
                            "transition-all",
                            !canInteract && "cursor-default opacity-75", // Visual indication of read-only
                            isPago
                              ? 'ring-2 ring-blue-500 bg-blue-50'  // ← AZUL quando PAGO
                              : participante.posicao === caixa.mesAtual
                                ? 'ring-2 ring-green-400 bg-green-50/50'
                                : ''
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                if (!canRemove) return;
                                e.stopPropagation();
                                setParticipanteToRemove(participante);
                                setShowRemoveParticipanteModal(true);
                              }}
                              className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                                canRemove
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : isPago
                                    ? 'bg-blue-500 text-white'
                                    : participante.posicao === caixa.mesAtual
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-500'
                              )}
                            >
                              {canRemove ? (
                                <Trash2 className="w-4 h-4" />
                              ) : (
                                participante.posicao || '-'
                              )}
                            </button>

                            <Avatar
                              name={participante?.usuarioId?.nome || 'Sem nome'}
                              src={participante?.usuarioId?.fotoUrl}
                              size="md"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 truncate">
                                  {participante?.usuarioId?.nome || 'Sem nome'}
                                </p>

                                {/* Badge for own card (participante only) */}
                                {usuario?.tipo === 'usuario' && isOwnCard && (
                                  <Badge variant="info" size="sm" className="bg-green-100 text-green-700 border border-green-300">
                                    Você
                                  </Badge>
                                )}

                                {/* ← BADGES EM DIA + PAGO */}
                                {isPago ? (
                                  <>
                                    <Badge variant="success" size="sm" className="bg-white text-green-700 border border-green-200 shadow-sm">
                                      EM DIA
                                    </Badge>
                                    <Badge variant="success" size="sm" className="bg-purple-500 text-white shadow-sm">
                                      <Wallet className="w-3 h-3 mr-1" />
                                      Parcela {formatCurrency(caixa.valorParcela || (caixa.valorTotal / caixa.qtdParticipantes))}
                                    </Badge>
                                    <Badge variant="success" size="sm" className="bg-blue-500 text-white shadow-sm">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      PAGO
                                    </Badge>
                                  </>
                                ) : isAtrasado ? (
                                  <>
                                    <Badge variant="danger" size="sm">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      ATRASADO
                                    </Badge>
                                    <Badge variant="gray" size="sm" className="bg-gray-100 text-gray-600 shadow-sm">
                                      <Wallet className="w-3 h-3 mr-1" />
                                      Parcela {formatCurrency(
                                        calcularValorComIPCA(
                                          cronogramaParcela,
                                          caixa.valorParcela || (caixa.valorTotal / caixa.qtdParticipantes)
                                        )
                                      )}
                                    </Badge>
                                  </>
                                ) : isVenceHoje ? (
                                  <>
                                    <Badge variant="warning" size="sm">
                                      <Clock className="w-3 h-3 mr-1" />
                                      VENCE HOJE
                                    </Badge>
                                    <Badge variant="gray" size="sm" className="bg-gray-100 text-gray-600 shadow-sm">
                                      <Wallet className="w-3 h-3 mr-1" />
                                      Parcela {formatCurrency(
                                        calcularValorComIPCA(
                                          cronogramaParcela,
                                          caixa.valorParcela || (caixa.valorTotal / caixa.qtdParticipantes)
                                        )
                                      )}
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    <Badge variant="success" size="sm" className="bg-white text-green-700 border border-green-200 shadow-sm">
                                      EM DIA
                                    </Badge>
                                    <Badge variant="gray" size="sm" className="bg-gray-100 text-gray-600 shadow-sm">
                                      <Wallet className="w-3 h-3 mr-1" />
                                      Parcela {formatCurrency(
                                        calcularValorComIPCA(
                                          cronogramaParcela,
                                          caixa.valorParcela || (caixa.valorTotal / caixa.qtdParticipantes)
                                        )
                                      )}
                                    </Badge>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {getDataVencimentoParcela(cronogramaParcela)}
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {participante.usuarioId.telefone}
                                </span>
                              </div>
                            </div>

                            <div className="text-right block">
                              <p className="text-xs text-gray-500">Valor Pago</p>
                              <p className="font-bold text-green-700">
                                {(() => {
                                  const referenciaMes = cronogramaParcela;
                                  const base = caixa.valorParcela || (caixa.valorTotal / caixa.qtdParticipantes);
                                  const fundoReserva = referenciaMes === 1 ? (base / caixa.qtdParticipantes) : 0;
                                  const ipca = referenciaMes > 1 ? base * TAXA_IPCA_MENSAL : 0;
                                  const comissaoAdmin = referenciaMes === (caixa.duracaoMeses || caixa.qtdParticipantes) ? (caixa.valorTotal * 0.10) / caixa.qtdParticipantes : 0;
                                  const total = base + TAXA_SERVICO + fundoReserva + ipca + comissaoAdmin;
                                  return formatCurrency(isPago ? total : 0);
                                })()}
                              </p>
                            </div>

                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )
            ) : (
              <EmptyState
                icon={Users}
                title="Nenhum participante ainda"
                description="Cadastre os participantes do caixa ou use um existente para começar."
                actionLabel={caixaCompleto || caixaIniciado ? undefined : "Cadastrar Participante"}
                onAction={caixaCompleto || caixaIniciado ? undefined : (() => setShowAddParticipante(true))}
                secondaryActionLabel={caixaCompleto || caixaIniciado ? undefined : "Adicionar Existente"}
                onSecondaryAction={caixaCompleto || caixaIniciado ? undefined : (async () => {
                  await loadUsuariosSemCaixa();
                  setShowAddExistente(true);
                })}
              />
            )}

            <Card className="mt-6 mb-4 bg-blue-50 border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Composição do Boleto</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Parcela:</span>
                  <span className="font-medium text-gray-900 ml-1">{formatCurrency(caixa.valorParcela)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Taxa serviço:</span>
                  <span className="font-medium text-gray-900 ml-1">{formatCurrency(TAXA_SERVICO)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fundo reserva (1º):</span>
                  <span className="font-medium text-gray-900 ml-1">{formatCurrency((caixa.valorTotal / caixa.qtdParticipantes) / caixa.qtdParticipantes)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Comissão admin (último):</span>
                  <span className="font-medium text-gray-900 ml-1">{formatCurrency(caixa.valorTotal * 0.10)}</span>
                </div>
              </div>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <div>
                  <p className="font-medium text-gray-900">Parcela: {formatCurrency(caixa.valorParcela)}</p>
                  <p>
                    Valor correspondente à sua cota mensal no caixa coletivo, calculado pela divisão igualitária do montante total pelo número de participantes. Este é o valor base que compõe o fundo comum do grupo.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Taxa de Serviço: {formatCurrency(TAXA_SERVICO)}</p>
                  <p>
                    Valor cobrado pelo Gateway de Pagamento para processamento e geração de PIX e Boleto. Esta taxa cobre os custos operacionais do sistema de pagamentos, incluindo segurança nas transações financeiras, criptografia de dados, infraestrutura tecnológica e conformidade com regulamentações bancárias. Um Gateway de Pagamento é uma plataforma intermediária que conecta de forma segura os participantes aos meios de pagamento, garantindo que todas as transações sejam processadas com proteção contra fraudes e com total rastreabilidade.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Fundo de Reserva: {formatCurrency((caixa.valorTotal / caixa.qtdParticipantes) / caixa.qtdParticipantes)}</p>
                  <p>
                    Parcela adicional dividida igualitariamente entre todos os participantes para constituir uma reserva de segurança equivalente a um mês de operação.
                    Este fundo serve como proteção contra eventuais inadimplências, garantindo a continuidade dos pagamentos programados.
                    Ao final do ciclo do caixa, caso não haja necessidade de utilização, todo o valor do fundo é convertido como lucro do sistema/aplicação, sendo esse o único lucro do sistema de gestão de caixa.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Taxa IPCA: {formatCurrency(caixa.valorParcela * TAXA_IPCA_MENSAL)}</p>
                  <p>
                    Correção monetária aplicada para proteger o poder de compra ao longo do mês. Esta taxa compensa a inflação medida pelo Índice Nacional de Preços ao Consumidor Amplo (IPCA), evitando que a desvalorização da moeda impacte negativamente o valor real do caixa. Trata-se de um ajuste percentual mínimo que preserva o valor financeiro do grupo diante das oscilações econômicas mensais.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Comissão do Administrador: {formatCurrency(caixa.valorTotal * 0.10)}</p>
                  <p>
                    Remuneração do administrador responsável por recrutar e organizar o grupo, gerenciar as operações do caixa, manter comunicação ativa com os participantes e garantir o cumprimento dos pagamentos. Esta comissão corresponde a 10% do valor total do caixa e é paga exclusivamente no último mês do ciclo, pelos participantes, apenas se o caixa for concluído com sucesso e todas as obrigações forem cumpridas conforme planejado.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}



        {activeTab === 'configuracoes' && (
          <motion.div
            key="configuracoes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Informações do Caixa</h3>
                {/* Botão de Editar - APENAS ADMIN/MASTER */}
                {(usuario?.tipo === 'master' || usuario?.tipo === 'administrador') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit className="w-4 h-4" />}
                    onClick={() => setShowEditCaixa(true)}
                  >
                    Editar
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Nome</span>
                  <span className="font-medium">{caixa.nome}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Valor Total</span>
                  <span className="font-medium">{formatCurrency(caixa.valorTotal)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Valor Parcela</span>
                  <span className="font-medium">{formatCurrency(caixa.valorParcela)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Taxa Serviço</span>
                  <span className="font-medium">{formatCurrency(TAXA_SERVICO)}/mês</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Fundo Reserva (1º mês)</span>
                  <span className="font-medium">{formatCurrency((caixa.valorTotal / caixa.qtdParticipantes) / caixa.qtdParticipantes)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Correção IPCA</span>
                  <span className="font-medium">{(TAXA_IPCA_MENSAL * 100).toFixed(2)}%/mês</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Dia de Vencimento</span>
                  <span className="font-medium">Dia {caixa.diaVencimento}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Administrador</span>
                  <span className="font-medium">{caixa.adminId.nome}</span>
                </div>
              </div>

              {/* Botão de Excluir - APENAS ADMIN/MASTER */}
              {(usuario?.tipo === 'master' || usuario?.tipo === 'administrador') && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Button
                    variant="danger"
                    className="w-full"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Excluir Caixa
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Modal Adicionar Participante */}
      <Modal
        isOpen={showAddParticipante}
        onClose={() => setShowAddParticipante(false)}
        title="Cadastrar Participante"
        size="xl"
      >
        <div className="space-y-6 px-1">
          {/* Header com Foto e Campos Principais */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Esquerda: Foto */}
            <div className="flex flex-col items-center gap-3 pt-2 w-full md:w-auto flex-shrink-0">
              <div className="relative">
                <Avatar
                  src={imagePreview}
                  name={newParticipante.nome || 'Participante'}
                  size="xl"
                />
                <label
                  htmlFor="picture-upload-caixa"
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="picture-upload-caixa"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">Foto</p>
            </div>

            {/* Direita: Campos Principais */}
            <div className="flex-1 space-y-4">
              <Input
                label="Nome Completo *"
                placeholder="Nome do participante"
                leftIcon={<User className="w-4 h-4" />}
                value={newParticipante.nome}
                onChange={(e) => setNewParticipante({ ...newParticipante, nome: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email *"
                  type="email"
                  placeholder="email@exemplo.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={newParticipante.email}
                  onChange={(e) => setNewParticipante({ ...newParticipante, email: e.target.value })}
                />
                <Input
                  label="Telefone *"
                  placeholder="(11) 99999-9999"
                  leftIcon={<Phone className="w-4 h-4" />}
                  value={newParticipante.telefone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let masked = digits;
                    if (digits.length <= 10) {
                      masked = digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
                    } else {
                      masked = digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
                    }
                    setNewParticipante({ ...newParticipante, telefone: masked });
                  }}
                  maxLength={15}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={newParticipante.cpf}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const masked = digits
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    setNewParticipante({ ...newParticipante, cpf: masked });
                  }}
                  maxLength={14}
                />
                <Input
                  label="Chave PIX"
                  placeholder="CPF, email, telefone ou chave aleatória"
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  value={newParticipante.chavePix}
                  onChange={(e) => setNewParticipante({ ...newParticipante, chavePix: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <Input
              label="Senha *"
              type="password"
              placeholder="Defina a senha do participante"
              value={newParticipante.senha}
              onChange={(e) => setNewParticipante({ ...newParticipante, senha: e.target.value })}
            />
          </div>

          {/* Seção de Endereço */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" />
              Endereço Completo
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    leftIcon={<MapPin className="w-4 h-4" />}
                    value={newParticipante.address.zip}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const masked = digits.replace(/(\d{5})(\d)/, '$1-$2');
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, zip: masked },
                      });
                    }}
                    onBlur={(e) => handleCepLookup(e.target.value)}
                    maxLength={9}
                    disabled={cepLoading}
                  />
                  {cepLoading && (
                    <p className="text-xs text-blue-600 mt-1">Buscando endereço...</p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <Input
                    label="Rua / Logradouro"
                    placeholder="Nome da rua"
                    value={newParticipante.address.street}
                    onChange={(e) =>
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, street: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Input
                    label="Número"
                    placeholder="123"
                    value={newParticipante.address.number}
                    onChange={(e) =>
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, number: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    label="Complemento"
                    placeholder="Apto 101"
                    value={newParticipante.address.complement}
                    onChange={(e) =>
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, complement: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Bairro"
                    placeholder="Bairro"
                    value={newParticipante.address.zone}
                    onChange={(e) =>
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, zone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Input
                    label="Cidade"
                    placeholder="Cidade"
                    value={newParticipante.address.city}
                    onChange={(e) =>
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, city: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    className="w-full h-[42px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    value={newParticipante.address.state}
                    onChange={(e) =>
                      setNewParticipante({
                        ...newParticipante,
                        address: { ...newParticipante.address, state: e.target.value },
                      })
                    }
                  >
                    <option value="">UF</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <Button variant="secondary" className="flex-1" size="lg" onClick={() => setShowAddParticipante(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              size="lg"
              onClick={handleAddParticipante}
              disabled={!newParticipante.nome || !newParticipante.email || !newParticipante.telefone || !newParticipante.senha}
            >
              Cadastrar
            </Button>
          </div>
        </div>
      </Modal>


      {/* Modal Adicionar Participante Existente */}
      <Modal
        isOpen={showAddExistente}
        onClose={() => setShowAddExistente(false)}
        title="Adicionar Participante Existente"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            leftIcon={<Search className="w-4 h-4" />}
            value={searchUsuario}
            onChange={(e) => setSearchUsuario(e.target.value)}
          />
          <div className="max-h-64 overflow-auto border border-gray-100 rounded-xl">
            {usuariosSemCaixa
              .filter((u) => {
                if (!searchUsuario) return true;
                const term = searchUsuario.toLowerCase();
                return (
                  (u.nome || '').toLowerCase().includes(term) ||
                  (u.email || '').toLowerCase().includes(term) ||
                  (u.telefone || '').toLowerCase().includes(term)
                );
              })
              .map((u) => {
                const selecionado = usuariosSelecionadosIds.includes(u._id);
                return (
                  <button
                    key={u._id}
                    onClick={() =>
                      setUsuariosSelecionadosIds((prev) =>
                        prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id]
                      )
                    }
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 text-left',
                      selecionado && 'bg-green-50'
                    )}
                  >
                    <Avatar name={u.nome} src={u.fotoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{u.nome}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email} • {u.telefone}</p>
                    </div>
                    <Badge variant={selecionado ? 'success' : 'gray'} size="sm">
                      {selecionado ? 'Selecionado' : 'Selecionar'}
                    </Badge>
                  </button>
                );
              })}
            {usuariosSemCaixa.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">Nenhum participante disponível sem caixa.</div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowAddExistente(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddExistente}
              disabled={!usuariosSelecionadosIds.length}
            >
              Adicionar ao Caixa
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRemoveParticipanteModal}
        onClose={() => {
          setShowRemoveParticipanteModal(false);
          setParticipanteToRemove(null);
        }}
        title="Remover Participante"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-700 mb-6">
            Tem certeza que deseja remover {participanteToRemove?.usuarioId?.nome || 'este participante'} do caixa?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowRemoveParticipanteModal(false);
                setParticipanteToRemove(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!participanteToRemove) return;
                await handleRemoveParticipante(participanteToRemove._id);
              }}
            >
              Remover
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Caixa */}
      <Modal
        isOpen={showEditCaixa}
        onClose={() => setShowEditCaixa(false)}
        title="Editar Caixa"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nome do Caixa"
            value={editForm.nome}
            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
            leftIcon={<Wallet className="w-4 h-4" />}
          />
          <div>
            <label className="label">Descrição</label>
            <textarea
              className="input resize-none h-16"
              value={editForm.descricao}
              onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
              placeholder="Descreva o objetivo deste caixa..."
            />
          </div>

          {/* Tipo do Caixa */}
          <div>
            <label className="label">Tipo do Caixa</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, tipo: 'mensal' })}
                className={cn(
                  'p-2 rounded-xl border-2 text-center transition-all',
                  editForm.tipo === 'mensal'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-200'
                )}
              >
                <span className="font-semibold block">Mensal</span>
                <span className="text-xs text-gray-500">Até 12 meses/part.</span>
              </button>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, tipo: 'semanal' })}
                className={cn(
                  'p-2 rounded-xl border-2 text-center transition-all',
                  editForm.tipo === 'semanal'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-200'
                )}
              >
                <span className="font-semibold block">Semanal</span>
                <span className="text-xs text-gray-500">Até 24 sem./part.</span>
              </button>
            </div>
          </div>

          {/* Valor Total */}
          <Input
            label="Valor Total (R$)"
            type="number"
            min={500}
            value={editForm.valorTotal}
            onChange={(e) => setEditForm({ ...editForm, valorTotal: parseInt(e.target.value) || 500 })}
            leftIcon={<span className="text-gray-400">R$</span>}
          />

          {/* Participantes - Com opção personalizada */}
          <div>
            <label className="label">Número de Participantes (= número de parcelas)</label>
            <Input
              type="number"
              min={2}
              max={editForm.tipo === 'semanal' ? 24 : 12}
              value={editForm.qtdParticipantes}
              onChange={(e) => {
                const val = Math.max(2, Math.min(parseInt(e.target.value) || 2, editForm.tipo === 'semanal' ? 24 : 12));
                setEditForm({ ...editForm, qtdParticipantes: val });
              }}
              leftIcon={<Users className="w-4 h-4" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo: {editForm.tipo === 'semanal' ? '24' : '12'} participantes
            </p>
          </div>

          {/* Duração - Independente */}
          <div>
            <label className="label">Duração ({editForm.tipo === 'semanal' ? 'semanas' : 'meses'})</label>
            <Input
              type="number"
              min={2}
              max={editForm.tipo === 'semanal' ? 24 : 12}
              value={editForm.duracaoMeses}
              onChange={(e) => {
                const val = Math.max(2, Math.min(parseInt(e.target.value) || 2, editForm.tipo === 'semanal' ? 24 : 12));
                setEditForm({ ...editForm, duracaoMeses: val });
              }}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Recomendado: duração = número de participantes
            </p>
          </div>

          {/* Data de Vencimento da Primeira Parcela */}
          <div>
            <label className="label">Data de Vencimento da 1ª Parcela</label>
            <Input
              type="date"
              min={getMinDataVencimento()}
              value={editForm.dataVencimento}
              onChange={(e) => setEditForm({ ...editForm, dataVencimento: e.target.value })}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo: 5 dias a partir de hoje
            </p>
          </div>

          {/* Resumo */}
          <div className="p-3 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600 font-medium mb-2">Resumo:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Parcela:</span>
                <span className="font-semibold">{formatCurrency(editForm.valorTotal / editForm.qtdParticipantes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Seu ganho (10%):</span>
                <span className="font-semibold text-green-700">{formatCurrency(editForm.valorTotal * 0.10)}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-600">Total de parcelas:</span>
                <span className="font-semibold">{editForm.qtdParticipantes} {editForm.tipo === 'semanal' ? 'semanas' : 'meses'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditCaixa(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleUpdateCaixa}
              disabled={!isDataVencimentoValida(editForm.dataVencimento)}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </Modal>


      {/* Modais de Configuração e Iniciar Caixa */}
      <ConfiguracoesObrigatoriasCaixa
        showSplitConfigModal={showSplitConfigModal}
        setShowSplitConfigModal={setShowSplitConfigModal}
        splitConfigStatus={splitConfigStatus}
        participantesSubcontasStatus={participantesSubcontasStatus}
        verificarConfiguracaoSplitDetalhada={verificarConfiguracaoSplitDetalhada}
        usuarioTipo={usuario?.tipo}
        showIniciarCaixa={showIniciarCaixa}
        setShowIniciarCaixa={setShowIniciarCaixa}
        caixa={caixa}
        participantes={participantes}
        aceiteContrato={aceiteContrato}
        setAceiteContrato={setAceiteContrato}
        handleIniciarCaixa={handleIniciarCaixa}
      />
      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Excluir Caixa"
        size="sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-600 mb-2">
            Tem certeza que deseja excluir o caixa <strong>{caixa.nome}</strong>?
          </p>
          <p className="text-sm text-red-600 mb-6">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteCaixa}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Detalhes de Pagamento */}
      <DetalhesPagamento
        isOpen={showParticipanteDetail}
        onClose={() => {
          setShowParticipanteDetail(false);
          setSelectedParticipante(null);
        }}
        caixa={caixa}
        participante={selectedParticipante}
        onRefreshPagamentos={loadPagamentos}
        onPaidUpdate={markPaid}
      />

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Erro"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-gray-700 mb-6">{errorMessage}</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowErrorModal(false)}
          >
            OK
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Sucesso"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-700 mb-6">{successMessage}</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowSuccessModal(false)}
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
