import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Download, Plus, Eye, EyeOff, Building2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { carteiraService, cobrancasService, caixasService, pagamentosService, subcontasService, bancosService } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

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
  const [recentTransactions, setRecentTransactions] = useState<TransacaoRecenteCarteira[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [lytexTransactions, setLytexTransactions] = useState<TransacaoLytexCarteira[]>([]);
  const [lytexTransactionsLoading, setLytexTransactionsLoading] = useState(false);
  const [lytexTransactionsError, setLytexTransactionsError] = useState<string | null>(null);
  const [lytexPage, setLytexPage] = useState(1);
  const [lytexHasMore, setLytexHasMore] = useState(false);



  const [accountData, setAccountData] = useState({
    name: usuario?.nome || '',
    cpf: usuario?.cpf || '',
    email: usuario?.email || '',
    balance: 0,
    pendingBalance: 0,
    blockedBalance: 0,
    futureTaxes: 0,
    status: 'Ativa',
    createdAt: '',
  });

  const [subForm, setSubForm] = useState({
    type: 'pf',
    cpfCnpj: usuario?.cpf || '',
    name: usuario?.nome || '',
    fantasyName: '',
    cellphone: usuario?.telefone || '',
    email: usuario?.email || '',
    aboutBusiness: 'Prestadora de serviços autônoma',
    branchOfActivity: 'Serviços',
    webhookUrl: '',
    withdrawValue: 50000,
    numberOfExpectedMonthlyEmissions: 50,
    expectedMonthlyBilling: 50000,
    addressStreet: 'Rua das Flores',
    addressZone: 'Centro',
    addressCity: 'Lauro de Freitas',
    addressState: 'BA',
    addressNumber: '123',
    addressComplement: 'Apto 201',
    addressZip: '42700000',
    adminCpf: usuario?.cpf || '',
    adminFullName: usuario?.nome || '',
    adminCellphone: usuario?.telefone || '',
    adminBirthDate: '1991-05-15',
    adminMotherName: 'Maria Jose Silva Santos',
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

  const fetchWallet = async () => {
    try {
      setWalletError(null);
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
      setAccountData((prev) => ({
        ...prev,
        balance: available,
        pendingBalance: pending,
        blockedBalance: blocked,
        futureTaxes,
      }));
    } catch (e: any) {
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
          taxaServico: typeof c.taxaServico === 'number' ? c.taxaServico : 5,
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

          const valorPago = valorBase + fundoReserva + bonusFinal + taxaServico;

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
        payload.banksAccounts = [
          {
            owner: {
              name: subForm.name,
              type: subForm.type,
              cpfCnpj: subForm.cpfCnpj,
            },
            bank: {
              code: selectedBankForSub.code,
              name: selectedBankForSub.name,
            },
            agency: { number: bankAgency },
            creditCard: false,
            account: { type: bankAccountType, number: bankAccount, dv: bankAccountDv || '0' },
          },
        ];
      }

      console.log('[Carteira] Enviando payload de criação de subconta', payload);

      const resp = await subcontasService.createMine(payload);
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
        alert('Subconta criada com sucesso');
        return;
      }
      console.warn(
        '[Carteira] Chamada de criação de subconta não retornou ID',
        resp,
      );
      alert('Não foi possível obter o ID da subconta criada');
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const message = data?.message || e?.message || 'Falha ao criar subconta';

      console.error(
        '[Carteira] Erro ao criar subconta',
        'status:',
        status,
        'data:',
        data,
        'erro:',
        e,
      );

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
      alert(`Erro ao criar subconta: ${message}`);
    } finally {
      setCreatingSubAccount(false);
    }
  };

  useEffect(() => {
    const verificarSubconta = async () => {
      if (usuario?.lytexSubAccountId) {
        setHasSubAccount(true);
        setCheckingSubAccount(false);
        return;
      }

      try {
        setCheckingSubAccount(true);
        setSubAccountError(null);
        let idSub: string | undefined;
        // Primeiro tenta local
        try {
          const localResp = await subcontasService.getMine();
          const local = (localResp && localResp.subconta) || null;
          idSub = local ? (local.lytexId || local._id) : undefined;
        } catch {}
        if (!idSub) {
          const data = await carteiraService.getSubAccount();
          idSub = (data as any)?.subAccountId || (data as any)?._id || (data as any)?.id;
        }
        if (idSub) {
          setHasSubAccount(true);
          if (idSub && !(usuario as any)?.lytexSubAccountId) {
            updateUsuario({ lytexSubAccountId: idSub });
          }
        }
      } catch (e: any) {
        // Se não encontrar, apenas segue o fluxo para permitir criação
        const message =
          e?.response?.data?.message || e?.message || 'Erro ao verificar subconta';
        if (e?.response?.status !== 404) {
          console.warn('[Carteira] Erro ao verificar subconta:', message);
        }
      } finally {
        setCheckingSubAccount(false);
      }
    };

    verificarSubconta();
  }, [usuario?.lytexSubAccountId, updateUsuario]);

  useEffect(() => {
    if (hasSubAccount) {
      fetchWallet();
      fetchRecentTransactions();
      fetchLytexTransactions(1);
      fetchBankAccounts();
    }
  }, [hasSubAccount, usuario]);

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm mb-1">Saldo Disponível</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">
                {showBalance ? formatCurrency(accountData.balance) : 'R$ ••••••'}
              </h2>
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

        <div className="flex gap-4">
          <button
            onClick={() => setShowModal('withdraw')}
            className="flex-1 bg-white text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Solicitar Saque
          </button>
          <button
            onClick={() => navigate('/carteira/banco')}
            className="flex-1 bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Adicionar Banco
          </button>
        </div>
        {walletError && (
          <div className="mt-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg p-2">
            {walletError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-yellow-800 text-sm mb-1">Saldo Pendente</p>
              <p className="text-2xl font-bold text-yellow-900">
                {formatCurrency(accountData.pendingBalance)}
              </p>
            </div>
            <TrendingUp size={32} className="text-yellow-600" />
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Valores aguardando confirmação de pagamento
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-orange-800 text-sm mb-1">Saldo Bloqueado</p>
              <p className="text-xl font-bold text-orange-900">
                {formatCurrency(accountData.blockedBalance)}
              </p>
              <p className="text-xs text-orange-700 mt-2">
                Taxas futuras: {formatCurrency(accountData.futureTaxes)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Transações Recentes</h3>
        {transactionsLoading && (
          <p className="text-sm text-gray-500">Carregando transações...</p>
        )}
        {transactionsError && !transactionsLoading && (
          <p className="text-sm text-red-600">{transactionsError}</p>
        )}
        {!transactionsLoading &&
          !transactionsError &&
          recentTransactions.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhuma transação recente encontrada.
            </p>
          )}
        {!transactionsLoading &&
          !transactionsError &&
          recentTransactions.length > 0 && (
            <div className="space-y-4">
              {Array.from(
                recentTransactions.reduce(
                  (map, t) => {
                    const key = t.caixaId;
                    const grupo =
                      map.get(key) ||
                      {
                        caixaId: t.caixaId,
                        caixaNome: t.caixaNome,
                        caixaAdminNome: t.caixaAdminNome,
                        transacoes: [] as TransacaoRecenteCarteira[],
                      };
                    grupo.transacoes.push(t);
                    map.set(key, grupo);
                    return map;
                  },
                  new Map<
                    string,
                    {
                      caixaId: string;
                      caixaNome: string;
                      caixaAdminNome: string;
                      transacoes: TransacaoRecenteCarteira[];
                    }
                  >(),
                ).values(),
              )
                .sort((a, b) => {
                  const dataA =
                    a.transacoes[0]?.dataPagamento ||
                    new Date(0).toISOString();
                  const dataB =
                    b.transacoes[0]?.dataPagamento ||
                    new Date(0).toISOString();
                  return (
                    new Date(dataB).getTime() - new Date(dataA).getTime()
                  );
                })
                .map((grupo) => (
                  <div key={grupo.caixaId} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {grupo.caixaNome}
                        </p>
                        {grupo.caixaAdminNome && (
                          <p className="text-xs text-gray-500">
                            Organizado por {grupo.caixaAdminNome}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Agrupamento por Participante dentro do Caixa */}
                    {Array.from(
                      grupo.transacoes.reduce((mapPart, t) => {
                        const key = t.participanteNome;
                        const list = mapPart.get(key) || [];
                        list.push(t);
                        mapPart.set(key, list);
                        return mapPart;
                      }, new Map<string, TransacaoRecenteCarteira[]>()).entries()
                    ).map(([participanteNome, transacoesParticipante], idxPart) => {
                      // Ordenar por semana/mês
                      const sortedTransacoes = transacoesParticipante.sort((a, b) => {
                        const mesA = a.mesReferencia || 0;
                        const mesB = b.mesReferencia || 0;
                        return mesA - mesB;
                      });

                      // Cor de fundo alternada por participante
                      const hash = participanteNome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const bgColor = hash % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                      return (
                        <div key={participanteNome} className={`rounded-xl border border-gray-200 overflow-hidden ${bgColor}`}>
                          <div className="px-4 py-2 bg-opacity-50 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-medium text-gray-700">{participanteNome}</span>
                            <span className="text-xs text-gray-500">{sortedTransacoes.length} pagamentos</span>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {sortedTransacoes.map((t) => (
                              <div
                                key={t.id}
                                className="p-4 hover:bg-black hover:bg-opacity-5 transition-colors"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-500">
                                      {formatDate(t.dataPagamento)} •{' '}
                                      {t.status === 'em_dia'
                                        ? 'Pago em dia'
                                        : 'Pago em atraso'}
                                      {typeof t.mesReferencia === 'number' &&
                                      t.mesReferencia > 0
                                        ? ` • ${t.mesReferencia}ª ${
                                            t.tipoCaixa === 'semanal'
                                              ? 'semana'
                                              : 'mês'
                                          }`
                                        : ''}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`font-bold ${
                                        t.tipo === 'entrada'
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      {t.tipo === 'entrada' ? '+' : '-'}{' '}
                                      {formatCurrency(t.valorPago)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          )}
      </div>
      <div className="mt-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          Transações da Carteira (Lytex)
        </h3>
        {lytexTransactionsLoading && (
          <p className="text-sm text-gray-500">
            Carregando transações da carteira...
          </p>
        )}
        {lytexTransactionsError && !lytexTransactionsLoading && (
          <p className="text-sm text-red-600">{lytexTransactionsError}</p>
        )}
        {!lytexTransactionsLoading &&
          !lytexTransactionsError &&
          lytexTransactions.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhuma transação de saque ou split encontrada.
            </p>
          )}
        {!lytexTransactionsLoading &&
          !lytexTransactionsError &&
          lytexTransactions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">
                      Data
                    </th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">
                      Descrição
                    </th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">
                      Valor
                    </th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lytexTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-gray-700">
                        {t.createdAt ? formatDate(t.createdAt) : '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-700 capitalize">
                        {t.type || '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {t.description || '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">
                        {formatCurrency(t.amount || 0)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {t.status || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50">
                <button
                  disabled={lytexPage <= 1 || lytexTransactionsLoading}
                  onClick={() =>
                    lytexPage > 1 && fetchLytexTransactions(lytexPage - 1)
                  }
                  className="text-xs text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-500">
                  Página {lytexPage}
                </span>
                <button
                  disabled={!lytexHasMore || lytexTransactionsLoading}
                  onClick={() =>
                    lytexHasMore && fetchLytexTransactions(lytexPage + 1)
                  }
                  className="text-xs text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );

  const AccountTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Conta Ativa</h3>
            <p className="text-sm text-gray-600">Sua conta está funcionando normalmente</p>
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

        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between">
            <span className="text-gray-600">Nome Completo</span>
            <span className="font-medium text-gray-800">{accountData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CPF</span>
            <span className="font-medium text-gray-800">{accountData.cpf}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">E-mail</span>
            <span className="font-medium text-gray-800">{accountData.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {accountData.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Conta criada em</span>
            <span className="font-medium text-gray-800">{accountData.createdAt}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Informações Importantes</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Saques processados em até 1 dia útil</li>
          <li>• Sem taxa para transferências acima de R$ 100</li>
          <li>• Suporte disponível de segunda a sexta, 9h às 18h</li>
        </ul>
      </div>
    </div>
  );

  const BanksTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Minhas Contas Bancárias</h3>
        <button
          onClick={() => navigate('/carteira/banco')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Adicionar Conta
        </button>
      </div>

      <div className="space-y-3">
        {bankAccounts.map((bank) => (
          <div
            key={bank._id || `${bank.bankCode}-${bank.agency}-${bank.account}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="text-blue-600" size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {bank.bankName}
                  </h4>
                  <p className="text-sm text-gray-600">Código: {bank.bankCode}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">Agência:</span> {bank.agency}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">
                        Conta {bank.accountType}:
                      </span>{' '}
                      {bank.account}
                    </p>
                  </div>
                </div>
              </div>
              {bank.isDefault && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Principal
                </span>
              )}
            </div>
            {!bank.isDefault && (
              <button className="mt-3 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                Tornar Principal
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const WithdrawModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Solicitar Saque</h3>
          <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Saque
            </label>
            <input
              type="text"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Disponível: {formatCurrency(accountData.balance)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conta para Recebimento
            </label>
            <div className="space-y-2">
              {bankAccounts.map((bank) => {
                const id =
                  bank._id || `${bank.bankCode}-${bank.agency}-${bank.account}`;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedBank(id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedBank === id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">
                          {bank.bankName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ag: {bank.agency} | Conta: {bank.account}
                        </p>
                      </div>
                      {selectedBank === id && (
                        <Check className="text-blue-600" size={20} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> O saque será processado em até 1 dia útil. Taxa de R$ 3,50 para valores abaixo de R$ 100.
            </p>
          </div>

          <button
            onClick={() => {
              alert('Saque solicitado com sucesso!');
              setShowModal(null);
              setWithdrawAmount('');
              setSelectedBank(null);
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Confirmar Saque
          </button>
        </div>
      </div>
    </div>
  );

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
                    <svg className={`w-4 h-4 text-gray-400 ${bankDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.168l3.71-2.94a.75.75 0 0 1 .94 1.17l-4.25 3.37a.75.75 0 0 1-.94 0l-4.25-3.37a.75.75 0 0 1-.02-1.06Z"/></svg>
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
                    <button type="button" onClick={() => setBankAccountType('corrente')} className={`px-3 py-2 rounded-lg border ${bankAccountType==='corrente'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-300 text-gray-700'}`}>Conta Corrente</button>
                    <button type="button" onClick={() => setBankAccountType('poupanca')} className={`px-3 py-2 rounded-lg border ${bankAccountType==='poupanca'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-300 text-gray-700'}`}>Conta Poupança</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input type="text" value={bankAgency} onChange={(e)=>setBankAgency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dígito</label>
                  <input type="text" value={bankAgencyDv} onChange={(e)=>setBankAgencyDv(e.target.value)} maxLength={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                  <input type="text" value={bankAccount} onChange={(e)=>setBankAccount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dígito da conta</label>
                  <input type="text" value={bankAccountDv} onChange={(e)=>setBankAccountDv(e.target.value)} maxLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center" />
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
                      } catch {}
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
        <div className="max-w-4xl mx-auto px-4 py-4">
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
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'account'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Dados da Conta
            </button>
            <button
              onClick={() => setActiveTab('banks')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'banks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Contas Bancárias
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'banks' && <BanksTab />}
      </div>

      {showModal === 'withdraw' && <WithdrawModal />}
    </div>
  );
};

export default WalletDashboard;
