import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';
import { caixasService, bancosService, participantesService, splitConfigService, subcontasService } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { useCaixaConfiguracao } from '../hooks/useCaixaConfiguracao';

type LytexAccount = {
  subrecipientId?: string;
  owner?: { name?: string; cpfCnpj?: string };
  bank?: { code?: string; name?: string };
  agency?: { number?: string; dv?: string };
  account?: { type?: string; number?: string; dv?: string };
};

type ExistingSplitConfig = {
  taxaServicoSubId?: string;
  fundoReservaSubId?: string;
  adminSubId?: string;
  participantesMesOrdem?: string[];
};

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const toStringSafe = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v === null || v === undefined ? fallback : String(v);

const toNumberSafe = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const getErrorMessage = (e: unknown, fallback: string): string => {
  const rec = asRecord(e);
  const msg = rec.message;
  return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
};

const getFirstLytexAccount = (resp: unknown): LytexAccount | null => {
  const rec = asRecord(resp);
  const accounts = rec.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  const acc = asRecord(accounts[0]);
  return {
    subrecipientId: toStringSafe(acc.subrecipientId),
    owner: acc.owner ? asRecord(acc.owner) as any : undefined,
    bank: acc.bank ? asRecord(acc.bank) as any : undefined,
    agency: acc.agency ? asRecord(acc.agency) as any : undefined,
    account: acc.account ? asRecord(acc.account) as any : undefined,
  };
};

interface CaixaItem {
  _id: string;
  nome: string;
  tipo?: 'mensal' | 'semanal';
  valorTotal: number;
  valorParcela?: number;
  taxaServico?: number;
  qtdParticipantes: number;
  duracaoMeses: number;
  diaVencimento?: number;
  dataInicio?: string;
  status?: string;
  adminId?: string;
}

interface ParticipanteOrdem {
  id: string;
  nome: string;
  subcontaId?: string;
  usuarioId?: any;
  clientId?: string;
  clientSecret?: string;
}

// Estado para credenciais de cada participante
interface CredentialsMap {
  [usuarioId: string]: {
    clientId: string;
    clientSecret: string;
    saving?: boolean;
    saved?: boolean;
  };
}

const calcularValorComIPCA = (valorBase: number, meses: number): number => {
  if (meses === 0) return valorBase;
  const taxa = 0.004; // 0.4% ao mês
  return valorBase * Math.pow(1 + taxa, meses);
};

// ID FIXO da empresa principal
const EMPRESA_PRINCIPAL_SUBCONTA_ID = '693881d90b94786c6437a441';

export default function SplitConfig() {
  const navigate = useNavigate();
  const [caixas, setCaixas] = useState<CaixaItem[]>([]);
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [adminSubId, setAdminSubId] = useState<string>('');
  const [pjPrincipalInfo, setPjPrincipalInfo] = useState<LytexAccount | null>(null);
  const [adminInfo, setAdminInfo] = useState<LytexAccount | null>(null);
  const [participantesOrdem, setParticipantesOrdem] = useState<ParticipanteOrdem[]>([]);
  const [existingConfig, setExistingConfig] = useState<ExistingSplitConfig | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [credentials, setCredentials] = useState<CredentialsMap>({});
  const [savingCredentials, setSavingCredentials] = useState<{ [key: string]: boolean }>({});

  const selectedCaixa = useMemo(() => caixas.find((c) => c._id === selectedCaixaId), [caixas, selectedCaixaId]);

  // Hook para verificar subcontas dos participantes
  const {
    participantesSubcontasStatus,
    loading: loadingSubcontas,
  } = useCaixaConfiguracao(
    selectedCaixaId,
    participantesOrdem.map(p => ({
      _id: p.id,
      usuarioId: p.usuarioId || p.id
    })),
    selectedCaixa?.adminId || ''
  );

  useEffect(() => {
    const loadCaixas = async () => {
      try {
        const resp = await caixasService.getAll();
        const respRec = asRecord(resp);
        const list = Array.isArray(resp) ? resp : Array.isArray(respRec.caixas) ? respRec.caixas : [];
        const normalized = (list || [])
          .filter((c) => {
            const rec = asRecord(c);
            return Boolean(rec._id);
          })
          .map((c) => {
            const rec = asRecord(c);
            return {
              _id: toStringSafe(rec._id),
              nome: toStringSafe(rec.nome),
              tipo: rec.tipo === 'semanal' ? 'semanal' : 'mensal',
              valorTotal: toNumberSafe(rec.valorTotal, 0),
              valorParcela: toNumberSafe(rec.valorParcela, 0) || undefined,
              taxaServico: toNumberSafe(rec.taxaServico, 0) || undefined,
              qtdParticipantes: toNumberSafe(rec.qtdParticipantes, 0),
              duracaoMeses: toNumberSafe(rec.duracaoMeses, 0),
              diaVencimento:
                typeof rec.diaVencimento === 'number'
                  ? rec.diaVencimento
                  : undefined,
              dataInicio:
                typeof rec.dataInicio === 'string'
                  ? rec.dataInicio
                  : typeof rec.createdAt === 'string'
                    ? rec.createdAt
                    : undefined,
              status: toStringSafe(rec.status),
              adminId: toStringSafe(rec.adminId || rec.criadorId),
            } satisfies CaixaItem;
          })
          .filter((c: CaixaItem) => {
            const status = c.status?.toLowerCase();
            return status === 'ativo' || status === 'completo' || status === 'pausado' || status === 'aguardando';
          });
        setCaixas(normalized);
        if (normalized.length) {
          setSelectedCaixaId(normalized[0]._id);
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e, 'Erro ao carregar caixas'));
      }
    };
    loadCaixas();
  }, []);

  useEffect(() => {
    const fetchPrincipalAccount = async () => {
      try {
        const resp = await bancosService.getAccounts();
        const account = getFirstLytexAccount(resp);
        setPjPrincipalInfo(account);
      } catch {
        void 0;
      }
    };
    fetchPrincipalAccount();
  }, []);

  useEffect(() => {
    if (selectedCaixaId) {
      setShowTable(false); // Reset table visibility
      (async () => {
        try {
          const cfg = await splitConfigService.getByCaixa(selectedCaixaId);
          const cfgRec = asRecord(cfg);
          const rawConfig = cfgRec.config && typeof cfgRec.config === 'object' ? asRecord(cfgRec.config) : null;
          const data: ExistingSplitConfig | null = rawConfig
            ? {
              taxaServicoSubId: toStringSafe(rawConfig.taxaServicoSubId),
              fundoReservaSubId: toStringSafe(rawConfig.fundoReservaSubId),
              adminSubId: toStringSafe(rawConfig.adminSubId),
              participantesMesOrdem: Array.isArray(rawConfig.participantesMesOrdem)
                ? rawConfig.participantesMesOrdem.map((v) => toStringSafe(v))
                : [],
            }
            : null;
          setExistingConfig(data);
          if (data) {
            setAdminSubId(data.adminSubId || '');
            setShowTable(true); // Show table if config exists
          }
        } catch {
          void 0;
        }
        try {
          const resp = await participantesService.getByCaixa(selectedCaixaId);
          const respRec = asRecord(resp);
          const list = Array.isArray(resp)
            ? resp
            : Array.isArray(respRec.participantes)
              ? respRec.participantes
              : [];
          const ordered = (list || [])
            .map((p) => {
              const pRec = asRecord(p);
              const usuarioId = asRecord(pRec.usuarioId);
              return {
                id: toStringSafe(pRec._id),
                nome: toStringSafe(usuarioId.nome || pRec.nome),
                posicao: toNumberSafe(pRec.posicao, 0),
                subcontaId: toStringSafe(pRec.subcontaId || usuarioId.subcontaId, ''),
                usuarioId: pRec.usuarioId,
              };
            })
            .filter((p: { id: string }) => p.id)
            .sort(
              (
                a: { posicao: number },
                b: { posicao: number },
              ) => (a.posicao || 0) - (b.posicao || 0),
            );
          setParticipantesOrdem(ordered as ParticipanteOrdem[]);
        } catch {
          void 0;
        }
      })();
    }
  }, [selectedCaixaId]);

  const handleFetchAdminInfo = async (id: string) => {
    try {
      setConfigError(null);
      const resp = await bancosService.getAccounts(id);
      setAdminInfo(getFirstLytexAccount(resp));
    } catch (e: unknown) {
      setConfigError(getErrorMessage(e, 'Erro ao carregar subconta do administrador'));
      setAdminInfo(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedCaixaId) return;
    try {
      setSaving(true);
      setConfigError(null);
      setConfigSuccess(false);

      const payload = {
        taxaServicoSubId: EMPRESA_PRINCIPAL_SUBCONTA_ID,
        fundoReservaSubId: EMPRESA_PRINCIPAL_SUBCONTA_ID,
        adminSubId: adminSubId || undefined,
        participantesMesOrdem: participantesOrdem.map((p) => p.id),
      };

      const resp = await splitConfigService.saveForCaixa(selectedCaixaId, payload);
      const respRec = asRecord(resp);
      const rawSaved =
        respRec.config && typeof respRec.config === 'object'
          ? asRecord(respRec.config)
          : null;
      setExistingConfig(
        rawSaved
          ? {
            taxaServicoSubId: toStringSafe(rawSaved.taxaServicoSubId),
            fundoReservaSubId: toStringSafe(rawSaved.fundoReservaSubId),
            adminSubId: toStringSafe(rawSaved.adminSubId),
            participantesMesOrdem: Array.isArray(rawSaved.participantesMesOrdem)
              ? rawSaved.participantesMesOrdem.map((v) => toStringSafe(v))
              : [],
          }
          : payload,
      );

      setConfigSuccess(true);
      setShowTable(true); // Show table after successful save
      setTimeout(() => setConfigSuccess(false), 3000);

      if ((resp as any)?.config?.adminSubId) {
        try {
          const r = await bancosService.getAccounts((resp as any).config.adminSubId);
          setAdminInfo(getFirstLytexAccount(r));
        } catch {
          void 0;
        }
      }
    } catch (e: unknown) {
      setConfigError(getErrorMessage(e, 'Erro ao salvar configuração de split'));
    } finally {
      setSaving(false);
    }
  };

  const calcularDataPrevista = (index: number): string => {
    if (!selectedCaixa?.dataInicio) return '—';

    const start = new Date(selectedCaixa.dataInicio);
    const d = new Date(start);

    if (selectedCaixa.tipo === 'semanal') {
      d.setDate(d.getDate() + (index * 7));
    } else {
      d.setMonth(d.getMonth() + index);
      if (selectedCaixa.diaVencimento) {
        d.setDate(selectedCaixa.diaVencimento);
      }
    }

    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getParticipanteStatus = (participanteId: string) => {
    const status = participantesSubcontasStatus.find(p => p._id === participanteId);
    console.log('🔍 Buscando status para:', participanteId);
    console.log('🔍 Status encontrado:', status);
    console.log('🔍 Lista completa:', participantesSubcontasStatus);
    return status;
  };

  const comSubconta = participantesSubcontasStatus.filter(p => p.temSubconta).length;

  // Handler para atualizar credenciais no estado local
  const handleCredentialChange = (usuarioId: string, field: 'clientId' | 'clientSecret', value: string) => {
    setCredentials(prev => ({
      ...prev,
      [usuarioId]: {
        ...prev[usuarioId],
        [field]: value,
        saved: false,
      }
    }));
  };

  // Salvar credenciais no backend via onBlur
  const handleSaveCredentials = async (usuarioId: string) => {
    const creds = credentials[usuarioId];
    if (!creds || (!creds.clientId && !creds.clientSecret)) return;

    try {
      setSavingCredentials(prev => ({ ...prev, [usuarioId]: true }));
      console.log(`💾 Salvando credenciais para usuário ${usuarioId}:`, {
        clientId: creds.clientId ? '***' : 'N/A',
        clientSecret: creds.clientSecret ? '***' : 'N/A',
        nomeCaixa: selectedCaixa?.nome,
      });

      await subcontasService.updateCredentials(usuarioId, {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        nomeCaixa: selectedCaixa?.nome,
      });

      setCredentials(prev => ({
        ...prev,
        [usuarioId]: {
          ...prev[usuarioId],
          saved: true,
        }
      }));

      console.log(`✅ Credenciais salvas para ${usuarioId}`);
    } catch (error: any) {
      console.error(`❌ Erro ao salvar credenciais para ${usuarioId}:`, error);
      setConfigError(`Erro ao salvar credenciais: ${error.message}`);
    } finally {
      setSavingCredentials(prev => ({ ...prev, [usuarioId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Configuração de Split</h1>
            <p className="text-base text-gray-600">Configure os recebedores e ordem de contemplação</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
        </div>

        {/* Banner de Sucesso */}
        {configSuccess && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-center gap-3">
            <Check className="text-green-600" size={24} />
            <span className="text-green-800 font-medium">Configuração salva com sucesso!</span>
          </div>
        )}

        {/* Banner de Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Seleção de Caixa */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Selecione o Caixa
          </label>
          <select
            value={selectedCaixaId}
            onChange={(e) => setSelectedCaixaId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {caixas.map(c => (
              <option key={c._id} value={c._id}>
                {c.nome} - {formatCurrency(c.valorTotal)} ({c.tipo})
              </option>
            ))}
          </select>
        </div>

        {/* Empresa Principal */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-4 border-2 border-blue-500 relative">
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold uppercase rounded-full">
              Principal
            </span>
          </div>

          <p className="text-xs font-bold uppercase text-gray-600 mb-2">
            EMPRESA RESPONSÁVEL PELA TAXA DE SERVIÇO E FUNDO DE RESERVA
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {pjPrincipalInfo?.owner?.name || 'ISS SOFTWARE QUALITY SOLUTIONS (CAIXA JUNTO)'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              CNPJ: {pjPrincipalInfo?.owner?.cpfCnpj || '39997807000186'}
            </p>

            {pjPrincipalInfo && (
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Banco:</span> {pjPrincipalInfo.bank?.code} - {pjPrincipalInfo.bank?.name}
                </p>
                <p>
                  <span className="font-medium">Agência:</span> {pjPrincipalInfo.agency?.number}-{pjPrincipalInfo.agency?.dv}
                </p>
                <p>
                  <span className="font-medium">Conta:</span> {pjPrincipalInfo.account?.type} {pjPrincipalInfo.account?.number}-{pjPrincipalInfo.account?.dv}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Administrador */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Administrador/Gestor do Caixa
          </h3>

          {configError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={18} />
              <span className="text-sm text-red-800">{configError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID da Subconta
              </label>
              <input
                type="text"
                placeholder="Digite o ID da subconta (subrecipientId)"
                value={adminSubId}
                onChange={(e) => setAdminSubId(e.target.value)}
                onBlur={() => adminSubId && handleFetchAdminInfo(adminSubId)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
            </div>

            {adminInfo && (
              <div className="bg-white rounded-lg p-4 border-2 border-green-500 relative">
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold uppercase rounded-full">
                    Administrador
                  </span>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">
                    {adminInfo.owner?.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    CPF/CNPJ: {adminInfo.owner?.cpfCnpj}
                  </p>

                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Banco:</span> {adminInfo.bank?.code} - {adminInfo.bank?.name}
                    </p>
                    <p>
                      <span className="font-medium">Agência:</span> {adminInfo.agency?.number}-{adminInfo.agency?.dv}
                    </p>
                    <p>
                      <span className="font-medium">Conta:</span> {adminInfo.account?.type} {adminInfo.account?.number}-{adminInfo.account?.dv}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="mb-6">
          <button
            onClick={handleSaveConfig}
            disabled={saving || !selectedCaixaId}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-white transition-colors text-sm ${saving || !selectedCaixaId
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>

        {/* Tabela de Contemplação - SOMENTE após salvar */}
        {showTable && existingConfig && participantesOrdem.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="w-1 h-5 bg-white rounded-full" />
                Ordem de Contemplação e Cronograma
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Posição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Participante
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Status Subconta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Client ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Client Secret
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Data Prevista
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">
                      Valor a Receber
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participantesOrdem.map((p, idx) => {
                    const valorBase = selectedCaixa?.valorTotal || 0;
                    const valorComCorrecao = calcularValorComIPCA(valorBase, idx);
                    const percentualIPCA = idx === 0 ? 0 : ((valorComCorrecao / valorBase - 1) * 100);
                    const status = getParticipanteStatus(p.id);

                    // Extrair usuarioId correto
                    const usuarioIdReal = typeof p.usuarioId === 'object' && p.usuarioId?._id
                      ? p.usuarioId._id
                      : p.id;
                    const statusByUsuarioId = getParticipanteStatus(usuarioIdReal);
                    const finalStatus = status || statusByUsuarioId;

                    console.log('🔍 Linha da tabela:', {
                      nome: p.nome,
                      participanteId: p.id,
                      usuarioIdReal,
                      status: finalStatus,
                      temSubconta: finalStatus?.temSubconta
                    });

                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900 text-sm">{p.nome}</span>
                        </td>
                        <td className="px-4 py-3">
                          {loadingSubcontas ? (
                            <span className="text-xs text-gray-500">Verificando...</span>
                          ) : finalStatus?.temSubconta ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              <CheckCircle size={14} />
                              Com subconta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                              <XCircle size={14} />
                              Sem subconta
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Client ID"
                              value={credentials[usuarioIdReal]?.clientId || p.clientId || ''}
                              onChange={(e) => handleCredentialChange(usuarioIdReal, 'clientId', e.target.value)}
                              onBlur={() => handleSaveCredentials(usuarioIdReal)}
                              disabled={!finalStatus?.temSubconta}
                              className={`w-full px-2 py-1 text-xs border rounded ${!finalStatus?.temSubconta
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : credentials[usuarioIdReal]?.saved
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                }`}
                            />
                            {savingCredentials[usuarioIdReal] && (
                              <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                            )}
                            {credentials[usuarioIdReal]?.saved && !savingCredentials[usuarioIdReal] && (
                              <CheckCircle size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <input
                              type="password"
                              placeholder="Client Secret"
                              value={credentials[usuarioIdReal]?.clientSecret || p.clientSecret || ''}
                              onChange={(e) => handleCredentialChange(usuarioIdReal, 'clientSecret', e.target.value)}
                              onBlur={() => handleSaveCredentials(usuarioIdReal)}
                              disabled={!finalStatus?.temSubconta}
                              className={`w-full px-2 py-1 text-xs border rounded ${!finalStatus?.temSubconta
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : credentials[usuarioIdReal]?.saved
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                }`}
                            />
                            {savingCredentials[usuarioIdReal] && (
                              <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                            )}
                            {credentials[usuarioIdReal]?.saved && !savingCredentials[usuarioIdReal] && (
                              <CheckCircle size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-sm">
                          {calcularDataPrevista(idx)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-base text-gray-900">
                            {formatCurrency(valorComCorrecao)}
                          </div>
                          {idx > 0 && (
                            <div className="text-xs text-green-600 font-medium">
                              +{percentualIPCA.toFixed(2)}% IPCA
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cards de Resumo - SOMENTE após salvar */}
        {showTable && existingConfig && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-4">
              <p className="text-xs font-bold uppercase text-blue-700 mb-1">
                Total de Participantes
              </p>
              <p className="text-3xl font-bold text-blue-900">
                {participantesOrdem.length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-500 rounded-lg p-4">
              <p className="text-xs font-bold uppercase text-purple-700 mb-1">
                Valor Base do Caixa
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {formatCurrency(selectedCaixa?.valorTotal || 0)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-lg p-4">
              <p className="text-xs font-bold uppercase text-green-700 mb-1">
                Com Subconta Ativa
              </p>
              <p className="text-3xl font-bold text-green-900">
                {comSubconta}/{participantesOrdem.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}