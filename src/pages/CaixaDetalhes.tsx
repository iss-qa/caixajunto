import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { caixasService, participantesService, usuariosService, cobrancasService, pagamentosService } from '../lib/api';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate, cn } from '../lib/utils';

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
  { id: 'pagamentos', label: 'Pagamentos', icon: Wallet },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

// Taxa IPCA mensal estimada (0.4% ao mês)
const TAXA_IPCA_MENSAL = 0.0041;
const TAXA_SERVICO = 5;
const FUNDO_RESERVA = 50;

export function CaixaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('participantes');
  const [showAddParticipante, setShowAddParticipante] = useState(false);
  const [showEditCaixa, setShowEditCaixa] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showParticipanteDetail, setShowParticipanteDetail] = useState(false);
  const [selectedParticipante, setSelectedParticipante] = useState<Participante | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Estados para cobrança
  const [showCobranca, setShowCobranca] = useState(false);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);
  const [cobrancaGerada, setCobrancaGerada] = useState<{
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
  } | null>(null);
  const [boletoSelecionado, setBoletoSelecionado] = useState<number | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [expandedMes, setExpandedMes] = useState<number | null>(null);
  const [paymentTab, setPaymentTab] = useState<'pix' | 'boleto'>('pix');
  const [cobrancasPorMes, setCobrancasPorMes] = useState<Record<number, CobrancaInfo>>({});
  const [newParticipante, setNewParticipante] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    chavePix: '',
    picture: '',
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [editForm, setEditForm] = useState({
    nome: '',
    descricao: '',
    tipo: 'mensal' as 'mensal' | 'semanal',
    valorTotal: 5000,
    qtdParticipantes: 10,
    duracaoMeses: 10,
    dataVencimento: '', // Data completa de vencimento da primeira parcela
  });
  const [showIniciarCaixa, setShowIniciarCaixa] = useState(false);
  const [aceiteContrato, setAceiteContrato] = useState(false);
  const [customParticipantes, setCustomParticipantes] = useState(false);
  const [customDuracao, setCustomDuracao] = useState(false);

  const [pagamentosMes, setPagamentosMes] = useState<any[]>([]);
  const [todosPagamentos, setTodosPagamentos] = useState<any[]>([]);
  const [pagamentosParticipante, setPagamentosParticipante] = useState<any[]>([]);

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

      // Atualizar pagamentosMes para compatibilidade (embora vamos usar todosPagamentos no dashboard)
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
    // removido polling de caixa/mes
  }, [caixa?._id, caixa?.mesAtual]);

  const [lytexPaymentDetails, setLytexPaymentDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    setCobrancasPorMes({});
    setLytexPaymentDetails({});
  }, [selectedParticipante?._id]);

  useEffect(() => {
    const loadPaymentDetails = async () => {
      if (!caixa?._id || !selectedParticipante?._id) return;

      try {
        // Buscar todas as associações de uma vez para evitar falhas individuais
        const response = await cobrancasService.getAllByAssociacao({
          caixaId: caixa._id,
          participanteId: selectedParticipante._id,
        });

        const cobrancas = response.cobrancas || [];

        // Agrupar cobranças por mês para verificar todas as possibilidades
        const cobrancasByMes = new Map<number, any[]>();
        for (const c of cobrancas) {
          const list = cobrancasByMes.get(c.mesReferencia) || [];
          list.push(c);
          cobrancasByMes.set(c.mesReferencia, list);
        }

        const updatesCobrancas: Record<number, CobrancaInfo> = {};
        const updatesLytex: Record<string, any> = {};

        // Processar cada mês em paralelo
        await Promise.all(Array.from(cobrancasByMes.entries()).map(async ([mes, candidates]) => {
          // Verificar status no Lytex de TODAS as cobranças desse mês para encontrar alguma paga
          const candidatesWithStatus = await Promise.all(candidates.map(async (c) => {
            if (!c.lytexId) return { ...c, isPaid: false, lytexDetail: null };
            try {
              // Sync com Lytex
              const invoiceResp = await cobrancasService.buscar(c.lytexId, {
                caixaId: caixa._id,
                participanteId: selectedParticipante._id,
                mes: mes
              });

              const pd = await cobrancasService.paymentDetail(c.lytexId);
              const detail = pd?.paymentDetail || pd?.detail || pd;
              const invoice = invoiceResp?.cobranca || {};
              const status = invoice.status || detail?.status || c.status;
              const statusNormalized = String(status || '').toLowerCase();
              const isPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(statusNormalized);

              const fullDetail = {
                ...detail,
                ...invoice,
                status: isPaid ? 'PAGO' : status
              };

              // Guardar para atualização de estado global
              updatesLytex[c.lytexId] = fullDetail;

              return { ...c, isPaid, lytexDetail: fullDetail, rawInvoice: invoice };
            } catch (e) {
              console.warn(`Erro ao verificar candidato ${c.lytexId}`, e);
              return { ...c, isPaid: false, lytexDetail: null };
            }
          }));

          // Lógica de Priorização:
          // 1. Cobrança PAGA
          // 2. Cobrança mais recente (assumindo que candidates[0] é a mais recente pois vem do backend ordenado)
          // Se a ordem não for garantida, podemos ordenar por createdAt se disponível, mas vamos confiar na ordem do array
          const paidCandidate = candidatesWithStatus.find(c => c.isPaid);
          const winner = paidCandidate || candidatesWithStatus[0];

          if (winner) {
            const inv = winner.rawInvoice || {};
            updatesCobrancas[mes] = {
              id: winner.lytexId,
              valor: inv.total ? inv.total / 100 : (winner.valor || 0),
              descricao: winner.descricao || '',
              paymentUrl: inv.paymentUrl || winner.paymentUrl,
              pix: inv.pix || winner.pix,
              boleto: inv.boleto || winner.boleto
            };
          }
        }));

        // Atualizar estado
        setCobrancasPorMes(prev => ({ ...prev, ...updatesCobrancas }));
        setLytexPaymentDetails(prev => ({ ...prev, ...updatesLytex }));

      } catch (e) {
        console.warn('Erro ao carregar detalhes do pagamento', e);
      }
    };

    // Polling a cada 5 segundos para atualização em tempo real
    let intervalId: any;
    if (showParticipanteDetail && selectedParticipante) {
      loadPaymentDetails(); // Carga inicial
      intervalId = setInterval(loadPaymentDetails, 3000); // Polling
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showParticipanteDetail, selectedParticipante?._id, caixa?._id, expandedMes, refreshTick]);

  const loadCaixa = async () => {
    try {
      const response = await caixasService.getById(id!);
      setCaixa(response);
      // Calcular data de vencimento baseada no diaVencimento existente
      const dataVenc = new Date();
      if (response.diaVencimento) {
        dataVenc.setDate(response.diaVencimento);
        if (dataVenc <= new Date()) {
          dataVenc.setMonth(dataVenc.getMonth() + 1);
        }
      } else {
        dataVenc.setDate(dataVenc.getDate() + 5);
      }
      setEditForm({
        nome: response.nome,
        descricao: response.descricao || '',
        tipo: response.tipo || 'mensal',
        valorTotal: response.valorTotal,
        qtdParticipantes: response.qtdParticipantes,
        duracaoMeses: response.duracaoMeses,
        dataVencimento: dataVenc.toISOString().split('T')[0],
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
        // Filtrar participantes válidos (com usuarioId não nulo)
        const participantesValidos = response.filter((p: Participante) =>
          p.usuarioId && p.usuarioId._id
        );
        setParticipantes(participantesValidos);
        saveParticipantes(participantesValidos);
      } else {
        // Se não houver participantes, apenas limpar a lista
        setParticipantes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      // Em caso de erro, apenas mostrar lista vazia
      setParticipantes([]);
    }
  };

  const minutesSince = (iso?: string) => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    return min < 0 ? 0 : min;
  };

  const BoletoBarcode = ({ value }: { value: string }) => {
    return (
      <Barcode
        value={value}
        format="CODE128"
        displayValue={false}
        lineColor="#111827"
        width={2}
        height={72}
        margin={0}
      />
    );
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
    try {
      await caixasService.alterarStatus(id!, 'ativo');
      loadCaixa();
    } catch (error) {
      console.error('Erro ao ativar:', error);
    }
  };

  const handleIniciarCaixa = async () => {
    if (!aceiteContrato) return;

    try {
      await caixasService.alterarStatus(id!, 'ativo');
      if (caixa) {
        setCaixa({ ...caixa, status: 'ativo', mesAtual: 1, dataInicio: new Date().toISOString() });
      }
      setShowIniciarCaixa(false);
      setAceiteContrato(false);
    } catch (error) {
      console.error('Erro ao iniciar caixa:', error);
      // Mock: atualizar localmente
      if (caixa) {
        setCaixa({ ...caixa, status: 'ativo', mesAtual: 1, dataInicio: new Date().toISOString() });
      }
      setShowIniciarCaixa(false);
      setAceiteContrato(false);
    }
  };

  // Função para gerar datas de recebimento
  const gerarCronograma = () => {
    if (!caixa) return [];

    const cronograma = [];
    const dataBase = caixa.dataInicio ? new Date(caixa.dataInicio) : new Date();
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
      // Converter dataVencimento em diaVencimento para o backend
      const dataVenc = new Date(editForm.dataVencimento);
      const updateData = {
        ...editForm,
        diaVencimento: dataVenc.getDate(),
        dataInicio: editForm.dataVencimento,
        valorParcela: editForm.valorTotal / editForm.qtdParticipantes,
      };
      await caixasService.update(id!, updateData);
      // Atualizar localmente
      if (caixa) {
        setCaixa({
          ...caixa,
          ...editForm,
          diaVencimento: dataVenc.getDate(),
          valorParcela: editForm.valorTotal / editForm.qtdParticipantes,
        });
      }
      loadCaixa();
      setShowEditCaixa(false);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      // Atualizar localmente mesmo com erro
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
    // Não permitir excluir caixa ativo (exceto master)
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

  const handleAddParticipante = async () => {
    if (!newParticipante.nome || !newParticipante.email || !newParticipante.telefone) {
      alert('Preencha nome, email e telefone.');
      return;
    }
    try {
      // Primeiro cria o usuário
      const usuario = await usuariosService.create({
        ...newParticipante,
        tipo: 'usuario',
        senha: 'Senha@123',
      });

      if (!usuario || !usuario._id) {
        throw new Error('Erro ao criar usuário no servidor');
      }

      // Depois adiciona como participante
      const participante = await participantesService.create({
        caixaId: id,
        usuarioId: usuario._id,
        aceite: true,
        status: 'ativo',
      });

      if (!participante) {
        throw new Error('Erro ao vincular participante ao caixa');
      }

      // Sucesso - recarregar lista
      await loadParticipantes();
      setShowAddParticipante(false);
      setNewParticipante({ nome: '', email: '', telefone: '', cpf: '', chavePix: '', picture: '' });
      alert('Participante adicionado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao adicionar participante:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao adicionar participante. Verifique os dados e tente novamente.';
      alert(`Erro ao adicionar participante:\n\n${errorMessage}`);
    }
  };

  const handleRemoveParticipante = async (participanteId: string) => {
    try {
      await participantesService.delete(participanteId);
    } catch (error) {
      console.error('Erro ao remover participante:', error);
    }
    // Remover localmente
    const updatedParticipantes = participantes.filter(p => p._id !== participanteId);
    setParticipantes(updatedParticipantes);
    saveParticipantes(updatedParticipantes);
    setShowParticipanteDetail(false);
    setSelectedParticipante(null);
  };

  // Função para gerar cobrança PIX/Boleto
  const handleGerarCobranca = async (boleto: any) => {
    if (!selectedParticipante || !caixa) return;
    // Cache: se já existe cobrança gerada para este mês/semana, não gerar novamente
    if (cobrancasPorMes[boleto.mes]) {
      setExpandedMes(boleto.mes);
      setPaymentTab('pix');
      try {
        const existing = cobrancasPorMes[boleto.mes];
        if (existing?.id) {
          const resp = await cobrancasService.buscar(existing.id, {
            caixaId: caixa._id,
            participanteId: selectedParticipante._id,
            mes: boleto.mes
          });
          const invoice = resp?.cobranca || {};
          const status = String(invoice.status || '').toLowerCase();
          const isPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(status);
          setLytexPaymentDetails((prev) => ({
            ...prev,
            [existing.id]: { ...invoice, status: isPaid ? 'PAGO' : invoice.status }
          }));
          setCobrancasPorMes((prev) => ({
            ...prev,
            [boleto.mes]: {
              ...prev[boleto.mes],
              paymentUrl: invoice.paymentUrl || prev[boleto.mes]?.paymentUrl,
              pix: invoice.pix || prev[boleto.mes]?.pix,
              boleto: invoice.boleto || prev[boleto.mes]?.boleto
            }
          }));
        }
      } catch { }
      return;
    }

    setGerandoCobranca(true);
    setBoletoSelecionado(boleto.mes);

    try {
      const payload = {
        participante: {
          nome: selectedParticipante.usuarioId?.nome || 'Participante',
          // Sandbox: Lytex aceita apenas os CPFs fictícios. Se não houver CPF, usamos um dos válidos.
          cpf: selectedParticipante.usuarioId?.cpf || '96050176876',
          email: selectedParticipante.usuarioId?.email || 'sandbox@example.com',
          telefone: selectedParticipante.usuarioId?.telefone || '71999999999',
        },
        caixa: {
          nome: caixa.nome,
          tipo: caixa.tipo || 'mensal',
          valorParcela: boleto.valorParcela,
          taxaServico: boleto.taxaServico,
          taxaAdministrativa: boleto.fundoReserva,
          correcaoIPCA: boleto.correcaoIPCA,
          comissaoAdmin: boleto.comissaoAdmin,
          mesOuSemana: boleto.mes,
          totalParcelas: caixa.qtdParticipantes,
        },
        caixaId: caixa._id,
        participanteId: selectedParticipante.usuarioId?._id || (selectedParticipante as any).usuarioId,
        mesReferencia: boleto.mes,
        dataVencimento: boleto.dataVencimento,
        habilitarPix: true,
        habilitarBoleto: true,
      };
      console.group('Pagamento: gerar cobrança');
      console.log('Payload', payload);
      console.groupEnd();
      const response = await cobrancasService.gerar(payload);

      if (response.success) {
        const d = response.cobranca;
        try {
          console.group('Pagamento: resposta cobrança');
          console.log('success', response.success);
          console.log('cobranca', d);
          console.log('paymentMethods.pix', d?.paymentMethods?.pix);
          console.log('paymentMethods.boleto', d?.paymentMethods?.boleto);
          console.log('linkBoleto', d?.linkBoleto);
          console.groupEnd();
        } catch { }
        const mapped: CobrancaInfo = {
          id: d?.id || d?._id || `${selectedParticipante._id}-${boleto.mes}`,
          valor: typeof d?.valorCentavos === 'number' ? d.valorCentavos / 100 : (typeof d?.totalValue === 'number' ? d.totalValue / 100 : boleto.valorTotal),
          descricao: `Pagamento ${caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} ${boleto.mes} - ${selectedParticipante.usuarioId?.nome || 'Participante'}`,
          paymentUrl: d?.linkCheckout || d?.paymentUrl,
          pixGeneratedAt: undefined,
          pix: d?.pix ? {
            qrCode: d.pix.qrCode || '',
            copiaCola: d.pix.copyPaste || '',
          } : undefined,
          boleto: d?.boleto ? {
            codigoBarras: d.boleto.barCode || '',
            linhaDigitavel: d.boleto.digitableLine || '',
            url: d.boleto.url,
          } : undefined,
        };
        try {
          console.group('Pagamento: mapeamento cobrança');
          console.log('mapped.pix', mapped.pix);
          console.log('mapped.boleto', mapped.boleto);
          console.groupEnd();
        } catch { }
        // Tentar enriquecer com os detalhes completos via GET na Lytex
        let enriched = mapped;
        const lytexId = d?._id || d?.id;
        if (lytexId) {
          try {
            const buscarResp = await cobrancasService.buscar(lytexId);
            const inv = buscarResp?.cobranca || buscarResp?.invoice || buscarResp;
            if (inv) {
              const tx = Array.isArray(inv.transactions) ? inv.transactions[0] : undefined;
              const valorCents = tx?.value ?? inv?.totalValue;
              const pixCreated = tx?.createdAt || tx?.created_at || inv?.createdAt || inv?.created_at;
              enriched = {
                id: inv?._id || lytexId,
                valor: typeof valorCents === 'number' ? Math.round(valorCents) / 100 : mapped.valor,
                descricao: mapped.descricao,
                paymentUrl: inv?.linkCheckout || mapped.paymentUrl,
                pixGeneratedAt: pixCreated,
                pix: (tx?.pix || inv?.paymentMethods?.pix || inv?.pix) ? {
                  qrCode: tx?.pix?.qrcode || inv?.paymentMethods?.pix?.qrcode || mapped.pix?.qrCode || '',
                  // Se o EMV não vier, usamos o QRCode como copiaCola, pois a Lytex às vezes retorna o EMV no campo qrcode
                  copiaCola: tx?.pix?.emv || tx?.pix?.qrcode || inv?.paymentMethods?.pix?.emv || inv?.pix?.copyPaste || mapped.pix?.copiaCola || '',
                } : mapped.pix,
                boleto: tx?.boleto || inv?.boleto || inv?.paymentMethods?.boleto ? {
                  codigoBarras: tx?.boleto?.barcode || inv?.paymentMethods?.boleto?.barcode || mapped.boleto?.codigoBarras || '',
                  linhaDigitavel: tx?.boleto?.digitableLine || inv?.paymentMethods?.boleto?.digitableLine || mapped.boleto?.linhaDigitavel || '',
                  url: inv?.linkBoleto || mapped.boleto?.url,
                } : mapped.boleto,
              };
              try {
                console.group('Pagamento: detalhes Lytex GET');
                console.log('invoice', inv);
                console.log('transactions[0]', tx);
                console.groupEnd();
              } catch { }
            }
          } catch (e) {
            try { console.warn('Falha ao enriquecer com GET Lytex', e); } catch { }
          }
        }
        setCobrancaGerada(enriched);
        setCobrancasPorMes((prev) => ({ ...prev, [boleto.mes]: enriched }));
        setExpandedMes(boleto.mes);
        setPaymentTab('pix');
        try {
          const interval = setInterval(async () => {
            try {
              const lista = await pagamentosService.getByCaixaMes(caixa._id, Math.max(1, caixa.mesAtual));
              setPagamentosMes(Array.isArray(lista) ? lista : []);
            } catch { }
          }, 4000);
          setTimeout(() => clearInterval(interval), 20000);
        } catch { }
      } else {
        alert(response.message || 'Erro ao gerar cobrança');
      }
    } catch (error: any) {
      console.error('Erro ao gerar cobrança:', error);
      const msg = error?.response?.status === 401 ? 'Credenciais inválidas para a API de pagamentos' : 'Erro ao gerar cobrança. Tente novamente.';
      alert(msg);
    } finally {
      setGerandoCobranca(false);
      setBoletoSelecionado(null);
    }
  };

  // Função para copiar código PIX
  const handleCopyPix = async () => {
    if (cobrancaGerada?.pix?.copiaCola) {
      await navigator.clipboard.writeText(cobrancaGerada.pix.copiaCola);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const handleCopyPixMes = async (mes: number) => {
    const c = cobrancasPorMes[mes];
    if (!c?.pix?.copiaCola) return;
    await navigator.clipboard.writeText(c.pix.copiaCola);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePrintPixMes = (mes: number) => {
    const c = cobrancasPorMes[mes];
    const emv = c?.pix?.copiaCola || '';
    if (!emv) return;
    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100');
    if (!w) return;
    w.document.write('<html><head><title>PIX</title></head><body style="font-family: system-ui;">');
    w.document.write(`<div style="padding:24px;">
      <h1 style="font-size:18px;margin:0 0 12px 0;color:#111;">Código PIX (EMV)</h1>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-family: monospace;font-size:12px;color:#444;word-break:break-all;">${emv}</div>
      </div>
    </div>`);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const handleCopyBoletoMes = async (mes: number) => {
    const c = cobrancasPorMes[mes];
    if (!c?.boleto?.linhaDigitavel) return;
    await navigator.clipboard.writeText(c.boleto.linhaDigitavel);
    setCopiedBoleto(true);
    setTimeout(() => setCopiedBoleto(false), 2000);
  };

  const handlePrintBoletoMes = (mes: number) => {
    const c = cobrancasPorMes[mes];
    const url = c?.boleto?.url;
    if (url) {
      window.open(url, '_blank');
      return;
    }
    const linha = c?.boleto?.linhaDigitavel || '';
    if (!linha) return;
    const w = window.open('', 'PRINT', 'height=650,width=600,top=100,left=100');
    if (!w) return;
    w.document.write('<html><head><title>Boleto</title></head><body style="font-family: system-ui;">');
    w.document.write(`<div style="padding:24px;">
      <h1 style="font-size:18px;margin:0 0 12px 0;color:#111;">Boleto</h1>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-family: monospace;font-size:12px;color:#444;word-break:break-all;">${linha}</div>
      </div>
    </div>`);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const formatLinhaDigitavel = (linha: string): string => {
    const digits = (linha || '').replace(/\D/g, '');
    const groups = digits.match(/.{1,5}/g);
    return groups ? groups.join(' ') : (linha || '');
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

  // Calcular boletos do participante
  // REGRA: Parcela = valorTotal / qtdParticipantes
  // Número de parcelas = número de participantes
  const calcularBoletos = (participante: Participante): Boleto[] => {
    if (!caixa) return [];

    const boletos: Boleto[] = [];
    const dataBase = caixa.dataInicio ? new Date(caixa.dataInicio) : new Date();
    const isSemanal = caixa.tipo === 'semanal';

    const valorParcelaReal = caixa.valorTotal / caixa.qtdParticipantes;

    // CORREÇÃO: Número de parcelas = número de participantes
    const numParcelas = caixa.qtdParticipantes;

    for (let parcela = 1; parcela <= numParcelas; parcela++) {
      const dataVencimento = new Date(dataBase);
      if (isSemanal) {
        dataVencimento.setDate(dataVencimento.getDate() + ((parcela - 1) * 7));
      } else {
        dataVencimento.setMonth(dataVencimento.getMonth() + parcela - 1);
      }
      // Se diaVencimento é um dia do mês, ajustar
      if (!isSemanal && caixa.diaVencimento > 0) {
        dataVencimento.setDate(caixa.diaVencimento);
      }

      const correcaoIPCA = parcela > 1 ? valorParcelaReal * TAXA_IPCA_MENSAL : 0;

      const fundoReserva = parcela === 1 ? (valorParcelaReal / caixa.qtdParticipantes) : 0;

      const taxaAdmin = 0;
      const comissaoAdmin = parcela === numParcelas ? caixa.valorTotal * 0.10 : 0;

      const valorTotal = valorParcelaReal + TAXA_SERVICO + correcaoIPCA + fundoReserva + comissaoAdmin;
      const basePagamentos = selectedParticipante ? pagamentosParticipante : pagamentosMes;
      const pagamentoDoMes = basePagamentos.find((p) => {
        const pagador = p.pagadorId?._id || p.pagadorId;
        const usuarioId = (participante.usuarioId as any)?._id || participante.usuarioId;
        return String(p.mesReferencia) === String(parcela) && String(pagador) === String(usuarioId) && String(p.status) === 'aprovado';
      });

      // Check Lytex details
      const cobrancaInfo = cobrancasPorMes[parcela];
      const lytexDetail = cobrancaInfo ? lytexPaymentDetails[cobrancaInfo.id] : null;
      const isLytexPaid = lytexDetail?.status === 'paid' || lytexDetail?.status === 'inQueue' || lytexDetail?.status === 'liquidated' || lytexDetail?.status === 'settled';

      const isPago = Boolean(pagamentoDoMes) || isLytexPaid;
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

  // Calcular data de recebimento
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
    const dataBase = new Date(caixa.dataInicio);
    const data = new Date(dataBase);
    const atual = Math.max(1, caixa.mesAtual);
    if (caixa.tipo === 'semanal') {
      data.setDate(data.getDate() + ((atual - 1) * 7));
    } else {
      data.setMonth(data.getMonth() + atual - 1);
      data.setDate(caixa.diaVencimento);
    }
    return formatDate(data.toISOString());
  };

  const getPrimeiraParcelaData = (): string => {
    if (!caixa?.dataInicio) return '-';
    const d = new Date(caixa.dataInicio);
    if (caixa.tipo !== 'semanal') {
      d.setDate(caixa.diaVencimento);
    }
    return formatDate(d.toISOString());
  };

  const getUltimaParcelaData = (): string => {
    if (!caixa?.dataInicio) return '-';
    const d = new Date(caixa.dataInicio);
    if (caixa.tipo === 'semanal') {
      d.setDate(d.getDate() + ((caixa.qtdParticipantes - 1) * 7));
    } else {
      d.setMonth(d.getMonth() + caixa.qtdParticipantes - 1);
      d.setDate(caixa.diaVencimento);
    }
    return formatDate(d.toISOString());
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
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl md:text-2xl font-bold">{caixa.nome}</h1>
                  {caixaIniciado && (
                    <Badge className="bg-white text-green-600">
                      <Play className="w-3 h-3 mr-1" />
                      Em andamento
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium capitalize">
                    {caixa.tipo === 'semanal' ? 'Semanal' : 'Mensal'}
                  </span>
                  <span className="text-white/90 text-sm font-medium">
                    {(caixa.tipo === 'semanal' ? 'Semana' : 'Mês')} {Math.max(1, caixa.mesAtual)}/{caixa.duracaoMeses}
                  </span>
                </div>
                <p className="text-white/80 text-sm">{caixa.descricao || 'Sem descrição'}</p>
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
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/80">Progresso</span>
                <span className="font-medium">
                  {Math.round((caixa.mesAtual / caixa.duracaoMeses) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(caixa.mesAtual / caixa.duracaoMeses) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-white rounded-full"
                />
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

          {/* Botão Iniciar Caixa - quando completo */}
          {caixaCompleto && !caixaIniciado && (
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
                      const pagos = todosPagamentos.filter(p => {
                        const s = String(p.status || '').toLowerCase();
                        return p.mesReferencia === mes && ['aprovado', 'pago', 'paid', 'liquidated', 'settled'].includes(s);
                      }).length;
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
            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setShowAddParticipante(true)}
              >
                Cadastrar Participante
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Shuffle className="w-4 h-4" />}
                onClick={handleSortear}
                disabled={participantes.length === 0 || caixaIniciado}
              >
                Sortear Posições
              </Button>
              <Button
                variant={isReordering ? 'primary' : 'secondary'}
                size="sm"
                leftIcon={<GripVertical className="w-4 h-4" />}
                onClick={() => isReordering ? saveOrder() : setIsReordering(true)}
                disabled={participantes.length === 0 || caixaIniciado}
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
                  {participantes.map((participante, index) => (
                    <motion.div
                      key={participante._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        hover
                        onClick={() => {
                          setSelectedParticipante(participante);
                          setShowParticipanteDetail(true);
                        }}
                        className={cn(
                          participante.posicao === caixa.mesAtual && 'ring-2 ring-green-400 bg-green-50/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Posição */}
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                            participante.jaRecebeu
                              ? 'bg-green-100 text-green-700'
                              : participante.posicao === caixa.mesAtual
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-500'
                          )}>
                            {participante.posicao || '-'}
                          </div>

                          {/* Avatar */}
                          <Avatar
                            name={participante?.usuarioId?.nome || 'Sem nome'}
                            src={participante?.usuarioId?.fotoUrl}
                            size="md"
                          />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 truncate">
                                {participante?.usuarioId?.nome || 'Sem nome'}
                              </p>
                              {participante.jaRecebeu && (
                                <Badge variant="success" size="sm">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Recebeu
                                </Badge>
                              )}
                              {participante.posicao === caixa.mesAtual && !participante.jaRecebeu && (
                                <Badge variant="warning" size="sm">
                                  Recebe agora
                                </Badge>
                              )}
                              {!participante.aceite && (
                                <Badge variant="gray" size="sm">
                                  Pendente aceite
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {calcularDataRecebimento(participante.posicao || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {participante.usuarioId.telefone}
                              </span>
                            </div>
                          </div>

                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500">Valor a receber</p>
                            <p className="font-bold text-green-700">
                              {(() => {
                                const atual = Math.max(1, caixa.mesAtual);
                                const pos = participante.posicao || 1;
                                const diff = Math.max(0, pos - atual);
                                const ipcaUnit = caixa.valorParcela * TAXA_IPCA_MENSAL;
                                const ipcaTotal = diff * ipcaUnit;
                                const valor = caixa.valorTotal + ipcaTotal;
                                return formatCurrency(valor);
                              })()}
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <EmptyState
                icon={Users}
                title="Nenhum participante ainda"
                description="Cadastre os participantes do caixa para começar."
                actionLabel="Cadastrar Participante"
                onAction={() => setShowAddParticipante(true)}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'pagamentos' && (
          <motion.div
            key="pagamentos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Legenda de valores */}
            <Card className="mb-4 bg-blue-50 border-blue-200">
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

            {participantes.length > 0 ? (
              <div className="space-y-3">
                {participantes.map((p, index) => {
                  const boletos = calcularBoletos(p);
                  return (
                    <Card key={p._id}>
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          setSelectedParticipante(p);
                          setConfirmRemove(false);
                          setShowParticipanteDetail(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={p.usuarioId.nome} src={p.usuarioId.fotoUrl} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{p.usuarioId.nome}</p>
                            <p className="text-sm text-gray-500">Posição {p.posicao}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Pago</p>
                            <p className="font-bold text-green-600">
                              {boletos.filter(b => b.status === 'pago').length}/{caixa.duracaoMeses}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Wallet}
                title="Nenhum pagamento"
                description="Adicione participantes para visualizar os pagamentos."
              />
            )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Edit className="w-4 h-4" />}
                  onClick={() => setShowEditCaixa(true)}
                >
                  Editar
                </Button>
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

              {/* Botão de Excluir */}
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
            </Card>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Modal Adicionar Participante */}
      <Modal
        isOpen={showAddParticipante}
        onClose={() => setShowAddParticipante(false)}
        title="Cadastrar Participante"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nome Completo"
            placeholder="Nome do participante"
            leftIcon={<User className="w-4 h-4" />}
            value={newParticipante.nome}
            onChange={(e) => setNewParticipante({ ...newParticipante, nome: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            leftIcon={<Mail className="w-4 h-4" />}
            value={newParticipante.email}
            onChange={(e) => setNewParticipante({ ...newParticipante, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              leftIcon={<Phone className="w-4 h-4" />}
              value={newParticipante.telefone}
              onChange={(e) => setNewParticipante({ ...newParticipante, telefone: e.target.value })}
            />
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={newParticipante.cpf}
              onChange={(e) => setNewParticipante({ ...newParticipante, cpf: e.target.value })}
            />
          </div>
          <Input
            label="Chave PIX"
            placeholder="CPF, email, telefone ou chave aleatória"
            leftIcon={<CreditCard className="w-4 h-4" />}
            value={newParticipante.chavePix}
            onChange={(e) => setNewParticipante({ ...newParticipante, chavePix: e.target.value })}
          />
          <div>
            <label className="label">Foto do Participante</label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                  // Compressão de imagem
                  const img = new Image();
                  const reader = new FileReader();

                  reader.onload = (ev) => {
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
                      setNewParticipante({ ...newParticipante, picture: compressedBase64 });
                    };
                    img.src = ev.target?.result as string;
                  };

                  reader.readAsDataURL(file);
                } catch (error) {
                  console.error('Erro ao processar imagem:', error);
                  alert('Erro ao processar imagem. Tente outra foto.');
                }
              }}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddParticipante(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddParticipante}
              disabled={!newParticipante.nome || !newParticipante.telefone}
            >
              Cadastrar
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

      {/* Modal Iniciar Caixa com Contrato - Tamanho XL para evitar scroll */}
      <Modal
        isOpen={showIniciarCaixa}
        onClose={() => {
          setShowIniciarCaixa(false);
          setAceiteContrato(false);
        }}
        title="Iniciar Caixa"
        size="xl"
      >
        <div className="space-y-4">
          {/* Resumo do Caixa em Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-green-50 rounded-xl text-center">
              <p className="text-xs text-gray-500">Nome</p>
              <p className="font-bold text-green-700 truncate">{caixa.nome}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <p className="text-xs text-gray-500">Tipo</p>
              <p className="font-bold text-blue-700 capitalize">{caixa.tipo || 'Mensal'}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl text-center">
              <p className="text-xs text-gray-500">Valor Total</p>
              <p className="font-bold text-purple-700">{formatCurrency(caixa.valorTotal)}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-center">
              <p className="text-xs text-gray-500">Parcela</p>
              <p className="font-bold text-amber-700">{formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Participantes</p>
              <p className="font-bold text-gray-700">{caixa.qtdParticipantes}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Duração</p>
              <p className="font-bold text-gray-700">{caixa.qtdParticipantes} {caixa.tipo === 'semanal' ? 'semanas' : 'meses'}</p>
            </div>
          </div>

          {/* Termos resumidos */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-gray-900">Termos e Condições</h4>
            </div>

            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Datas:</strong> Início em {formatDate(new Date().toISOString())} • Término previsto em {formatDate(new Date(Date.now() + (caixa.qtdParticipantes * (caixa.tipo === 'semanal' ? 7 : 30) * 24 * 60 * 60 * 1000)).toISOString())}</p>

              <p><strong>Participantes:</strong></p>
              <div className="flex flex-wrap gap-2">
                {participantes.map((p, idx) => (
                  <span key={p._id} className="px-2 py-1 bg-white rounded text-xs">
                    {idx + 1}. {p.usuarioId.nome}
                  </span>
                ))}
              </div>

              <p><strong>Obrigações:</strong></p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li>Pagar parcela até a data de vencimento</li>
                <li>Não pagamento resulta em penalidade no score</li>
                <li>Administrador gerencia e distribui os valores</li>
              </ul>

              <p><strong>Composição da Parcela:</strong></p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li>1ª Parcela: {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)} + R$ 5,00 (serviço) + R$ 50,00 (fundo reserva) + R$ 50,00 (taxa administrativa)</li>
                <li>Parcelas 2-{caixa.qtdParticipantes - 1}: {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)} + R$ 5,00 (serviço) + IPCA</li>
                <li>Última Parcela: {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)} + R$ 5,00 (serviço) + IPCA + {formatCurrency(caixa.valorTotal * 0.10)} (comissão admin)</li>
              </ul>
            </div>
          </div>

          {/* Checkbox de aceite */}
          <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={aceiteContrato}
              onChange={(e) => setAceiteContrato(e.target.checked)}
              className="w-5 h-5 mt-0.5 text-green-600 rounded border-gray-300 focus:ring-green-500"
            />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Li e aceito os termos do contrato</p>
              <p className="text-xs text-amber-600">
                Ao marcar, você confirma que entendeu todas as condições.
              </p>
            </div>
          </label>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowIniciarCaixa(false);
                setAceiteContrato(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleIniciarCaixa}
              disabled={!aceiteContrato}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Iniciar Caixa
            </Button>
          </div>
        </div>
      </Modal>

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

      {/* Modal Detalhes do Participante */}
      <Modal
        isOpen={showParticipanteDetail}
        onClose={() => {
          setShowParticipanteDetail(false);
          setSelectedParticipante(null);
        }}
        title="Detalhes de Pagamentos dos Participantes"
        size="full"
      >
        {selectedParticipante && (
          <div>
            {/* Info do participante */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
              <Avatar
                name={selectedParticipante.usuarioId.nome}
                src={selectedParticipante.usuarioId.fotoUrl}
                size="lg"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900">{selectedParticipante.usuarioId.nome}</p>
                <p className="text-sm text-gray-500">{selectedParticipante.usuarioId.email}</p>
                <p className="text-sm text-gray-500">{selectedParticipante.usuarioId.telefone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Score</p>
                <p className={cn(
                  "text-2xl font-bold",
                  selectedParticipante.usuarioId.score >= 80 ? "text-green-600" :
                    selectedParticipante.usuarioId.score >= 60 ? "text-amber-600" : "text-red-600"
                )}>
                  {selectedParticipante.usuarioId.score}
                </p>
              </div>
            </div>

            {/* Info de recebimento */}
            <div className="p-3 bg-amber-50 rounded-xl mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Data de Recebimento</p>
                  <p className="font-bold text-amber-800">
                    {calcularDataRecebimento(selectedParticipante.posicao || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-700 font-medium">Posição</p>
                  <p className="font-bold text-amber-800">{selectedParticipante.posicao}º</p>
                </div>
              </div>
            </div>

            {/* Lista de boletos */}
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Boletos / Pagamentos
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={() => setRefreshTick((t) => t + 1)}
                className="ml-auto"
              >
                Atualizar
              </Button>
            </h4>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {calcularBoletos(selectedParticipante).map((boleto) => {
                const cobranca = cobrancasPorMes[boleto.mes];
                const lytexDetail = cobranca ? lytexPaymentDetails[cobranca.id] : null;
                const statusNormalized = String(lytexDetail?.status || '').toLowerCase();
                const isLytexPaid = ['paid', 'liquidated', 'settled', 'pago', 'inqueue'].includes(statusNormalized);

                if (cobranca?.id === '693c90a76d1525df96fa1650') {
                  console.log(`[DEBUG RENDER] ID ${cobranca.id}: Status=${lytexDetail?.status}, Norm=${statusNormalized}, IsPaid=${isLytexPaid}`);
                }

                const finalStatus = isLytexPaid ? 'pago' : boleto.status;
                const isPago = finalStatus === 'pago';

                return (
                  <div
                    key={boleto.mes}
                    className={cn(
                      "p-3 rounded-xl border",
                      isPago ? "bg-green-50 border-green-200" :
                        finalStatus === 'atrasado' ? "bg-red-50 border-red-200" :
                          "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div
                      className="flex items-center justify-between mb-2 cursor-pointer"
                      onClick={() => {
                        if (!isPago && caixa?.status === 'ativo') {
                          const open = expandedMes === boleto.mes ? null : boleto.mes;
                          setExpandedMes(open);
                          if (open && !cobrancasPorMes[boleto.mes] && !gerandoCobranca) {
                            handleGerarCobranca(boleto);
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} {boleto.mes}</span>
                        <Badge
                          variant={isPago ? 'success' : finalStatus === 'atrasado' ? 'danger' : 'warning'}
                          className={isPago ? 'bg-green-100 text-green-800' : ''}
                          size="sm"
                        >
                          {isPago ? 'PAGO' : finalStatus === 'atrasado' ? 'Atrasado' : 'Aguardando Pagamento'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {formatCurrency(boleto.valorTotal)}
                        </span>
                        {!isPago && caixa?.status === 'ativo' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMes(expandedMes === boleto.mes ? null : boleto.mes);
                            }}
                            className="p-1 rounded-lg hover:bg-gray-100"
                          >
                            <ChevronRight className={cn("w-4 h-4 text-gray-500 transition-transform", expandedMes === boleto.mes && "rotate-90")} />
                          </button>
                        )}
                      </div>
                    </div>
                    {cobranca?.id && (
                      <div className="text-xs text-gray-500 font-mono mb-1">
                        ID: {cobranca.id}
                      </div>
                    )}
                    <div className="text-xs text-gray-600">Vencimento: {formatDate(boleto.dataVencimento)}</div>

                    {!isPago && caixa?.status === 'ativo' && expandedMes === boleto.mes && (
                      <div className="mt-3">
                        <div className="text-sm text-gray-700 space-y-1 mb-3">
                          <div className="flex justify-between">
                            <span>Valor da parcela</span>
                            <span className="font-medium">{formatCurrency(boleto.valorParcela)}</span>
                          </div>
                          {boleto.fundoReserva > 0 && (
                            <div className="flex justify-between">
                              <span>Fundo de reserva</span>
                              <span className="font-medium">{formatCurrency(boleto.fundoReserva)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Taxa de serviço</span>
                            <span className="font-medium">{formatCurrency(TAXA_SERVICO)}</span>
                          </div>

                          {boleto.correcaoIPCA > 0 && (
                            <div className="flex justify-between">
                              <span>IPCA</span>
                              <span className="font-medium">{formatCurrency(boleto.correcaoIPCA)}</span>
                            </div>
                          )}
                          {boleto.comissaoAdmin > 0 && (
                            <div className="flex justify-between">
                              <span>Comissão do administrador (10%)</span>
                              <span className="font-medium">{formatCurrency(boleto.comissaoAdmin)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-3">
                          <button
                            onClick={() => {
                              setPaymentTab('pix');
                            }}
                            className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium', paymentTab === 'pix' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')}
                          >
                            PIX
                          </button>
                          <button
                            onClick={() => {
                              setPaymentTab('boleto');
                            }}
                            className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium', paymentTab === 'boleto' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-800')}
                          >
                            Boleto
                          </button>
                        </div>

                        {!cobrancasPorMes[boleto.mes] ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            onClick={() => handleGerarCobranca(boleto)}
                            disabled={gerandoCobranca}
                            leftIcon={gerandoCobranca && boletoSelecionado === boleto.mes ?
                              <Loader2 className="w-4 h-4 animate-spin" /> :
                              <QrCode className="w-4 h-4" />
                            }
                          >
                            {gerandoCobranca && boletoSelecionado === boleto.mes ? 'Gerando...' : 'Gerar cobrança'}
                          </Button>
                        ) : paymentTab === 'pix' ? (
                          <div className="space-y-3">
                            {cobrancasPorMes[boleto.mes].pixGeneratedAt && (
                              <div className="text-xs text-gray-500 text-center">
                                PIX gerado há {minutesSince(cobrancasPorMes[boleto.mes].pixGeneratedAt)} min
                              </div>
                            )}
                            <div className="flex justify-center">
                              {cobrancasPorMes[boleto.mes].pix?.copiaCola ? (
                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                  <QRCode value={cobrancasPorMes[boleto.mes].pix!.copiaCola} size={176} />
                                </div>
                              ) : (
                                <div className="w-44 h-44 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <QrCode className="w-20 h-20 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Código PIX</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={cobrancasPorMes[boleto.mes].pix?.copiaCola || ''}
                                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 truncate"
                                />
                                <Button
                                  variant={copiedPix ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => handleCopyPixMes(boleto.mes)}
                                  leftIcon={copiedPix ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                  className={copiedPix ? 'bg-green-500 hover:bg-green-600' : ''}
                                >
                                  {copiedPix ? 'Copiado!' : 'Copiar'}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handlePrintPixMes(boleto.mes)}
                                  leftIcon={<Printer className="w-4 h-4" />}
                                >
                                  Imprimir
                                </Button>
                                {cobrancasPorMes[boleto.mes].paymentUrl && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => window.open(cobrancasPorMes[boleto.mes].paymentUrl!, '_blank')}
                                    leftIcon={<ExternalLink className="w-4 h-4" />}
                                  >
                                    Abrir Checkout
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Linha Digitável</label>
                              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                <p className="text-sm font-mono text-gray-600 break-all">
                                  {formatLinhaDigitavel(cobrancasPorMes[boleto.mes].boleto?.linhaDigitavel || '')}
                                </p>
                              </div>
                            </div>
                            {cobrancasPorMes[boleto.mes].boleto?.codigoBarras && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Código de Barras</label>
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <p className="text-sm font-mono text-gray-600 break-all">
                                    {cobrancasPorMes[boleto.mes].boleto?.codigoBarras}
                                  </p>
                                </div>
                                <div className="flex justify-center mt-2">
                                  <Barcode
                                    value={cobrancasPorMes[boleto.mes].boleto?.codigoBarras || ''}
                                    format="CODE128"
                                    width={2}
                                    height={50}
                                  />
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant={copiedBoleto ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => handleCopyBoletoMes(boleto.mes)}
                                leftIcon={copiedBoleto ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                className={copiedBoleto ? 'bg-green-500 hover:bg-green-600' : ''}
                              >
                                {copiedBoleto ? 'Copiado!' : 'Copiar linha'}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePrintBoletoMes(boleto.mes)}
                                leftIcon={<Printer className="w-4 h-4" />}
                              >
                                Imprimir
                              </Button>
                              {cobrancasPorMes[boleto.mes].boleto?.url && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => window.open(cobrancasPorMes[boleto.mes].boleto!.url, '_blank')}
                                  leftIcon={<ExternalLink className="w-4 h-4" />}
                                >
                                  Ver boleto
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remoção opcional: deixar apenas o X para fechar */}
          </div>
        )}
      </Modal>

      {/* Modal de Cobrança PIX/Boleto */}
      <Modal
        isOpen={showCobranca}
        onClose={() => {
          setShowCobranca(false);
          setCobrancaGerada(null);
        }}
        title="Pagamento"
        size="lg"
      >
        {cobrancaGerada && (
          <div className="space-y-6">
            {/* Info da cobrança */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm text-green-700 font-medium mb-1">{cobrancaGerada.descricao}</p>
              <p className="text-3xl font-bold text-green-800">
                {formatCurrency(cobrancaGerada.valor)}
              </p>
            </div>

            {/* Tabs PIX / Boleto */}
            <div className="space-y-4">
              {/* PIX */}
              {cobrancaGerada.pix && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <QrCode className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Pagar com PIX</h3>
                    {cobrancaGerada?.pixGeneratedAt && (
                      <span className="ml-auto text-xs text-gray-500">
                        PIX gerado há {minutesSince(cobrancaGerada.pixGeneratedAt)} min
                      </span>
                    )}
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    {cobrancaGerada.pix.qrCode.startsWith('data:') ? (
                      <img
                        src={cobrancaGerada.pix.qrCode}
                        alt="QR Code PIX"
                        className="w-48 h-48 border border-gray-200 rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Código Copia e Cola */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Código PIX (Copia e Cola)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cobrancaGerada.pix.copiaCola}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 truncate"
                      />
                      <Button
                        variant={copiedPix ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={handleCopyPix}
                        leftIcon={copiedPix ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        className={copiedPix ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {copiedPix ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Boleto */}
              {cobrancaGerada.boleto && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Pagar com Boleto</h3>
                  </div>

                  {/* Código de barras */}
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium text-gray-700">Linha Digitável</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm font-mono text-gray-600 break-all">
                        {formatLinhaDigitavel(cobrancaGerada.boleto.linhaDigitavel)}
                      </p>
                    </div>
                  </div>

                  {/* Botão para abrir boleto */}
                  {cobrancaGerada.boleto.url && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => window.open(cobrancaGerada.boleto?.url, '_blank')}
                      leftIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      Ver Boleto Completo
                    </Button>
                  )}
                </div>
              )}

              {/* Link de pagamento */}
              {cobrancaGerada.paymentUrl && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => window.open(cobrancaGerada.paymentUrl, '_blank')}
                  leftIcon={<ExternalLink className="w-4 h-4" />}
                >
                  Abrir Página de Pagamento
                </Button>
              )}
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowCobranca(false);
                setCobrancaGerada(null);
              }}
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
