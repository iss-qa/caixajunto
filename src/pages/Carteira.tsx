import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Download, Plus, Eye, EyeOff, Building2, Check, X, Calendar, Mail, Clock, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cobrancasService, caixasService, pagamentosService, participantesService, subcontasService, recebimentosService } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { TransacoesDetalhadas } from './Carteira/components/TransacoesDetalhadas';
import CarteiraDataAccounts, { SubAccountCreation } from './CarteiraDataAccounts';
import IdentityVerification from '../components/IdentityVerification';

import {
  StatusTransacaoCarteira,
  TipoTransacaoCarteira,
  CaixaCarteiraApi,
  PagamentoCarteiraApi,
  TransacaoRecenteCarteira,
  TransacaoLytexCarteira
} from './Carteira/types';

const WalletDashboard = () => {
  const { usuario, updateUsuario } = useAuth();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showModal, setShowModal] = useState<null | 'withdraw'>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [hasSubAccount, setHasSubAccount] = useState(
    Boolean(usuario?.lytexSubAccountId),
  );
  // Inicia como true se não tiver ID, para evitar piscar o formulário antes da verificação
  const [checkingSubAccount, setCheckingSubAccount] = useState(
    !usuario?.lytexSubAccountId,
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<TransacaoRecenteCarteira[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [lytexTransactions, setLytexTransactions] = useState<TransacaoLytexCarteira[]>([]);
  const [lytexTransactionsLoading, setLytexTransactionsLoading] = useState(false);
  const [lytexTransactionsError, setLytexTransactionsError] = useState<string | null>(null);
  const [lytexPage, setLytexPage] = useState(1);
  const [lytexHasMore, setLytexHasMore] = useState(false);

  // Estados para participante - caixas e contemplado
  const [participantCaixas, setParticipantCaixas] = useState<any[]>([]);
  const [contemplatedInfo, setContemplatedInfo] = useState<{
    caixaNome: string;
    participanteNome: string;
    valor: number;
    vencimento: string;
    mesAtual: number;
    mesNome: string;
  } | null>(null);
  const [loadingContemplated, setLoadingContemplated] = useState(false);


  const [accountData, setAccountData] = useState({
    name: usuario?.nome || '',
    cpf: usuario?.cpf || '',
    email: usuario?.email || '',
    balance: 0,
    pendingBalance: 0,
    blockedBalance: 0,
    paidBalance: 0, // Total de saques recebidos
    futureTaxes: 0,
    status: 'Ativa',
    createdAt: '',
  });

  // Dados completos da subconta (Lytex)
  const [subcontaData, setSubcontaData] = useState<{
    _id?: string;
    lytexId?: string;
    name?: string;
    email?: string;
    cpfCnpj?: string;
    cellphone?: string;
    type?: string;
    createdAt?: string;
    address?: {
      street?: string;
      zone?: string;
      city?: string;
      state?: string;
      number?: string;
      complement?: string;
      zip?: string;
    };
    hasCredentials?: boolean; // Se tem clientId/clientSecret
    clientId?: string; // ID da aplicação Lytex
    clientSecret?: string; // Segredo da aplicação (mascarado)
    nomeCaixa?: string; // Nome do caixa associado
    status?: string; // Status da subconta (active, created, etc)
    onboardingUrl?: string; // URL para verificação de identidade
    upload_docs_reconhecimento_facial?: boolean; // Status de docs enviados
  } | null>(null);

  // Lista de caixas que o admin gerencia
  const [caixasGerenciados, setCaixasGerenciados] = useState<Array<{ _id: string; nome: string; status?: string; dataFim?: string }>>([]);

  const fetchWallet = async () => {
    try {
      setWalletError(null);

      // Primeiro tenta buscar a carteira usando credenciais individuais do participante
      console.log('💰 Tentando buscar carteira individual do participante...');
      const individualResponse = await subcontasService.getMyWallet();

      if (individualResponse && individualResponse.success) {
        const wallet = individualResponse.wallet;
        console.log('✅ Carteira individual encontrada:', wallet);

        setAccountData((prev) => ({
          ...prev,
          balance: (wallet.balance || 0) / 100,
          pendingBalance: (wallet.futureBalance || 0) / 100,
          blockedBalance: (wallet.blockedBalance || 0) / 100,
          futureTaxes: (wallet.futureTaxes || 0) / 100,
        }));
        return;
      }

      // Se falhar a busca individual
      console.log('⚠️ Falha ou carteira individual não encontrada:', individualResponse?.message);

      // Tratamento específico de erros
      try {
        if (!individualResponse?.success) {
          const errorCode = individualResponse?.error;
          if (errorCode === 'SUB_ACCOUNT_NOT_FOUND') {
            setWalletError('Subconta não encontrada. Crie sua subconta primeiro.');
          } else if (errorCode === 'LYTEX_AUTH_FAILED') {
            setWalletError('Falha de autenticação Lytex. Verifique suas credenciais.');
          } else {
            setWalletError(individualResponse?.message || 'Erro ao buscar carteira individual.');
          }

          // Mostra saldo zerado para não exibir valores de outro usuário
          setAccountData((prev) => ({
            ...prev,
            balance: 0,
            pendingBalance: 0,
            blockedBalance: 0,
            futureTaxes: 0,
          }));
          return;
        }

        // Para usuário master, continua para o fallback
        console.log('ℹ️ Usuário é master, usando fallback para carteira geral...');
      } catch (individualError: any) {
        console.log('❌ Exceção ao buscar carteira individual:', individualError?.message);

        // CORREÇÃO: Só usa fallback para master
        if (usuario?.tipo !== 'master') {
          setWalletError('Erro ao buscar sua carteira. Verifique se sua subconta está configurada.');
          setAccountData((prev) => ({
            ...prev,
            balance: 0,
            pendingBalance: 0,
            blockedBalance: 0,
            futureTaxes: 0,
          }));
          return;
        }
      }

      // Fallback: busca carteira geral (APENAS para master)
      console.log('📊 Usando fallback: buscando carteira geral (master)...');
      const response = await cobrancasService.wallet();
      const wallet = (response && response.wallet) || response;
      const availableRaw =
        typeof wallet?.balance === 'number' ? wallet.balance : 0;
      const pendingRaw =
        typeof wallet?.futureBalance === 'number' ? wallet.futureBalance : 0;
      const blockedRaw =
        typeof wallet?.blockedBalance === 'number'
          ? wallet.blockedBalance
          : 0;
      const futureTaxesRaw =
        typeof wallet?.futureTaxes === 'number' ? wallet.futureTaxes : 0;
      const available = availableRaw / 100;
      const pending = pendingRaw / 100;
      const blocked = blockedRaw / 100;
      const futureTaxes = futureTaxesRaw / 100;

      console.log('💵 Valores da carteira geral (master fallback):', {
        balance: available,
        pendingBalance: pending,
      });

      setAccountData((prev) => ({
        ...prev,
        balance: available,
        pendingBalance: pending,
        blockedBalance: blocked,
        futureTaxes,
      }));
    } catch (e: any) {
      console.error('❌ Erro fatal ao consultar carteira:', e);
      setWalletError(e?.message || 'Erro ao consultar carteira');
    }
  };

  const normalizarStatusPagamento = (
    statusApi: string,
    diasAtraso?: number,
    dataPagamento?: string,
  ): 'pago' | 'pendente' | 'atrasado' | 'enviado' => {
    const s = String(statusApi || '').toLowerCase();
    if (
      [
        'aprovado',
        'pago',
        'paid',
        'liquidated',
        'settled',
        'pago_gateway',
      ].includes(s)
    ) {
      return 'pago';
    }
    if (s === 'enviado') {
      return dataPagamento ? 'pago' : 'enviado';
    }
    if (diasAtraso && diasAtraso > 0) {
      return 'atrasado';
    }
    return 'pendente';
  };

  const fetchRecentTransactions = async () => {
    try {
      setTransactionsLoading(true);
      setTransactionsError(null);

      if (!usuario?._id) {
        setRecentTransactions([]);
        return;
      }

      const caixasResponse =
        usuario.tipo === 'master'
          ? await caixasService.getAll()
          : await caixasService.getByAdmin(usuario._id);

      console.log('[Carteira] Resposta caixasService:', caixasResponse);

      const caixasRaw = Array.isArray(caixasResponse)
        ? caixasResponse
        : caixasResponse.caixas || [];

      const caixasMap = new Map<
        string,
        {
          nome: string;
          adminNome: string;
          tipo: 'mensal' | 'semanal';
          valorParcela: number;
          valorTotal: number;
          qtdParticipantes: number;
          duracaoMeses: number;
          taxaServico: number;
        }
      >();

      (caixasRaw as CaixaCarteiraApi[]).forEach((c) => {
        if (!c || !c._id) return;
        const admin = c.adminId;
        const adminNome =
          typeof admin === 'string' ? '' : admin?.nome || '';
        const tipoCaixa =
          c.tipo === 'semanal' ? 'semanal' : ('mensal' as const);
        caixasMap.set(c._id, {
          nome: c.nome,
          adminNome,
          tipo: tipoCaixa,
          valorParcela: typeof c.valorParcela === 'number' ? c.valorParcela : 0,
          valorTotal: typeof c.valorTotal === 'number' ? c.valorTotal : 0,
          qtdParticipantes:
            typeof c.qtdParticipantes === 'number' ? c.qtdParticipantes : 0,
          duracaoMeses: typeof c.duracaoMeses === 'number' ? c.duracaoMeses : 0,
          taxaServico: typeof c.taxaServico === 'number' ? c.taxaServico : 7.20,
        });
      });

      if (caixasMap.size === 0) {
        setRecentTransactions([]);
        return;
      }

      const pagamentosResp = await pagamentosService.getAll({
        limit: 1000,
        page: 1,
      });

      console.log('[Carteira] Resposta pagamentosService:', pagamentosResp);

      const pagamentos = Array.isArray(pagamentosResp)
        ? pagamentosResp
        : pagamentosResp.pagamentos || [];

      const transacoes: TransacaoRecenteCarteira[] = (
        pagamentos as PagamentoCarteiraApi[]
      )
        .filter((p) => {
          if (!p || !p.dataPagamento || !p.caixaId) return false;
          const caixaIdKey =
            typeof p.caixaId === 'string'
              ? p.caixaId
              : p.caixaId._id || '';
          if (!caixaIdKey) return false;
          return caixasMap.has(caixaIdKey);
        })
        .map<TransacaoRecenteCarteira | null>((p) => {
          console.log('[Carteira] Processando pagamento:', p);
          const dias =
            typeof p.diasAtraso === 'number'
              ? p.diasAtraso
              : p.diasAtraso
                ? Number(p.diasAtraso)
                : 0;

          const statusNormalizado = normalizarStatusPagamento(
            p.status,
            dias,
            p.dataPagamento,
          );

          if (statusNormalizado !== 'pago') {
            return null;
          }

          const statusCarteira: StatusTransacaoCarteira =
            dias && dias > 0 ? 'atrasado' : 'em_dia';

          const caixaIdKey =
            typeof p.caixaId === 'string'
              ? p.caixaId
              : p.caixaId?._id || '';
          const caixaInfo = caixaIdKey ? caixasMap.get(caixaIdKey) : undefined;
          if (!caixaInfo) {
            return null;
          }

          const valorParcelaPagamento =
            typeof p.valorParcela === 'number' ? p.valorParcela : 0;
          const valorParcelaCaixa = caixaInfo.valorParcela || 0;

          // Base: usa o valor do pagamento se existir (pode incluir IPCA), senão usa do caixa
          const valorBase =
            valorParcelaPagamento > 0
              ? valorParcelaPagamento
              : valorParcelaCaixa;

          const taxaServico =
            typeof p.taxaServico === 'number' && p.taxaServico > 0
              ? p.taxaServico
              : 5;

          const mesRef =
            typeof p.mesReferencia === 'number' ? p.mesReferencia : 0;

          // Regra 1ª Parcela: Valor + Fundo Reserva (Valor/Qtd) + Taxa
          let fundoReserva = 0;
          if (mesRef === 1 && caixaInfo.qtdParticipantes > 0) {
            fundoReserva = caixaInfo.valorParcela / caixaInfo.qtdParticipantes;
          }

          // Regra Última Parcela: Valor + 10% do Caixa + Taxa
          let bonusFinal = 0;
          // Se duracaoMeses > 0 e mesRef == duracaoMeses
          if (
            caixaInfo.duracaoMeses > 0 &&
            mesRef === caixaInfo.duracaoMeses
          ) {
            bonusFinal = caixaInfo.valorTotal * 0.1;
          }

          // O valor pago é apenas o valorBase (que já inclui IPCA se houver)
          const valorPago = valorBase;

          const pagador = p.pagadorId;
          const participanteNome =
            typeof pagador === 'string'
              ? p.participanteNome || 'Participante'
              : pagador?.nome || p.participanteNome || 'Participante';

          return {
            id: p._id,
            caixaId: caixaIdKey,
            caixaNome: caixaInfo.nome,
            caixaAdminNome: caixaInfo.adminNome,
            participanteNome,
            dataPagamento: p.dataPagamento as string,
            valorPago,
            status: statusCarteira,
            tipo: 'entrada',
            mesReferencia:
              typeof p.mesReferencia === 'number' ? p.mesReferencia : undefined,
            tipoCaixa: caixaInfo.tipo,
          };
        })
        .filter((t): t is TransacaoRecenteCarteira => Boolean(t));

      transacoes.sort(
        (a, b) =>
          new Date(b.dataPagamento).getTime() -
          new Date(a.dataPagamento).getTime(),
      );

      setRecentTransactions(transacoes);
    } catch (e: any) {
      setTransactionsError(
        e?.message || 'Erro ao carregar transações recentes',
      );
      setRecentTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchLytexTransactions = async (page: number = 1) => {
    try {
      setLytexTransactionsLoading(true);
      setLytexTransactionsError(null);

      const response = await cobrancasService.transactions({
        page,
        limit: 10,
      });
      console.log('[Carteira] Resposta cobrancasService.transactions (Lytex):', response);

      const list = Array.isArray(response?.transactions)
        ? response.transactions
        : [];

      const normalized: TransacaoLytexCarteira[] = list.map((t: any) => ({
        id: String(t.id || t._id || ''),
        type: String(t.type || ''),
        description: String(t.description || ''),
        status: String(t.status || ''),
        amount: typeof t.amount === 'number' ? t.amount : 0,
        createdAt:
          (typeof t.createdAt === 'string' && t.createdAt) ||
          (typeof t.created_at === 'string' && t.created_at) ||
          '',
      }));

      setLytexTransactions(normalized);
      setLytexHasMore(Boolean(response?.hasMore));
      setLytexPage(response?.page || page);
    } catch (e: any) {
      setLytexTransactionsError(
        e?.message || 'Erro ao carregar transações da carteira',
      );
      setLytexTransactions([]);
    } finally {
      setLytexTransactionsLoading(false);
    }
  };


  const fetchBankAccounts = async () => {
    // Esta função era usada para bankAccounts state, que agora é interno de CarteiraDataAccounts
    // Porém pode ser que ainda seja usada? 
    // Na Carteira.tsx original ela populava `bankAccounts` state, que NÃO era usado no overview.
    // Era usado no render do modal? Não.
    // De qualquer forma, para compatibilidade vamos manter vazia ou remover se não for usada.
    // O useEffect chamava. Vamos manter vazia para não quebrar contrato se ela for chamada.
    // Realmente, bankAccounts array era usado para dropdown de seleção de conta na criação de subconta?
    // Não, creation usava `banks` service search.
    // Então podemos remover o job?
    // O useEffect na linha 1290 chamava fetchBankAccounts.
    // Vou deixar vazio.
  };

  // Buscar saldo pago (total de saques recebidos)
  const fetchPaidBalance = async () => {
    if (!usuario?._id) return;

    try {
      console.log('💰 Buscando saldo pago do usuário...');
      const data = await recebimentosService.getMyRecebimentos();
      const recebimentos = data.recebimentos || data || [];

      // Calcular total de saques concluídos
      const totalPago = recebimentos
        .filter((r: any) => r.status === 'concluido')
        .reduce((acc: number, r: any) => acc + (r.valorTotal || 0), 0);

      console.log(`✅ Total pago encontrado: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

      setAccountData((prev) => ({
        ...prev,
        paidBalance: totalPago,
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar saldo pago:', error);
    }
  };

  // Buscar caixas do participante e determinar contemplado
  const fetchParticipantCaixas = async () => {
    if (!usuario?._id || usuario?.tipo !== 'usuario') {
      setParticipantCaixas([]);
      setContemplatedInfo(null);
      return;
    }

    try {
      setLoadingContemplated(true);

      console.log('🔍 Buscando caixas do participante...');

      // Buscar participações do usuário
      const participacoes = await participantesService.getByUsuario(usuario._id);
      const lista = Array.isArray(participacoes) ? participacoes : participacoes?.participacoes || [];

      console.log(`📦 Participações encontradas: ${lista.length}`);

      if (lista.length === 0) {
        console.log('⚠️ Participante não está vinculado a nenhum caixa');
        setParticipantCaixas([]);
        setContemplatedInfo(null);
        return;
      }

      setParticipantCaixas(lista);

      // Buscar o primeiro caixa ativo
      const activeCaixa = lista.find((p: any) => p.caixaId?.status === 'ativo');

      if (!activeCaixa || !activeCaixa.caixaId) {
        console.log('⚠️ Nenhum caixa ativo encontrado');
        setContemplatedInfo(null);
        return;
      }

      console.log(`✅ Caixa ativo encontrado: ${activeCaixa.caixaId.nome}`);

      // Buscar detalhes completos do caixa
      const caixaDetails = await caixasService.getById(activeCaixa.caixaId._id);

      // Obter mês/período atual
      const mesAtual = caixaDetails.mesAtual || 1;

      console.log(`📅 Mês atual do caixa: ${mesAtual}`);

      // Buscar todos os participantes do caixa
      const participantes = await participantesService.getByCaixa(caixaDetails._id);
      const partsList = Array.isArray(participantes) ? participantes : participantes?.participantes || [];

      console.log(`👥 Total de participantes no caixa: ${partsList.length}`);

      // Encontrar quem está contemplado neste mês
      const contemplado = partsList.find((p: any) => p.posicao === mesAtual);

      if (!contemplado) {
        console.log('⚠️ Nenhum contemplado encontrado para este mês');
        setContemplatedInfo(null);
        return;
      }

      console.log(`🎯 Contemplado encontrado: ${contemplado.usuarioId?.nome || contemplado.nome}`);

      // Calcular data de vencimento baseado no tipo do caixa
      const dataInicio = new Date(caixaDetails.dataInicio);
      let vencimento = new Date(dataInicio);

      if (caixaDetails.tipo === 'semanal') {
        // Para caixas semanais, adicionar semanas
        vencimento.setDate(vencimento.getDate() + (mesAtual - 1) * 7);
      } else {
        // Para caixas mensais, adicionar meses
        vencimento.setMonth(vencimento.getMonth() + (mesAtual - 1));
        // Ajustar para o dia de vencimento configurado
        const diaVencimento = caixaDetails.diaVencimento || vencimento.getDate();
        vencimento.setDate(diaVencimento);
      }

      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      const infoContemplado = {
        caixaNome: caixaDetails.nome,
        participanteNome: contemplado.usuarioId?.nome || contemplado.nome || 'Participante',
        valor: caixaDetails.valorTotal,
        vencimento: vencimento.toLocaleDateString('pt-BR'),
        mesAtual,
        mesNome: meses[vencimento.getMonth()],
      };

      console.log('✅ Informações do contemplado:', infoContemplado);

      setContemplatedInfo(infoContemplado);
    } catch (error) {
      console.error('❌ Erro ao buscar informações do contemplado:', error);
      setContemplatedInfo(null);
    } finally {
      setLoadingContemplated(false);
    }
  };

  useEffect(() => {
    const verificarSubconta = async () => {
      console.log('\n🔍 ========================================');
      console.log('🔍 VERIFICAÇÃO DE SUBCONTA - CARTEIRA');
      console.log('🔍 ========================================');
      console.log('👤 Usuário logado:', {
        _id: usuario?._id,
        nome: usuario?.nome,
        email: usuario?.email,
        cpf: usuario?.cpf,
        lytexSubAccountId: usuario?.lytexSubAccountId,
      });

      // Se já tem lytexSubAccountId no contexto, busca os dados completos da subconta
      if (usuario?.lytexSubAccountId) {
        console.log('✅ lytexSubAccountId já existe no contexto:', usuario.lytexSubAccountId);
        setHasSubAccount(true);

        // Mesmo assim, buscar os dados completos da subconta
        try {
          const localResp = await subcontasService.getMine();
          const local = (localResp && localResp.subconta) || null;

          if (local) {
            console.log('📦 Subconta completa carregada:', local);
            setSubcontaData({
              _id: local._id,
              lytexId: local.lytexId,
              name: local.name,
              email: local.email,
              cpfCnpj: local.cpfCnpj,
              cellphone: local.cellphone,
              type: local.type,
              createdAt: local.createdAt,
              address: local.address,
              hasCredentials: Boolean(local.clientId && local.clientSecret),
              clientId: local.clientId || undefined,
              clientSecret: local.clientSecret ? '••••••••••••••••' : undefined,
              nomeCaixa: local.nomeCaixa || undefined,
              status: local.raw?.status || local.status,
              onboardingUrl: local.raw?.onboardingUrl || local.raw?.onboarding_url || local.onboardingUrl,
              upload_docs_reconhecimento_facial: local.upload_docs_reconhecimento_facial || local.raw?.upload_docs_reconhecimento_facial || false,
            });

            // Lógica de exibição do Modal de Verificação
            const status = local.raw?.status || local.status;
            const url = local.raw?.onboardingUrl || local.raw?.onboarding_url || local.onboardingUrl;
            const isFacialRecognitionDone = local.upload_docs_reconhecimento_facial || local.raw?.upload_docs_reconhecimento_facial || false;

            // Só abre se tiver URL, status não for 'active' (ou verificação forçada) E não tiver concluído ainda
            if (url && !isFacialRecognitionDone) {
              console.log('⚠️ Subconta pendente de verificação. Abrindo modal...');
              setOnboardingUrl(url);
              setShowOnboardingModal(true);
            }

            setAccountData((prev) => ({
              ...prev,
              name: local.name || prev.name,
              email: local.email || prev.email,
              cpf: local.cpfCnpj || prev.cpf,
              createdAt: local.createdAt ? formatDate(local.createdAt) : prev.createdAt,
            }));

            // Buscar caixas gerenciados pelo admin
            if (usuario?.tipo === 'administrador' || usuario?.tipo === 'master') {
              try {
                const caixasResp = usuario?.tipo === 'master'
                  ? await caixasService.getAll()
                  : await caixasService.getByAdmin(usuario._id);
                const listaCaixas = Array.isArray(caixasResp)
                  ? caixasResp
                  : caixasResp?.caixas || [];
                setCaixasGerenciados(
                  listaCaixas.map((c: any) => ({
                    _id: c._id,
                    nome: c.nome,
                    status: c.status,
                    dataFim: c.dataFim || c.ultimaParcela, // Data de fim do caixa
                  }))
                );
              } catch (e: any) {
                console.log('⚠️ Erro ao buscar caixas gerenciados:', e?.message);
              }
            }
          }
        } catch (e: any) {
          console.log('⚠️ Erro ao buscar detalhes da subconta:', e?.message);
        }

        setCheckingSubAccount(false);
        return;
      }

      try {
        setCheckingSubAccount(true);

        // 1️⃣ Primeiro: Verificar se já existe subconta no MongoDB local
        try {
          console.log('\n📡 ETAPA 1: Buscando subconta no MongoDB local...');
          console.log('   Chamando: subcontasService.getMine()');

          const localResp = await subcontasService.getMine();

          console.log('📦 Resposta completa getMine():', localResp);

          const local = (localResp && localResp.subconta) || null;
          console.log('📦 Subconta extraída:', local);

          const idSub = local ? (local.lytexId || local._id) : undefined;
          console.log('🆔 ID da subconta:', idSub);

          if (idSub) {
            console.log('[Carteira] ✅ Subconta encontrada no MongoDB local:', idSub);
            setHasSubAccount(true);
            updateUsuario({ lytexSubAccountId: idSub });

            // Popula subcontaData com os dados completos da subconta
            setSubcontaData({
              _id: local._id,
              lytexId: local.lytexId,
              name: local.name,
              email: local.email,
              cpfCnpj: local.cpfCnpj,
              cellphone: local.cellphone,
              type: local.type,
              createdAt: local.createdAt,
              address: local.address,
              hasCredentials: Boolean(local.clientId && local.clientSecret),
              clientId: local.clientId || undefined,
              clientSecret: local.clientSecret ? '••••••••••••••••' : undefined, // Mascarado
              nomeCaixa: local.nomeCaixa || undefined,
              status: local.raw?.status || local.status,
              onboardingUrl: local.raw?.onboardingUrl || local.raw?.onboarding_url || local.onboardingUrl,
              upload_docs_reconhecimento_facial: local.upload_docs_reconhecimento_facial || local.raw?.upload_docs_reconhecimento_facial || false,
            });

            // Lógica de exibição do Modal de Verificação
            const status = local.raw?.status || local.status;
            const url = local.raw?.onboardingUrl || local.raw?.onboarding_url || local.onboardingUrl;
            const isFacialRecognitionDone = local.upload_docs_reconhecimento_facial || local.raw?.upload_docs_reconhecimento_facial || false;

            if (url && !isFacialRecognitionDone) {
              console.log('⚠️ Subconta pendente de verificação. Abrindo modal...');
              setOnboardingUrl(url);
              setShowOnboardingModal(true);
            }

            // Atualiza accountData com dados da subconta
            setAccountData((prev) => ({
              ...prev,
              name: local.name || prev.name,
              email: local.email || prev.email,
              cpf: local.cpfCnpj || prev.cpf,
              createdAt: local.createdAt ? formatDate(local.createdAt) : prev.createdAt,
            }));

            // Buscar caixas gerenciados pelo admin (se for admin ou master)
            if (usuario?.tipo === 'administrador' || usuario?.tipo === 'master') {
              try {
                const caixasResp = usuario?.tipo === 'master'
                  ? await caixasService.getAll()
                  : await caixasService.getByAdmin(usuario._id);
                const listaCaixas = Array.isArray(caixasResp)
                  ? caixasResp
                  : caixasResp?.caixas || [];
                setCaixasGerenciados(
                  listaCaixas.map((c: any) => ({
                    _id: c._id,
                    nome: c.nome,
                    status: c.status,
                  }))
                );
                console.log('📦 Caixas gerenciados:', listaCaixas.length);
              } catch (e: any) {
                console.log('⚠️ Erro ao buscar caixas gerenciados:', e?.message);
              }
            }

            setCheckingSubAccount(false);
            console.log('========================================\n');
            return;
          }

          console.log('❌ Nenhuma subconta encontrada no MongoDB local');
        } catch (e: any) {
          console.log('❌ Erro ao buscar subconta no MongoDB local:', e.message);
          console.log('   Status:', e?.response?.status);
          console.log('   Data:', e?.response?.data);
        }

        // 2️⃣ Segundo: Verificar se já existe subconta no Lytex por CPF
        if (usuario?.cpf) {
          try {
            console.log(`\n📡 ETAPA 2: Verificando CPF ${usuario.cpf} no Lytex...`);
            const checkResp = await subcontasService.checkByCpf(usuario.cpf);

            console.log('📦 Resposta checkByCpf:', checkResp);

            if (checkResp?.exists) {
              console.log(`✅ Subconta já existe! Location: ${checkResp.location}`);

              // Se existe no Lytex mas não no MongoDB, foi sincronizada automaticamente pelo backend
              if (checkResp.location === 'lytex') {
                console.log('[Carteira] Subconta do Lytex será sincronizada automaticamente');
              }

              const subId = checkResp.subconta?.lytexId || checkResp.subconta?._id;
              console.log('🆔 ID da subconta encontrada:', subId);

              if (subId) {
                setHasSubAccount(true);
                updateUsuario({ lytexSubAccountId: subId });
                setCheckingSubAccount(false);
                console.log('========================================\n');
                return;
              }
            }
          } catch (e: any) {
            console.log('❌ Erro ao verificar CPF:', e?.message);
          }
        }

        // 3️⃣ Terceiro: Se não encontrou em lugar nenhum, permitir criação
        console.log('\n❌ ========================================');
        console.log('❌ CONCLUSÃO: Subconta não encontrada');
        console.log('❌ Exibindo formulário de criação');
        console.log('❌ ========================================\n');
        setHasSubAccount(false);

      } catch (e: any) {
        const message =
          e?.response?.data?.message || e?.message || 'Erro ao verificar subconta';
        if (e?.response?.status !== 404) {
          console.warn('[Carteira] Erro ao verificar subconta:', message);
        }
        setHasSubAccount(false);
      } finally {
        setCheckingSubAccount(false);
      }
    };

    verificarSubconta();
  }, [usuario?.lytexSubAccountId, usuario?.cpf, updateUsuario]);

  useEffect(() => {
    if (hasSubAccount) {
      fetchWallet();
      fetchRecentTransactions();
      fetchLytexTransactions(1);
      // fetchBankAccounts(); // Removido pois era vazio
    }
  }, [hasSubAccount, usuario]);

  // Fetch paid balance (total de saques recebidos)
  useEffect(() => {
    if (usuario?._id) {
      fetchPaidBalance();
    }
  }, [usuario?._id]);

  // Fetch participant caixas and contemplated info (only for participants)
  useEffect(() => {
    if (usuario?.tipo === 'usuario') {
      fetchParticipantCaixas();
    }
  }, [usuario]);

  const OverviewTab = () => {
    // Calcular a próxima data de recebimento baseado nos caixas gerenciados
    const proximoRecebimento = caixasGerenciados
      .filter((c) => c.dataFim && c.status === 'ativo')
      .map((c) => ({ nome: c.nome, data: new Date(c.dataFim!) }))
      .sort((a, b) => a.data.getTime() - b.data.getTime())[0];

    return (
      <div className="space-y-6">
        {/* Banner do Participante Contemplado - Only for participants with caixas */}
        {usuario?.tipo === 'usuario' && contemplatedInfo && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {/* Ícone de crescimento */}
              <div className="bg-green-100 rounded-2xl p-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>

              <div className="flex-1">
                {/* Título com badge do mês */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Participante Contemplado em {contemplatedInfo.mesNome}
                  </h2>
                  <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Mês {contemplatedInfo.mesAtual}
                  </span>
                </div>

                {/* Card do participante */}
                <div className="bg-white/50 rounded-xl p-4 mb-4">
                  <p className="text-green-600 text-sm font-medium mb-2">Recebe este mês</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {contemplatedInfo.participanteNome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{contemplatedInfo.participanteNome}</p>
                      <p className="text-green-600 text-sm">
                        Valor: {formatCurrency(contemplatedInfo.valor)} • Vencimento: {contemplatedInfo.vencimento}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações de transferência */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      A transferência será realizada <strong className="text-green-600">automaticamente no dia {contemplatedInfo.vencimento}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Comprovante e notificações serão enviados para <strong className="text-green-600">todos os participantes</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card principal com os 4 saldos */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-blue-100 text-sm mb-1">Carteira</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-blue-100 hover:text-white"
                >
                  {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <Wallet size={40} className="text-blue-300" />
          </div>

          {/* 4 Cards de Saldo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Saldo Disponível */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-100 text-xs mb-1">Saldo Disponível</p>
              <p className="text-2xl font-bold">
                {showBalance ? formatCurrency(accountData.balance) : 'R$ ••••••'}
              </p>
            </div>

            {/* Saldo Pendente */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-100 text-xs mb-1">Saldo Pendente</p>
              <p className="text-2xl font-bold">
                {showBalance ? formatCurrency(accountData.pendingBalance) : 'R$ ••••••'}
              </p>
              <p className="text-blue-200 text-xs mt-1">Aguardando confirmação</p>
            </div>

            {/* Saldo Bloqueado */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-blue-100 text-xs mb-1">Saldo Bloqueado</p>
              <p className="text-2xl font-bold">
                {showBalance ? formatCurrency(accountData.blockedBalance) : 'R$ ••••••'}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                Taxas futuras: {showBalance ? formatCurrency(accountData.futureTaxes) : 'R$ •••'}
              </p>
            </div>

            {/* Saldo Pago - NOVO */}
            <div className="bg-green-500/20 backdrop-blur rounded-xl p-4 border border-green-400/30">
              <p className="text-green-100 text-xs mb-1">💰 Saldo Pago</p>
              <p className="text-2xl font-bold text-green-100">
                {showBalance ? formatCurrency(accountData.paidBalance || 0) : 'R$ ••••••'}
              </p>
              <p className="text-green-200 text-xs mt-1">Total de saques recebidos</p>
            </div>
          </div>

          {/* Data de Recebimento */}
          {proximoRecebimento ? (
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-blue-100 text-sm mb-1">📅 Próximo Recebimento Previsto</p>
              <p className="text-xl font-bold">
                {formatDate(proximoRecebimento.data.toISOString())}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                Caixa: {proximoRecebimento.nome}
              </p>
            </div>
          ) : caixasGerenciados.length > 0 ? (
            <div className="bg-white/15 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-blue-100 text-sm mb-1">📅 Recebimento</p>
              <p className="text-sm text-blue-200">
                A data de recebimento será definida conforme encerramento dos caixas ativos
              </p>
            </div>
          ) : null}

          {/* Erro de carteira */}
          {walletError && (
            <div className="mt-3 text-xs bg-red-50/20 border border-red-200/30 text-red-100 rounded-lg p-3 whitespace-pre-line">
              {walletError}
            </div>
          )}
        </div>
      </div>
    );
  };

  // BLOCK: Users must sign contract before accessing wallet
  if (usuario?.tipo === 'usuario' && !usuario?.contratoAssinado) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-blue-600" />
                Minha Carteira
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Contrato de Adesão Pendente
            </h2>

            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Para acessar a carteira e utilizar todas as funcionalidades do Juntix, você precisa ler e aceitar o Contrato de Adesão.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/contrato')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                <FileText className="w-5 h-5" />
                <span>Li e aceito os termos de uso e Contrato de Adesão ao Juntix</span>
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-gray-600 hover:text-gray-800 px-6 py-3 rounded-xl font-medium transition-colors border border-gray-200 hover:border-gray-300"
              >
                Voltar para Home
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                O contrato garante sua segurança e define os termos de uso da plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSubAccount) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-blue-600" />
                Minha Carteira
              </h1>
            </div>
          </div>
        </div>

        <SubAccountCreation
          usuario={usuario}
          updateUsuario={updateUsuario}
          onSuccess={() => {
            setHasSubAccount(true);
            setSuccessMessage('Subconta criada com sucesso! ✅');
            setShowSuccessModal(true);
            setTimeout(() => {
              setShowSuccessModal(false);
              // window.location.reload(); // Removido para permitir fluxo de Onboarding
            }, 2000);
          }}
          setOnboardingUrl={setOnboardingUrl}
          setShowOnboardingModal={setShowOnboardingModal}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wallet className="text-blue-600" />
              Minha Carteira
            </h1>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'account'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
            >
              Dados da Conta
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'account' && (
          <CarteiraDataAccounts
            usuario={usuario}
            subcontaData={subcontaData}
            accountData={accountData}
            caixasGerenciados={caixasGerenciados}
            hasSubAccount={hasSubAccount}
            createSubAccountAction={() => { }}
          />
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sucesso!</h3>
              <p className="text-gray-600">{successMessage}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Onboarding Modal - Verificação de Identidade */}
      <IdentityVerification
        isOpen={showOnboardingModal}
        onboardingUrl={onboardingUrl}
        onClose={() => {
          setShowOnboardingModal(false);
          setOnboardingUrl(null);
        }}
      />
    </div>
  );
};

export default WalletDashboard;
