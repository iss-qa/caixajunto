import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Download, Plus, Eye, EyeOff, Building2, Check, X, Calendar, Mail, Clock, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { carteiraService, cobrancasService, caixasService, pagamentosService, participantesService, subcontasService, bancosService, contaBancariaService, recebimentosService } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { TransacoesDetalhadas } from './Carteira/components/TransacoesDetalhadas';

type StatusTransacaoCarteira = 'em_dia' | 'atrasado';
type TipoTransacaoCarteira = 'entrada' | 'saida';

interface CaixaCarteiraApi {
  _id: string;
  nome: string;
  tipo?: 'mensal' | 'semanal';
  valorParcela?: number;
  valorTotal?: number;
  qtdParticipantes?: number;
  duracaoMeses?: number;
  taxaServico?: number;
  adminId?:
  | {
    _id?: string;
    nome?: string;
    email?: string;
  }
  | string;
}

interface PagamentoCarteiraApi {
  _id: string;
  caixaId?:
  | string
  | {
    _id?: string;
  };
  pagadorId?:
  | {
    _id?: string;
    nome?: string;
  }
  | string;
  participanteNome?: string;
  valorParcela?: number;
  taxaServico?: number;
  status: string;
  dataPagamento?: string;
  diasAtraso?: number | string;
  mesReferencia?: number;
}

interface TransacaoRecenteCarteira {
  id: string;
  caixaId: string;
  caixaNome: string;
  caixaAdminNome: string;
  participanteNome: string;
  dataPagamento: string;
  valorPago: number;
  status: StatusTransacaoCarteira;
  tipo: TipoTransacaoCarteira;
  mesReferencia?: number;
  tipoCaixa?: 'mensal' | 'semanal';
}

interface TransacaoLytexCarteira {
  id: string;
  type: string;
  description: string;
  status: string;
  amount: number;
  createdAt: string;
}

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
  const [creatingSubAccount, setCreatingSubAccount] = useState(false);
  const [subAccountError, setSubAccountError] = useState<string | null>(null);
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
  } | null>(null);

  // Lista de caixas que o admin gerencia
  const [caixasGerenciados, setCaixasGerenciados] = useState<Array<{ _id: string; nome: string; status?: string; dataFim?: string }>>([]);

  const [subForm, setSubForm] = useState({
    type: 'pf',
    cpfCnpj: usuario?.cpf || '',
    name: usuario?.nome || '',
    fantasyName: '',
    cellphone: usuario?.telefone || '',
    email: usuario?.email || '',
    aboutBusiness: '',
    branchOfActivity: '',
    webhookUrl: '',
    withdrawValue: 50000,
    numberOfExpectedMonthlyEmissions: 50,
    expectedMonthlyBilling: 50000,
    addressStreet: '',
    addressZone: '',
    addressCity: '',
    addressState: '',
    addressNumber: '',
    addressComplement: '',
    addressZip: '',
    adminCpf: usuario?.cpf || '',
    adminFullName: usuario?.nome || '',
    adminCellphone: usuario?.telefone || '',
    adminBirthDate: '',
    adminMotherName: '',
  });

  // Dados bancários para criação da subconta
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [selectedBankForSub, setSelectedBankForSub] = useState<{ code: string; name: string } | null>(null);
  const [bankAgency, setBankAgency] = useState('');
  const [bankAgencyDv, setBankAgencyDv] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountDv, setBankAccountDv] = useState('');
  const [bankAccountType, setBankAccountType] = useState<'corrente' | 'poupanca'>('corrente');

  const [bankAccounts, setBankAccounts] = useState<
    Array<{
      _id?: string;
      bankCode: string;
      bankName: string;
      agency: string;
      agencyDv: string;
      account: string;
      accountDv: string;
      accountType: 'corrente' | 'poupanca';
      isDefault?: boolean;
    }>
  >([]);

  // Bank account data from Lytex (using admin token)
  const [bankAccountData, setBankAccountData] = useState<{
    bank?: { code: string; name: string; ispb?: string };
    agency?: { number: string; dv?: string };
    account?: { type: string; number: string; dv?: string; operation?: string };
  } | null>(null);
  const [loadingBankAccount, setLoadingBankAccount] = useState(false);
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      setWalletError(null);

      // Primeiro tenta buscar a carteira usando credenciais individuais do participante
      console.log('💰 Tentando buscar carteira individual do participante...');

      try {
        const individualResponse = await subcontasService.getMyWallet();
        console.log('📦 Resposta da carteira individual:', individualResponse);

        // Se obteve sucesso com carteira individual, usa esses valores
        if (individualResponse?.success && individualResponse?.wallet) {
          console.log('✅ Carteira individual obtida com sucesso:', individualResponse.wallet);
          const wallet = individualResponse.wallet;
          const availableRaw = typeof wallet?.balance === 'number' ? wallet.balance : 0;
          const pendingRaw = typeof wallet?.futureBalance === 'number' ? wallet.futureBalance : 0;
          const blockedRaw = typeof wallet?.blockedBalance === 'number' ? wallet.blockedBalance : 0;
          const futureTaxesRaw = typeof wallet?.futureTaxes === 'number' ? wallet.futureTaxes : 0;
          const available = availableRaw / 100;
          const pending = pendingRaw / 100;
          const blocked = blockedRaw / 100;
          const futureTaxes = futureTaxesRaw / 100;

          console.log('💵 Valores da carteira individual:', {
            balance: available,
            pendingBalance: pending,
            blockedBalance: blocked,
            futureTaxes,
          });

          setAccountData((prev) => ({
            ...prev,
            balance: available,
            pendingBalance: pending,
            blockedBalance: blocked,
            futureTaxes,
          }));
          return; // Sucesso, não precisa do fallback
        }

        // Se sucesso=false, verifica se pode usar fallback
        if (individualResponse?.success === false) {
          const errorCode = individualResponse?.error;
          console.log('⚠️ Erro na carteira individual:', errorCode, individualResponse?.message);

          // CORREÇÃO: Só usa fallback (carteira master) para usuário master
          // Para admin e participante, mostra saldo zerado e mensagem
          if (usuario?.tipo !== 'master') {
            console.log('ℹ️ Usuário não é master, não usando fallback para carteira geral');

            if (errorCode === 'CREDENTIALS_NOT_CONFIGURED') {
              setWalletError(
                '⚠️ Configuração Pendente - Ação Necessária:\n\n' +
                '1️⃣ Entre em contato com o ADMINISTRADOR do seu caixa\n' +
                '2️⃣ Solicite que ele abra um CHAMADO para configurar suas credenciais (clientID e clientSecret)\n' +
                //   '3️⃣ Envie seus DADOS BANCÁRIOS ao administrador:\n' +
                //   '   • BANCO (nome e código)\n' +
                //   '   • AGÊNCIA (com dígito)\n' +
                //   '   • CONTA (com dígito)\n' +
                //   '   • NOME COMPLETO (titular da conta)\n\n' +
                //   '📌 Estes dados são necessários para configurar sua conta de recebimento quando você for contemplado.\n\n' +
                'Após a configuração, você poderá visualizar seu saldo na aba "Dados da Conta".'
              );
            } else if (errorCode === 'SUBCONTA_NOT_FOUND') {
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
        }
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

          // CORREÇÃO: O valor pago é apenas o valorBase (que já inclui IPCA se houver)
          // Não devemos somar fundoReserva, bonusFinal e taxaServico aqui,
          // pois esses valores já estão incluídos no total da cobrança
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
    try {
      const response = await carteiraService.getBankAccounts();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.contas)
          ? response.contas
          : response?.data && Array.isArray(response.data)
            ? response.data
            : [];
      setBankAccounts(
        list.map((c: any) => ({
          _id: String(c._id || ''),
          bankCode: String(c.bankCode || ''),
          bankName: String(c.bankName || ''),
          agency: String(c.agency || ''),
          agencyDv: String(c.agencyDv || ''),
          account: String(c.account || ''),
          accountDv: String(c.accountDv || ''),
          accountType:
            c.accountType === 'poupanca' ? 'poupanca' : ('corrente' as const),
          isDefault: Boolean(c.isDefault),
        })),
      );
    } catch {
      setBankAccounts([]);
    }
  };

  // Função para buscar dados bancários do usuário logado a partir do MongoDB local
  const fetchMyBankAccountsFromLocal = async () => {
    try {
      setLoadingBankAccount(true);
      setBankAccountError(null);

      console.log('🔍 [Carteira] Iniciando busca de dados bancários do usuário logado...');
      console.log('👤 [Carteira] Usuario ID:', usuario?._id);
      console.log('👤 [Carteira] Usuario Nome:', usuario?.nome);

      const response = await contaBancariaService.getMyBankAccounts();
      console.log('📦 [Carteira] Resposta COMPLETA da API:', JSON.stringify(response, null, 2));
      console.log('📊 [Carteira] Tipo da resposta:', typeof response);
      console.log('🔢 [Carteira] É array?:', Array.isArray(response));

      // Extract bank account data from response
      const accounts = Array.isArray(response) ? response : response?.contas || response?.data || [];
      console.log('🏦 [Carteira] Contas extraídas:', accounts);
      console.log('📈 [Carteira] Número de contas:', accounts.length);

      if (accounts.length > 0) {
        const firstAccount = accounts[0];
        console.log('✅ [Carteira] Primeira conta encontrada:', JSON.stringify(firstAccount, null, 2));

        const bankData = {
          bank: {
            code: firstAccount.bankCode || '',
            name: firstAccount.bankName || '',
          },
          agency: {
            number: firstAccount.agency || '',
            dv: firstAccount.agencyDv || '',
          },
          account: {
            type: firstAccount.accountType || 'corrente',
            number: firstAccount.account || '',
            dv: firstAccount.accountDv || '',
          },
        };

        console.log('💾 [Carteira] Dados formatados para exibição:', JSON.stringify(bankData, null, 2));
        setBankAccountData(bankData);
        console.log('✅ [Carteira] Dados bancários carregados do MongoDB local');
      } else {
        console.log('⚠️ [Carteira] Nenhuma conta bancária encontrada para este usuário');
        setBankAccountData(null);
      }
    } catch (e: any) {
      console.error('❌ [Carteira] Erro ao buscar dados bancários:', e);
      console.error('❌ [Carteira] Erro detalhado:', e?.response?.data || e?.message);
      setBankAccountError(e?.response?.data?.message || e?.message || 'Erro ao buscar dados bancários');
      setBankAccountData(null);
    } finally {
      setLoadingBankAccount(false);
    }
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

  const handleCreateSubAccount = async () => {
    try {
      if (!usuario) {
        throw new Error('Usuário não autenticado');
      }
      setCreatingSubAccount(true);
      setSubAccountError(null);
      const payload: any = {
        type: subForm.type,
        cpfCnpj: subForm.cpfCnpj,
        name: subForm.name,
        fantasyName: subForm.type === 'pj' ? subForm.fantasyName : undefined,
        cellphone: subForm.cellphone,
        email: subForm.email,
        aboutBusiness: subForm.aboutBusiness,
        branchOfActivity: subForm.branchOfActivity,
        webhookUrl: subForm.webhookUrl || undefined,
        withdrawValue: subForm.withdrawValue,
        numberOfExpectedMonthlyEmissions:
          subForm.numberOfExpectedMonthlyEmissions,
        expectedMonthlyBilling: subForm.expectedMonthlyBilling,
        address: subForm.addressStreet
          ? {
            street: subForm.addressStreet,
            zone: subForm.addressZone,
            city: subForm.addressCity,
            state: subForm.addressState,
            number: subForm.addressNumber || '0',
            complement: subForm.addressComplement || undefined,
            zip: subForm.addressZip,
          }
          : undefined,
        adminEnterprise: subForm.adminCpf
          ? {
            cpf: subForm.adminCpf,
            fullName: subForm.adminFullName || subForm.name,
            cellphone: subForm.adminCellphone || subForm.cellphone,
            birthDate: subForm.adminBirthDate
              ? new Date(subForm.adminBirthDate).toISOString()
              : new Date().toISOString(),
            motherName: subForm.adminMotherName || 'Não informado',
          }
          : undefined,
      };


      // Montar banksAccounts se preenchido
      if (selectedBankForSub && bankAgency && bankAccount) {
        // Padronizar nome do banco para corresponder ao Postman
        let bankName = selectedBankForSub.name;
        if (selectedBankForSub.code === '260') {
          bankName = 'Nu Pagamentos S.A'; // Padronizado para Nubank
        }

        payload.banksAccounts = [
          {
            owner: {
              name: subForm.name,
              type: subForm.type,
              cpfCnpj: subForm.cpfCnpj,
            },
            bank: {
              code: selectedBankForSub.code,
              name: bankName,
              ispb: selectedBankForSub.code === '260' ? '18236120' : undefined, // ISPB do Nubank
            },
            agency: { number: bankAgencyDv ? `${bankAgency}${bankAgencyDv}` : bankAgency },
            creditCard: false,
            account: { type: bankAccountType, number: bankAccount, dv: bankAccountDv || '0' },
          },
        ];
      }

      // CRÍTICO: Adicionar webhookUrl para gerar seção "Aplicação" no Lytex
      payload.webhookUrl = 'https://webhook.site/rafaela-notifications';


      // 🔍 DEBUG COMPLETO - Início
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const endpoint = `${API_URL}/subcontas/me`;
      const token = localStorage.getItem('token');

      console.group('🚀 DEBUG - CRIAR SUBCONTA');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('📍 Endpoint:', endpoint);
      console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : 'Não encontrado');
      console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));

      // Gera comando curl equivalente
      const curlCommand = `curl -X POST '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${token || 'SEU_TOKEN_AQUI'}' \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`;

      console.log('💻 Comando CURL equivalente:');
      console.log(curlCommand);
      console.groupEnd();
      // 🔍 DEBUG COMPLETO - Fim

      console.log('[Carteira] Enviando payload de criação de subconta', payload);

      const resp = await subcontasService.createMine(payload);

      // 🔍 DEBUG - Resposta
      console.group('✅ DEBUG - RESPOSTA DA API');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('📥 Resposta completa:', JSON.stringify(resp, null, 2));
      console.log('🎯 Success:', resp?.success);
      console.log('🆔 Subconta ID:', resp?.subconta?.lytexId || resp?.subconta?._id);
      console.groupEnd();

      console.log('[Carteira] Resposta da API ao criar subconta', resp);
      const subAccountId =
        (resp && resp.subconta && (resp.subconta.lytexId || resp.subconta._id)) || (resp && resp.subAccountId) || (resp && resp.id) || undefined;
      if (subAccountId) {
        setHasSubAccount(true);
        updateUsuario({ lytexSubAccountId: subAccountId });
        console.log(
          '[Carteira] Subconta criada com sucesso, id:',
          subAccountId,
        );
        setSuccessMessage('Subconta criada com sucesso! ✅');

        // Check for onboarding URL
        let urlOnboarding = resp?.onboardingUrl || resp?.subconta?.onboardingUrl;

        // 🧪 TESTE: Se não vier URL (ex: Sandbox), usar a URL de teste fornecida
        if (!urlOnboarding) {
          console.log('[Carteira] Modo Teste: Usando URL de onboarding simulada');
          urlOnboarding = 'https://cadastro.io/9452ec3c2ab24ec84aed7723aae56f3d';
        }

        if (urlOnboarding) {
          console.log('[Carteira] Onboarding necessário. URL:', urlOnboarding);
          setOnboardingUrl(urlOnboarding);
          setShowOnboardingModal(true);
          // Not reloading here, waiting for user to complete onboarding
          return;
        }

        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          window.location.reload();
        }, 2000);
        return;
      }
      console.warn(
        '[Carteira] Chamada de criação de subconta não retornou ID',
        resp,
      );
      setSubAccountError('Não foi possível obter o ID da subconta criada');
      setTimeout(() => setSubAccountError(null), 5000);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const message = data?.message || e?.message || 'Falha ao criar subconta';

      // 🔍 DEBUG - Erro detalhado
      console.group('❌ DEBUG - ERRO AO CRIAR SUBCONTA');
      console.log('⏰ Timestamp:', new Date().toISOString());
      console.log('🔴 Status HTTP:', status || 'N/A');
      console.log('📛 Mensagem:', message);
      console.log('📦 Response Data completo:', JSON.stringify(data, null, 2));
      console.log('🔍 Headers da resposta:', e?.response?.headers);
      console.log('🌐 URL da requisição:', e?.config?.url);
      console.log('📤 Payload enviado:', e?.config?.data);
      console.log('⚠️ Erro completo:', e);
      console.log('📚 Stack trace:', e?.stack);
      console.groupEnd();

      console.error(
        '[Carteira] Erro ao criar subconta',
        'status:',
        status,
        'data:',
        data,
        'erro:',
        e,
      );

      // Tratamento específico para erros de duplicação
      const errorCode = data?.error;

      if (errorCode === 'DUPLICATE_CPF_LYTEX' || errorCode === 'DUPLICATE_CPF') {
        setSubAccountError(
          'Já existe uma subconta cadastrada com este CPF. Redirecionando para sua carteira...',
        );
        setHasSubAccount(true);

        // Atualizar contexto se tiver subcontaId
        if (data?.subcontaId) {
          updateUsuario({ lytexSubAccountId: data.subcontaId });
        }

        // Recarregar após 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      if (
        status === 409 ||
        typeof message === 'string' &&
        message.toLowerCase().includes('subconta já criada')
      ) {
        setSubAccountError(
          'Você já possui uma subconta criada. Abrindo sua carteira.',
        );
        setHasSubAccount(true);
        return;
      }

      setSubAccountError(message);
      setTimeout(() => setSubAccountError(null), 5000);
    } finally {
      setCreatingSubAccount(false);
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
            });

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
        setSubAccountError(null);

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
            });

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
      fetchBankAccounts();
    }
  }, [hasSubAccount, usuario]);

  // 🧪 TESTE FORCE: Ativar modal se tiver subconta (simulando pendência)
  useEffect(() => {
    if (hasSubAccount && !onboardingUrl) {
      const testUrl = 'https://cadastro.io/9452ec3c2ab24ec84aed7723aae56f3d';
      console.log('[Carteira] 🧪 FORCE TEST: Abrindo modal com URL de teste');
      setOnboardingUrl(testUrl);
      setShowOnboardingModal(true);
    }
  }, [hasSubAccount]);


  // 🔄 POLLING: Verificar status do onboarding automaticamente
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (showOnboardingModal && onboardingUrl) {
      console.log('🔄 Iniciando polling de verificação de onboarding...');

      intervalId = setInterval(async () => {
        try {
          console.log('📡 Verificando status da subconta (Polling)...');
          // Nota: checkByCpf retorna dados mais completos do status no Lytex
          // Mas getMine é o que usamos para criar. Vamos usar getMine ou checkByCpf?
          // checkByCpf é mais robusto para status externo.

          if (usuario?.cpf) {
            const checkResp = await subcontasService.checkByCpf(usuario.cpf);

            // Se não tiver mais onboardingUrl no retorno, ou status for diferente
            // Assumimos que foi concluído.
            // Como não sabemos o campo exato de status de sucesso, vamos assumir que
            // se a URL sumir do retorno do backend, ou algo mudar, é sucesso.
            // Mas o backend atual sempre retorna a URL se ela existir no objeto do mongo/lytex?
            // Se o usuário completou, o Lytex deve atualizar o status.

            // Para garantir, vamos verificar se o onboardingUrl MUDOU ou SUMIU
            // ou se temos um indicativo de sucesso.
            // Por enquanto, vamos logar. 
            // Se o usuário pediu para remover o botão, precisamos confiar que algo muda.

            console.log('📦 Status Polling:', checkResp);

            // Lógica Provisória: Se a subconta existe e NÃO tem onboardingUrl (ou mudou status), fecha.
            // Mas o backend pode retornar a URL antiga cacheada?
            // Vamos confiar que o clique no final do fluxo do iframe (redirect) ou o polling resolve.

            const currentOnboardingUrl = checkResp?.subconta?.onboardingUrl;

            // Se não tiver URL de onboarding no retorno, FINALIZOU!
            if (!currentOnboardingUrl && checkResp?.exists) {
              console.log('✅ Onboarding concluído! Recarregando...');
              clearInterval(intervalId);
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('❌ Erro no polling:', error);
        }
      }, 5000); // Checar a cada 5 segundos
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showOnboardingModal, onboardingUrl, usuario?.cpf]);

  useEffect(() => {
    if (usuario?._id && hasSubAccount) {
      fetchMyBankAccountsFromLocal();
    }
  }, [usuario?._id, hasSubAccount, subcontaData?._id]);

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

  const AccountTab = () => (
    <div className="space-y-6">
      {/* Card de Status da Conta */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 ${subcontaData ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center`}>
            {subcontaData ? (
              <Check className="text-green-600" size={24} />
            ) : (
              <X className="text-yellow-600" size={24} />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {subcontaData ? 'Conta Ativa' : 'Subconta Não Encontrada'}
            </h3>
            <p className="text-sm text-gray-600">
              {subcontaData
                ? 'Sua conta está funcionando normalmente'
                : 'Crie sua subconta para começar a receber'}
            </p>
          </div>
        </div>

        {!hasSubAccount && (
          <div className="mb-4">
            <button
              onClick={handleCreateSubAccount}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              disabled={creatingSubAccount}
            >
              Criar Subconta
            </button>
            {subAccountError && (
              <p className="mt-2 text-xs text-red-600">{subAccountError}</p>
            )}
          </div>
        )}

        {/* Dados Principais */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between">
            <span className="text-gray-600">Nome Completo</span>
            <span className="font-medium text-gray-800">{subcontaData?.name || accountData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CPF/CNPJ</span>
            <span className="font-medium text-gray-800">{subcontaData?.cpfCnpj || accountData.cpf}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">E-mail</span>
            <span className="font-medium text-gray-800">{subcontaData?.email || accountData.email}</span>
          </div>
          {subcontaData?.cellphone && (
            <div className="flex justify-between">
              <span className="text-gray-600">Celular</span>
              <span className="font-medium text-gray-800">{subcontaData.cellphone}</span>
            </div>
          )}
          {subcontaData?.type && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo</span>
              <span className="font-medium text-gray-800">{subcontaData.type.toUpperCase()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Status</span>
            <span className={`px-3 py-1 ${subcontaData ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} rounded-full text-sm font-medium`}>
              {subcontaData ? 'Ativa' : 'Pendente'}
            </span>
          </div>
          {subcontaData?.createdAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Conta criada em</span>
              <span className="font-medium text-gray-800">{formatDate(subcontaData.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card de Dados Lytex */}
      {subcontaData?.lytexId && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-800 mb-4">📋 Dados Lytex</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ID Lytex</span>
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                {subcontaData.lytexId}
              </span>
            </div>
            {subcontaData._id && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ID Local</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                  {subcontaData._id}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Credenciais API</span>
              <span className={`px-3 py-1 ${subcontaData.hasCredentials ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} rounded-full text-sm font-medium`}>
                {subcontaData.hasCredentials ? '✓ Configuradas' : '⚠ Não configuradas'}
              </span>
            </div>
            {subcontaData.clientId && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Client ID</span>
                <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded text-blue-800">
                  {subcontaData.clientId}
                </span>
              </div>
            )}
            {subcontaData.clientSecret && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Client Secret</span>
                <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded text-blue-800">
                  {subcontaData.clientSecret}
                </span>
              </div>
            )}
            {subcontaData.nomeCaixa && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Caixa Associado</span>
                <span className="font-medium text-gray-800">
                  {subcontaData.nomeCaixa}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card de Dados Bancários */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-800 mb-4">🏦 Dados Bancários</h4>

        {loadingBankAccount ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Carregando dados bancários...</span>
          </div>
        ) : bankAccountError ? (
          <div className="text-sm text-red-600 py-2">
            {bankAccountError}
          </div>
        ) : bankAccountData ? (
          <div className="space-y-3">
            {bankAccountData.bank && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Banco</span>
                  <span className="font-medium text-gray-800">
                    {bankAccountData.bank.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Código do Banco</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                    {bankAccountData.bank.code}
                  </span>
                </div>
                {bankAccountData.bank.ispb && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ISPB</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                      {bankAccountData.bank.ispb}
                    </span>
                  </div>
                )}
              </>
            )}

            {bankAccountData.agency && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Agência</span>
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                  {bankAccountData.agency.number}
                  {bankAccountData.agency.dv && `-${bankAccountData.agency.dv}`}
                </span>
              </div>
            )}

            {bankAccountData.account && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tipo de Conta</span>
                  <span className="font-medium text-gray-800 capitalize">
                    {bankAccountData.account.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Conta</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                    {bankAccountData.account.number}
                    {bankAccountData.account.dv && `-${bankAccountData.account.dv}`}
                  </span>
                </div>
                {bankAccountData.account.operation && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Operação</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                      {bankAccountData.account.operation}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600 py-2">
            Nenhum dado bancário encontrado
          </div>
        )}
      </div>

      {/* Card de Caixas Gerenciados (apenas admin/master) */}
      {caixasGerenciados.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-800 mb-4">📦 Caixas Gerenciados ({caixasGerenciados.length})</h4>
          <div className="space-y-2">
            {caixasGerenciados.map((caixa) => (
              <div key={caixa._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-medium text-gray-800">{caixa.nome}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${caixa.status === 'ativo' ? 'bg-green-100 text-green-700' :
                  caixa.status === 'completo' ? 'bg-blue-100 text-blue-700' :
                    caixa.status === 'finalizado' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                  }`}>
                  {caixa.status || 'Rascunho'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card de Endereço */}
      {subcontaData?.address && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-800 mb-4">📍 Endereço</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Logradouro</span>
              <span className="font-medium text-gray-800">
                {subcontaData.address.street}{subcontaData.address.number ? `, ${subcontaData.address.number}` : ''}
              </span>
            </div>
            {subcontaData.address.complement && (
              <div className="flex justify-between">
                <span className="text-gray-600">Complemento</span>
                <span className="font-medium text-gray-800">{subcontaData.address.complement}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Bairro</span>
              <span className="font-medium text-gray-800">{subcontaData.address.zone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cidade/UF</span>
              <span className="font-medium text-gray-800">{subcontaData.address.city}/{subcontaData.address.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CEP</span>
              <span className="font-medium text-gray-800">{subcontaData.address.zip}</span>
            </div>
          </div>
        </div>
      )}

      {/* Informações Importantes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Informações Importantes</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Saques processados em até 1 dia útil</li>
          <li>• Sem taxa para transferências acima de R$ 100</li>
          <li>• Suporte disponível de segunda a sexta, 9h às 18h</li>
          {!subcontaData?.hasCredentials && (
            <li className="text-orange-700">• ⚠ Credenciais API não configuradas - solicite ao master</li>
          )}
        </ul>
      </div>
    </div>
  );


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

        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            {checkingSubAccount ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Carregando carteira
                </h2>
                <p className="text-sm text-gray-600">
                  Verificando sua subconta...
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Crie sua subconta para começar a usar a carteira
                </h2>
                <div className="text-sm text-gray-700 mb-6 space-y-2">
                  <p>
                    Para que você possa receber seus pontos do caixa de forma automática e segura, precisamos criar sua subconta no nosso sistema de pagamentos.
                  </p>
                  <p className="font-medium">Por que isso é importante?</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>✓ Recebimento automático dos seus valores</li>
                    <li>✓ Segurança nas transações</li>
                    <li>✓ Rastreamento completo de todos os pagamentos</li>
                    <li>✓ Proteção dos seus dados financeiros</li>
                  </ul>
                  <p>
                    Preencha os dados abaixo: Alguns campos já foram preenchidos automaticamente com base no seu cadastro. Verifique se as informações estão corretas e complete os dados que faltam.
                  </p>
                </div>
              </>
            )}

            {checkingSubAccount ? null : (
              <>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={subForm.name}
                      onChange={(e) =>
                        setSubForm({ ...subForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {subForm.type === 'pj' ? 'CNPJ' : 'CPF'}
                    </label>
                    <input
                      type="text"
                      value={subForm.cpfCnpj}
                      onChange={(e) =>
                        setSubForm({ ...subForm, cpfCnpj: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo
                    </label>
                    <select
                      value={subForm.type}
                      onChange={(e) =>
                        setSubForm({ ...subForm, type: e.target.value as 'pf' | 'pj' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pf">Pessoa Física</option>
                      <option value="pj">Pessoa Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={subForm.cellphone}
                      onChange={(e) =>
                        setSubForm({ ...subForm, cellphone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={subForm.email}
                      onChange={(e) =>
                        setSubForm({ ...subForm, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sobre o negócio
                    </label>
                    <input
                      type="text"
                      value={subForm.aboutBusiness}
                      onChange={(e) =>
                        setSubForm({ ...subForm, aboutBusiness: e.target.value })
                      }
                      placeholder="Ex: Administrador de caixas"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ramo de atividade
                    </label>
                    <input
                      type="text"
                      value={subForm.branchOfActivity}
                      onChange={(e) =>
                        setSubForm({ ...subForm, branchOfActivity: e.target.value })
                      }
                      placeholder="Serviços"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {subForm.type === 'pj' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                      <input
                        type="text"
                        value={subForm.fantasyName}
                        onChange={(e) => setSubForm({ ...subForm, fantasyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Administrador da conta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                      <input
                        type="text"
                        value={subForm.adminCpf}
                        onChange={(e) => setSubForm({ ...subForm, adminCpf: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                      <input
                        type="text"
                        value={subForm.adminFullName}
                        onChange={(e) => setSubForm({ ...subForm, adminFullName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={subForm.adminCellphone}
                        onChange={(e) => setSubForm({ ...subForm, adminCellphone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                      <input
                        type="date"
                        value={subForm.adminBirthDate}
                        onChange={(e) => setSubForm({ ...subForm, adminBirthDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome da mãe</label>
                      <input
                        type="text"
                        value={subForm.adminMotherName}
                        onChange={(e) => setSubForm({ ...subForm, adminMotherName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados Bancários */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Dados bancários</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                      <button
                        type="button"
                        onClick={async () => {
                          setBankDropdownOpen(!bankDropdownOpen);
                          try {
                            setLoadingBanks(true);
                            setBanksError(null);
                            const resp = await bancosService.getAll(bankSearch || undefined);
                            const list = Array.isArray(resp?.banks) ? resp.banks : (Array.isArray(resp) ? resp : []);
                            setBanks(list.map((b: any) => ({ code: String(b.code || b.codigo || ''), name: String(b.name || b.nome || '') })));
                          } catch (e: any) {
                            setBanksError(e?.response?.data?.message || e?.message || 'Erro ao carregar bancos');
                          } finally {
                            setLoadingBanks(false);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg flex items-center justify-between"
                      >
                        <span className={selectedBankForSub ? 'text-gray-900' : 'text-gray-400'}>
                          {selectedBankForSub ? `${selectedBankForSub.code} - ${selectedBankForSub.name}` : 'Selecione o banco'}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 ${bankDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.168l3.71-2.94a.75.75 0 0 1 .94 1.17l-4.25 3.37a.75.75 0 0 1-.94 0l-4.25-3.37a.75.75 0 0 1-.02-1.06Z" /></svg>
                      </button>
                      {bankDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl">
                          <div className="p-2 border-b border-gray-100">
                            <input
                              type="text"
                              value={bankSearch}
                              onChange={async (e) => {
                                const term = e.target.value;
                                setBankSearch(term);
                                try {
                                  setLoadingBanks(true);
                                  const resp = await bancosService.getAll(term || undefined);
                                  const list = Array.isArray(resp?.banks) ? resp.banks : (Array.isArray(resp) ? resp : []);
                                  setBanks(list.map((b: any) => ({ code: String(b.code || b.codigo || ''), name: String(b.name || b.nome || '') })));
                                } catch (err: any) {
                                  setBanksError(err?.response?.data?.message || err?.message || 'Erro ao buscar bancos');
                                } finally {
                                  setLoadingBanks(false);
                                }
                              }}
                              placeholder="Buscar por nome ou código..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {loadingBanks ? (
                              <div className="p-4 text-center text-gray-500">Carregando bancos...</div>
                            ) : banksError ? (
                              <div className="p-4 text-center text-red-600">{banksError}</div>
                            ) : banks.filter(b => {
                              const term = bankSearch.trim().toLowerCase();
                              return !term || b.name.toLowerCase().includes(term) || b.code.toLowerCase().includes(term);
                            }).map((b, idx) => (
                              <button
                                key={`${b.code}-${idx}`}
                                type="button"
                                onClick={() => { setSelectedBankForSub(b); setBankDropdownOpen(false); }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                              >
                                {b.code} - {b.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de conta</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setBankAccountType('corrente')} className={`px-3 py-2 rounded-lg border ${bankAccountType === 'corrente' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}>Conta Corrente</button>
                        <button type="button" onClick={() => setBankAccountType('poupanca')} className={`px-3 py-2 rounded-lg border ${bankAccountType === 'poupanca' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}>Conta Poupança</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                      <input type="text" value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dígito</label>
                      <input type="text" value={bankAgencyDv} onChange={(e) => setBankAgencyDv(e.target.value)} maxLength={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                      <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dígito da conta</label>
                      <input type="text" value={bankAccountDv} onChange={(e) => setBankAccountDv(e.target.value)} maxLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rua
                      </label>
                      <input
                        type="text"
                        value={subForm.addressStreet}
                        onChange={(e) =>
                          setSubForm({ ...subForm, addressStreet: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={subForm.addressZone}
                        onChange={(e) =>
                          setSubForm({ ...subForm, addressZone: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={subForm.addressCity}
                        onChange={(e) =>
                          setSubForm({ ...subForm, addressCity: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <input
                        type="text"
                        value={subForm.addressState}
                        onChange={(e) =>
                          setSubForm({ ...subForm, addressState: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={subForm.addressZip}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setSubForm({ ...subForm, addressZip: digits });
                        }}
                        onBlur={async () => {
                          const cep = String(subForm.addressZip || '').replace(/\D/g, '');
                          if (cep.length !== 8) return;
                          try {
                            const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                            const data = await resp.json();
                            if (!data?.erro) {
                              setSubForm({
                                ...subForm,
                                addressStreet: data.logradouro || subForm.addressStreet,
                                addressZone: data.bairro || subForm.addressZone,
                                addressCity: data.localidade || subForm.addressCity,
                                addressState: data.uf || subForm.addressState,
                              });
                            }
                          } catch { }
                        }}
                        placeholder="00000000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        value={subForm.addressNumber}
                        onChange={(e) =>
                          setSubForm({ ...subForm, addressNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={subForm.addressComplement}
                        onChange={(e) =>
                          setSubForm({
                            ...subForm,
                            addressComplement: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {subAccountError && (
                  <p className="mb-4 text-sm text-red-600">{subAccountError}</p>
                )}

                <button
                  onClick={handleCreateSubAccount}
                  disabled={creatingSubAccount}
                  className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {creatingSubAccount ? 'Criando subconta...' : 'Criar Subconta'}
                </button>
              </>
            )}
          </div>
        </div>
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
        {activeTab === 'account' && <AccountTab />}
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

      {/* Onboarding Modal */}
      {showOnboardingModal && onboardingUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-100"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">Verificação de Identidade Necessária</h3>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Para garantir a segurança das suas transações e liberar o acesso completo à sua carteira, é necessário realizar uma rápida verificação de identidade (envio de documento e reconhecimento facial).
              </p>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-left">
                <h4 className="font-semibold text-blue-800 mb-2 text-sm">Passo a passo:</h4>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span> Clique no botão abaixo para abrir a página segura de verificação.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span> Siga as instruções na tela para tirar foto do seu documento e do seu rosto.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span> Após concluir, retorne aqui e clique em "Já finalizei a verificação".
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <a
                  href={onboardingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Iniciar Verificação Agora
                </a>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 text-gray-500 font-medium hover:text-gray-800 transition-colors"
                >
                  Já finalizei a verificação
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}




      {/* Onboarding Modal with Iframe - WebView Style */}
      {showOnboardingModal && onboardingUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-2 md:p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header do Modal */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm md:text-base">Verificação de Identidade</h3>
                  <p className="text-xs text-gray-500">Ambiente seguro</p>
                </div>
              </div>

              {/* Botão de Fechar / Atualizar (Apenas recarrega a página) */}
              <button
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                title="Fechar e verificar status"
              >
                <X size={24} />
              </button>
            </div>

            {/* Texto Explicativo */}
            <div className="bg-blue-50/50 p-4 border-b border-blue-100 overflow-y-auto max-h-[30vh]">
              <h4 className="text-red-600 font-bold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Por que verificar sua identidade?
              </h4>

              <div className="text-sm text-gray-700 space-y-3 leading-relaxed">
                <p>
                  A captura do documento e reconhecimento facial são <strong>obrigatórios por lei</strong> e garantem:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Proteção contra fraudes e golpes</li>
                    <li>Segurança nas suas transações financeiras</li>
                    <li>Conformidade com as normas do Banco Central</li>
                  </ul>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Garantia de que as transferências sejam feitas para a conta correta</li>
                    <li>Ambiente seguro para todos os usuários</li>
                  </ul>
                </div>

                <p className="text-xs text-gray-500 mt-2 bg-white/50 p-2 rounded border border-gray-100 italic">
                  No Juntix, trabalhamos com dinheiro real. A verificação garante que você receberá seus recursos na sua própria conta bancária, evitando desvios ou saques não autorizados.
                  <br />
                  <span className="font-semibold not-italic text-blue-600 block mt-1">
                    Seus dados são criptografados e protegidos conforme a LGPD. Este processo leva menos de 2 minutos.
                  </span>
                </p>
              </div>
            </div>

            {/* IFRAME Container */}
            <div className="flex-1 bg-gray-100 relative">
              <iframe
                src={onboardingUrl}
                title="Verificação de Identidade"
                allow="camera; microphone; geolocation" // Permissões críticas para face match
                className="w-full h-full border-0"
              />
            </div>


          </motion.div>
        </div>
      )}
      {/* Error Toast (if needed) */}
      {subAccountError && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="bg-red-50 border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Erro ao criar subconta</h3>
                <p className="mt-1 text-sm text-red-700">{subAccountError}</p>
              </div>
              <button
                onClick={() => setSubAccountError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
<svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
</svg>
          </div >
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Erro ao criar subconta</h3>
            <p className="mt-1 text-sm text-red-700">{subAccountError}</p>
          </div>
          <button
            onClick={() => setSubAccountError(null)}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div >
      </motion.div >
    </div >
  )
}
    </div >
  );
};


export default WalletDashboard;
