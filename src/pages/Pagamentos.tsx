import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Eye,
  Wallet,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Phone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { pagamentosService, caixasService, participantesService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { formatCurrency, formatDate, cn } from '../lib/utils';

// Taxas
const TAXA_SERVICO = 10.00;
const TAXA_IPCA_MENSAL = 0.0041;
type StatusBoletoNormalizado = 'pago' | 'pendente' | 'atrasado' | 'enviado';

interface ParticipanteCaixa {
  _id?: string;
  usuarioId?:
  | {
    _id?: string;
    nome?: string;
    telefone?: string;
    fotoUrl?: string;
  }
  | string;
  posicao?: number;
}

interface CaixaApi {
  _id: string;
  nome: string;
  valorTotal?: number;
  valorParcela: number;
  duracaoMeses: number;
  mesAtual?: number;
  qtdParticipantes?: number;
  tipo?: 'mensal' | 'semanal';
  status?: string;
  dataInicio?: string;
  diaVencimento?: number;
  adminId?:
  | {
    _id?: string;
    nome?: string;
    email?: string;
  }
  | string;
}

interface PagamentoApi {
  _id: string;
  caixaId?: string;
  pagadorId?:
  | {
    _id?: string;
    nome?: string;
    fotoUrl?: string;
  }
  | string;
  participanteNome?: string;
  mesReferencia: number;
  valorParcela?: number;
  taxaServico?: number;
  valorTaxa?: number | string;
  dataVencimento: string;
  status: string;
  comprovanteUrl?: string;
  dataPagamento?: string;
  diasAtraso?: number | string;
  observacao?: string;
  recebedorId?: string | { _id?: string };
}

interface Boleto {
  _id: string;
  caixaId: string;
  caixaNome: string;
  participanteId: string;
  participanteNome: string;
  participanteFoto?: string;
  mes: number;
  valorParcela: number;
  taxaServico: number;
  fundoReserva: number;
  taxaAdmin: number;
  comissaoAdmin: number;
  correcaoIPCA: number;
  valorTotal: number;
  dataVencimento: string;
  status: StatusBoletoNormalizado;
  comprovanteUrl?: string;
  dataPagamento?: string;
  diasAtraso: number;
  observacao?: string;
  pagadorId?: string;
  recebedorId?: string;
}

interface CaixaComBoletos {
  _id: string;
  nome: string;
  valorTotal?: number;
  valorParcela: number;
  duracaoMeses: number;
  mesAtual: number;
  boletos: Boleto[];
  expanded: boolean;
  participantes?: ParticipanteCaixa[];
  qtdParticipantes?: number;
  tipo?: 'mensal' | 'semanal';
  dataInicio?: string;
  diaVencimento?: number;
  adminNome?: string;
}

export function Pagamentos() {
  const { usuario } = useAuth();
  const location = useLocation();
  const [caixasComBoletos, setCaixasComBoletos] = useState<CaixaComBoletos[]>([]);
  const [, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [showDetalheModal, setShowDetalheModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recebimentos' | 'splits' | 'carteira'>(location.pathname === '/carteira' ? 'carteira' : 'recebimentos');
  const [periodFilter, setPeriodFilter] = useState<'mes_atual' | 'todos'>('mes_atual');
  const [splitStatusFilter, setSplitStatusFilter] = useState('');
  const [splitsPagos, setSplitsPagos] = useState<Record<string, boolean>>({});
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSplitBoleto, setSelectedSplitBoleto] = useState<Boleto | null>(null);
  const [observacaoModalAberto, setObservacaoModalAberto] = useState(false);
  const [observacaoAtual, setObservacaoAtual] = useState('');
  const [boletoParaObservacao, setBoletoParaObservacao] = useState<Boleto | null>(null);
  const [uploadingComprovanteId, setUploadingComprovanteId] = useState<string | null>(null);
  const [filtroPeriodoPorCaixa, setFiltroPeriodoPorCaixa] =
    useState<Record<string, 'geral' | number>>({});

  const enviarComprovanteLocal = (boletoId: string, url: string) => {
    setCaixasComBoletos((prev) =>
      prev.map((caixa) => ({
        ...caixa,
        boletos: caixa.boletos.map((b) => {
          if (b._id !== boletoId) return b;
          const manterPago = b.status === 'pago';
          return {
            ...b,
            status: manterPago ? 'pago' : 'enviado',
            comprovanteUrl: url,
          };
        }),
      })),
    );

    setSelectedBoleto((prev) => {
      if (!prev || prev._id !== boletoId) return prev;
      const manterPago = prev.status === 'pago';
      return {
        ...prev,
        status: manterPago ? 'pago' : 'enviado',
        comprovanteUrl: url,
      };
    });

    setSelectedSplitBoleto((prev) => {
      if (!prev || prev._id !== boletoId) return prev;
      const manterPago = prev.status === 'pago';
      return {
        ...prev,
        status: manterPago ? 'pago' : 'enviado',
        comprovanteUrl: url,
      };
    });
  };

  useEffect(() => {
    loadPagamentos();
  }, [usuario]);

  const normalizarStatus = (
    statusApi: string,
    diasAtraso?: number,
    dataPagamento?: string,
  ): StatusBoletoNormalizado => {
    const s = String(statusApi || '').toLowerCase();
    if (['aprovado', 'pago', 'paid', 'liquidated', 'settled', 'pago_gateway'].includes(s)) {
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

  const loadPagamentos = async () => {
    try {
      setLoading(true);
      if (!usuario?._id) {
        setCaixasComBoletos([]);
        return;
      }

      const caixasResponse =
        usuario.tipo === 'master'
          ? await caixasService.getAll()
          : await caixasService.getByAdmin(usuario._id);
      const caixasRaw = Array.isArray(caixasResponse)
        ? caixasResponse
        : caixasResponse.caixas || [];

      const caixas: CaixaApi[] = caixasRaw;

      const caixasAtivos = caixas.filter((c) => {
        const status = String(c.status || '').toLowerCase();
        return status === 'ativo';
      });

      const caixasProcessados: CaixaComBoletos[] = [];

      for (const caixa of caixasAtivos) {
        try {
          const admin = caixa.adminId;
          const adminNome =
            typeof admin === 'string' ? '' : admin?.nome || '';

          const pagamentosResp = await pagamentosService.getAll({
            caixaId: caixa._id,
            limit: 1000,
            page: 1,
          });

          const pagamentos = Array.isArray(pagamentosResp)
            ? pagamentosResp
            : pagamentosResp.pagamentos || [];

          const participantesResp = await participantesService.getByCaixa(
            caixa._id,
          );

          const boletos: Boleto[] = (pagamentos as PagamentoApi[]).map((p) => {
            const dias =
              typeof p.diasAtraso === 'number'
                ? p.diasAtraso
                : p.diasAtraso
                  ? Number(p.diasAtraso)
                  : 0;

            const statusNormalizado = normalizarStatus(
              p.status,
              dias,
              p.dataPagamento as any,
            );

            const parcelaIndex = p.mesReferencia;
            const valorParcelaBase = caixa.valorParcela || p.valorParcela || 0;
            const taxaServico =
              typeof p.taxaServico === 'number' ? p.taxaServico : (caixa as any)?.taxaServico ?? TAXA_SERVICO;
            const correcaoIPCA = parcelaIndex > 1 ? valorParcelaBase * TAXA_IPCA_MENSAL : 0;
            const fundoReserva = parcelaIndex === 1
              ? (valorParcelaBase / (caixa.qtdParticipantes || 1))
              : 0;
            const comissaoAdmin = parcelaIndex === (caixa.duracaoMeses || caixa.qtdParticipantes || 1)
              ? ((caixa.valorTotal ? caixa.valorTotal : valorParcelaBase * (caixa.qtdParticipantes || 1)) * 0.10) / (caixa.qtdParticipantes || 1)
              : 0;
            const valorTotal = valorParcelaBase + taxaServico + correcaoIPCA + fundoReserva + comissaoAdmin;

            const pagador = p.pagadorId;
            const pagadorId =
              typeof pagador === 'string' ? pagador : pagador?._id || '';
            const pagadorNome =
              typeof pagador === 'string' ? undefined : pagador?.nome;
            const pagadorFoto =
              typeof pagador === 'string' ? undefined : pagador?.fotoUrl;

            const recebedor = p.recebedorId;
            const recebedorId =
              typeof recebedor === 'string' ? recebedor : recebedor?._id;

            return {
              _id: p._id,
              caixaId: caixa._id,
              caixaNome: caixa.nome,
              participanteId: pagadorId || '',
              participanteNome:
                pagadorNome || p.participanteNome || 'Participante',
              participanteFoto: pagadorFoto,
              mes: p.mesReferencia,
              valorParcela: valorParcelaBase,
              taxaServico,
              fundoReserva,
              taxaAdmin: 0,
              comissaoAdmin,
              correcaoIPCA,
              valorTotal,
              dataVencimento: p.dataVencimento,
              status: statusNormalizado,
              comprovanteUrl: p.comprovanteUrl,
              dataPagamento: p.dataPagamento,
              diasAtraso: dias,
              observacao: p.observacao,
              pagadorId,
              recebedorId,
            };
          });

          caixasProcessados.push({
            _id: caixa._id,
            nome: caixa.nome,
            valorTotal: (caixa as any)?.valorTotal,
            valorParcela: caixa.valorParcela,
            duracaoMeses: caixa.duracaoMeses,
            mesAtual: caixa.mesAtual || 1,
            boletos,
            expanded: false,
            participantes: participantesResp,
            qtdParticipantes: caixa.qtdParticipantes,
            tipo: caixa.tipo || 'mensal',
            dataInicio: (caixa as any)?.dataInicio,
            diaVencimento: (caixa as any)?.diaVencimento,
            adminNome,
          });
        } catch (innerError) {
          console.error('Erro ao carregar pagamentos do caixa', caixa._id, innerError);
        }
      }

      setCaixasComBoletos(caixasProcessados);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCaixa = (caixaId: string) => {
    setCaixasComBoletos(prev => prev.map(c =>
      c._id === caixaId ? { ...c, expanded: !c.expanded } : c
    ));
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'gray'; label: string }> = {
      pendente: { variant: 'warning', label: 'Aguardando pagamento' },
      enviado: { variant: 'info', label: 'Aguardando' },
      pago: { variant: 'success', label: 'Pago' },
      atrasado: { variant: 'danger', label: 'Atrasado' },
    };
    return config[status] || { variant: 'gray', label: status };
  };

  // Estatísticas gerais
  const allBoletos = caixasComBoletos.flatMap((c) => c.boletos);

  const metricas = (() => {
    let emDia = 0;
    let aguardando = 0;
    let atrasados = 0;

    caixasComBoletos.forEach((c) => {
      const participantes = c.participantes || [];
      participantes.forEach((p) => {
        const usuarioId = typeof p.usuarioId === 'string' ? p.usuarioId : p.usuarioId?._id;
        const boletoMesAtual = c.boletos.find(
          (b) => String(b.pagadorId || b.participanteId) === String(usuarioId || '') && b.mes === c.mesAtual,
        );
        if (!boletoMesAtual) {
          aguardando++;
        } else if (boletoMesAtual.status === 'pago') {
          emDia++;
        } else if (boletoMesAtual.status === 'atrasado') {
          atrasados++;
        } else {
          aguardando++;
        }
      });
    });

    return { emDia, aguardando, atrasados };
  })();

  const totalCaixas = caixasComBoletos.length;



  const totalPagamentosRecebidos = allBoletos
    .filter((b) => b.status === 'pago')
    .reduce((sum, b) => sum + b.valorTotal, 0);

  const caixaSelecionada =
    selectedBoleto &&
    caixasComBoletos.find((c) => c._id === selectedBoleto.caixaId);

  const boletosParticipanteSelecionado =
    selectedBoleto && caixaSelecionada
      ? caixaSelecionada.boletos
        .filter(
          (b) =>
            String(b.pagadorId || b.participanteId) ===
            String(selectedBoleto.pagadorId || selectedBoleto.participanteId),
        )
        .sort((a, b) => a.mes - b.mes)
      : [];

  const calcularDataPrevistaRecebimento = (
    caixa: CaixaComBoletos,
    posicao?: number,
  ): string | null => {
    if (!caixa.dataInicio || !posicao || posicao <= 0) return null;

    const data = new Date(caixa.dataInicio);

    if (caixa.tipo === 'semanal') {
      data.setDate(data.getDate() + (posicao - 1) * 7);
    } else {
      data.setMonth(data.getMonth() + posicao - 1);
      if (caixa.diaVencimento && caixa.diaVencimento > 0) {
        data.setDate(caixa.diaVencimento);
      }
    }

    return data.toISOString();
  };

  const totalParcelasParticipante =
    caixaSelecionada &&
    (caixaSelecionada.duracaoMeses ||
      caixaSelecionada.qtdParticipantes ||
      boletosParticipanteSelecionado.length ||
      1);

  // Splits (10% da parcela, com IPCA a partir da semana > 1)
  const calcularSplitValor = (b: Boleto, caixa: CaixaComBoletos) => {
    const base = caixa.valorTotal || (caixa.valorParcela * (caixa.qtdParticipantes || 1));
    const ipca = (b.mes > 1 ? (base || 0) * TAXA_IPCA_MENSAL : 0);
    return (base || 0) + ipca;
  };

  const splitsDados = (() => {
    const itens: Array<{ id: string; boleto: Boleto; caixa: CaixaComBoletos; valor: number; status: 'pendente' | 'pago'; }> = [];
    caixasComBoletos.forEach((caixa) => {
      const doMes = caixa.boletos.filter((b) => b.mes === caixa.mesAtual);
      doMes.forEach((b) => {
        const id = `${b._id}-split`;
        const status: 'pendente' | 'pago' = splitsPagos[id] ? 'pago' : 'pendente';
        itens.push({ id, boleto: b, caixa, valor: calcularSplitValor(b, caixa), status });
      });
    });
    return itens.filter((s) => (splitStatusFilter ? s.status === splitStatusFilter : true));
  })();

  const splitsPendentes = splitsDados.filter((s) => s.status === 'pendente').length;
  const splitsRealizados = splitsDados.filter((s) => s.status === 'pago').length;
  const totalAReceberSplit = splitsDados.reduce((sum, s) => sum + s.valor, 0);
  const proximoPagamentoSplit = (() => {
    const futuros: Date[] = [];

    splitsDados
      .filter((s) => s.status === 'pendente')
      .forEach((s) => {
        const participanteInfo = s.caixa.participantes?.find((p) => {
          const usuarioId =
            typeof p.usuarioId === 'string'
              ? p.usuarioId
              : p.usuarioId?._id || '';
          const pagador =
            s.boleto.pagadorId || s.boleto.participanteId || '';
          return String(usuarioId) === String(pagador);
        });

        const posicao = participanteInfo?.posicao || 0;
        const isoPrevista = calcularDataPrevistaRecebimento(s.caixa, posicao);
        if (isoPrevista) {
          futuros.push(new Date(isoPrevista));
        } else {
          futuros.push(new Date(s.boleto.dataVencimento));
        }
      });

    if (futuros.length === 0) return null;
    const min = futuros.reduce((acc, d) => (d < acc ? d : acc), futuros[0]);
    return formatDate(min.toISOString());
  })();

  const [splitPagoDetalhes, setSplitPagoDetalhes] = useState<Record<string, { data: string }>>({});
  const marcarSplitPago = (id: string) => {
    setSplitsPagos((prev) => ({ ...prev, [id]: true }));
    setSplitPagoDetalhes((prev) => ({ ...prev, [id]: { data: new Date().toISOString() } }));
    const item = splitsDados.find((s) => s.id === id);
    if (item) {
      setSelectedSplitBoleto(item.boleto);
      setShowSplitModal(true);
    }
  };

  const handleAbrirModalObservacao = (boleto: Boleto) => {
    setBoletoParaObservacao(boleto);
    setObservacaoAtual(
      boleto.observacao || 'Observação: Solicitado comprovante via WhatsApp',
    );
    setObservacaoModalAberto(true);
  };

  const handleSalvarObservacao = async () => {
    if (!boletoParaObservacao || !observacaoAtual.trim()) {
      setObservacaoModalAberto(false);
      return;
    }

    try {
      await pagamentosService.atualizarObservacao(
        boletoParaObservacao._id,
        observacaoAtual.trim(),
      );

      setCaixasComBoletos((prev) =>
        prev.map((caixa) => ({
          ...caixa,
          boletos: caixa.boletos.map((b) =>
            b._id === boletoParaObservacao._id
              ? { ...b, observacao: observacaoAtual.trim() }
              : b,
          ),
        })),
      );
    } catch (error) {
      console.error('Erro ao salvar observação', error);
    } finally {
      setObservacaoModalAberto(false);
    }
  };

  const handleUploadComprovante = async (boleto: Boleto, file: File | null) => {
    if (!file) return;

    try {
      setUploadingComprovanteId(boleto._id);

      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64 = reader.result as string;

        try {
          await pagamentosService.enviarComprovante(boleto._id, base64);
          enviarComprovanteLocal(boleto._id, base64);
        } catch (error) {
          console.error('Erro ao enviar comprovante', error);
        } finally {
          setUploadingComprovanteId(null);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao processar comprovante', error);
      setUploadingComprovanteId(null);
    }
  };

  // Mantido upload apenas via modal de comprovantes

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Tabs (Carteira removida como aba; acessível via rota /carteira) */}
      {location.pathname !== '/carteira' && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('recebimentos')}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium', activeTab === 'recebimentos' ? 'border border-blue-400 text-blue-700 bg-white' : 'bg-white text-gray-700 border border-gray-200')}
          >
            Recebimentos de Participantes
          </button>
          <button
            onClick={() => setActiveTab('splits')}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium', activeTab === 'splits' ? 'border border-blue-400 text-blue-700 bg-white' : 'bg-white text-gray-700 border border-gray-200')}
          >
            Pagamentos de Pontos/Split
          </button>
        </div>
      )}

      {activeTab === 'recebimentos' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="p-4">
              <span className="text-sm text-gray-600">Total de caixas</span>
              <p className="mt-2 text-lg font-bold text-gray-900">
                {totalCaixas}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Em Dia</span>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-green-700">
                {metricas.emDia}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Atrasados</span>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-red-700">
                {metricas.atrasados}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Aguardando pagamento</span>
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <p className="mt-2 text-lg font-bold text-blue-700">
                {metricas.aguardando}
              </p>
            </Card>
            <Card className="p-4">
              <span className="text-sm text-gray-600">Total Pagamentos</span>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {formatCurrency(totalPagamentosRecebidos)}
              </p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar participante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="enviado">Aguardando</option>
              <option value="pago">Pagos</option>
              <option value="atrasado">Atrasados</option>
            </select>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as 'mes_atual' | 'todos')}
            >
              <option value="mes_atual">Mês Atual</option>
              <option value="todos">Todos os Meses</option>
            </select>
          </div>

          {/* Lista de recebimentos – um card por participante de cada caixa */}
          <div className="space-y-4">
            {[...caixasComBoletos]
              .sort((a, b) => {
                const pagosA = a.boletos.filter((x) => x.status === 'pago').length;
                const pagosB = b.boletos.filter((x) => x.status === 'pago').length;
                return pagosB - pagosA;
              })
              .map((caixa) => {
                const participantesLista = (caixa.participantes || []).filter((p) => {
                  const nome =
                    typeof p.usuarioId === 'object' && p.usuarioId?.nome
                      ? String(p.usuarioId.nome)
                      : '';
                  if (search && !nome.toLowerCase().includes(search.toLowerCase())) {
                    return false;
                  }
                  return true;
                });

                const ordenados = [...participantesLista].sort((a, b) => (a.posicao || 0) - (b.posicao || 0));

                if (ordenados.length === 0) return null;

                const filtroPeriodo = filtroPeriodoPorCaixa[caixa._id] ?? 'geral';
                const totalParcelasCaixa = caixa.duracaoMeses || caixa.qtdParticipantes || 1;
                const periodos = Array.from({ length: totalParcelasCaixa }, (_, i) => i + 1);

                return (
                  <Card key={caixa._id} className="border border-gray-200 rounded-xl">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer"
                      onClick={() => {
                        if (!caixa.expanded) {
                          setFiltroPeriodoPorCaixa((prev) => ({
                            ...prev,
                            [caixa._id]: 'geral',
                          }));
                        }
                        toggleCaixa(caixa._id);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{caixa.nome}</span>
                        <span className="text-xs text-gray-500">
                          {caixa.tipo === 'semanal' ? 'Caixa semanal' : 'Caixa mensal'} •{' '}
                          {caixa.duracaoMeses} {caixa.tipo === 'semanal' ? 'semanas' : 'meses'}
                        </span>
                        {caixa.adminNome && (
                          <span className="text-xs text-gray-400">
                            Gerenciado por: {caixa.adminNome}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info" size="sm">
                          {caixa.tipo === 'semanal' ? 'Semana' : 'Mês'} {caixa.mesAtual}/{caixa.duracaoMeses}
                        </Badge>
                        {caixa.expanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {caixa.expanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/60 rounded-b-xl">
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
                          <button
                            type="button"
                            onClick={() =>
                              setFiltroPeriodoPorCaixa((prev) => ({
                                ...prev,
                                [caixa._id]: 'geral',
                              }))
                            }
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
                              filtroPeriodo === 'geral'
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-700',
                            )}
                          >
                            Geral
                          </button>
                          {periodos.map((mes) => {
                            const ativo = filtroPeriodo === mes;
                            const label = caixa.tipo === 'semanal' ? `Semana ${mes}` : `Mês ${mes}`;
                            return (
                              <button
                                key={mes}
                                type="button"
                                onClick={() =>
                                  setFiltroPeriodoPorCaixa((prev) => ({
                                    ...prev,
                                    [caixa._id]: mes,
                                  }))
                                }
                                className={cn(
                                  'px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
                                  ativo
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-white border-gray-200 text-gray-700',
                                )}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-3">
                          {ordenados.map((p) => {
                            const usuarioId =
                              typeof p.usuarioId === 'string' ? p.usuarioId : p.usuarioId?._id;
                            const nome =
                              typeof p.usuarioId === 'object' && p.usuarioId?.nome
                                ? String(p.usuarioId.nome)
                                : 'Participante';
                            const usuarioObj =
                              typeof p.usuarioId === 'object' ? p.usuarioId : undefined;
                            const telefone = usuarioObj?.telefone ? String(usuarioObj.telefone) : '';

                            const boletosDoParticipante = caixa.boletos.filter((b) =>
                              String(b.pagadorId || b.participanteId) === String(usuarioId || ''),
                            );

                            const boletosConsiderados =
                              filtroPeriodo === 'geral'
                                ? boletosDoParticipante
                                : boletosDoParticipante.filter((b) => b.mes === filtroPeriodo);

                            const parcelasPagas = boletosConsiderados.filter(
                              (b) => b.status === 'pago',
                            ).length;

                            const valorPago = boletosConsiderados
                              .filter((b) => b.status === 'pago')
                              .reduce((sum, b) => sum + b.valorTotal, 0);

                            const labelProgressoGeral = `Pago ${parcelasPagas}/${totalParcelasCaixa}`;

                            const boletoPeriodo =
                              filtroPeriodo === 'geral'
                                ? undefined
                                : boletosDoParticipante.find(
                                  (b) => b.mes === filtroPeriodo,
                                );

                            const indicePeriodo =
                              filtroPeriodo === 'geral'
                                ? undefined
                                : Number(filtroPeriodo);

                            const labelProgressoPeriodo =
                              filtroPeriodo === 'geral' || !indicePeriodo
                                ? null
                                : `${boletoPeriodo?.status === 'pago'
                                  ? 'Pago'
                                  : 'Parcela'
                                } ${indicePeriodo}/${totalParcelasCaixa}`;

                            const statusBadge =
                              parcelasPagas > 0
                                ? { variant: 'success', label: 'Pago' }
                                : { variant: 'warning', label: 'Pendente' };

                            const boletoRepresentativo =
                              filtroPeriodo === 'geral'
                                ? boletosDoParticipante.find(
                                  (b) => b.mes === caixa.mesAtual,
                                ) || boletosDoParticipante[0]
                                : boletosDoParticipante.find(
                                  (b) => b.mes === filtroPeriodo,
                                ) || boletosDoParticipante[0];

                            const boletoComObservacao =
                              filtroPeriodo === 'geral'
                                ? boletosDoParticipante.find((b) => b.observacao)
                                : boletosDoParticipante.find(
                                  (b) =>
                                    b.mes === filtroPeriodo && b.observacao,
                                ) ||
                                boletosDoParticipante.find((b) => b.observacao);

                            if (!usuarioId) return null;

                            return (
                              <Card
                                key={String(usuarioId)}
                                className="p-3 border border-blue-200 bg-blue-50/70"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center mr-1">
                                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                                        {p.posicao || boletoRepresentativo?.mes || 0}
                                      </div>
                                    </div>
                                    <div
                                      className="cursor-pointer"
                                      onClick={() => {
                                        if (boletoRepresentativo) {
                                          setSelectedBoleto(boletoRepresentativo);
                                          setShowDetalheModal(true);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900">{nome}</span>
                                        <Badge variant={statusBadge.variant as any} size="sm">
                                          {statusBadge.label}
                                        </Badge>
                                        {filtroPeriodo !== 'geral' && labelProgressoPeriodo && (
                                          <span className="text-xs text-gray-500">
                                            {labelProgressoPeriodo}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        Caixa: {caixa.nome}
                                      </p>
                                      {filtroPeriodo === 'geral' && (
                                        <p className="text-xs text-gray-500">
                                          {labelProgressoGeral}
                                        </p>
                                      )}
                                      <p className="text-sm mt-1">
                                        <span className="text-gray-600">Valor Pago:</span>{' '}
                                        <span className="text-green-700 font-semibold">
                                          {formatCurrency(valorPago)}
                                        </span>
                                      </p>
                                      {filtroPeriodo !== 'geral' && boletoPeriodo?.dataPagamento && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          Data de Pagamento:{' '}
                                          {formatDate(boletoPeriodo.dataPagamento)}
                                        </p>
                                      )}
                                      {boletoComObservacao?.observacao && (
                                        <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">
                                          Observação: {boletoComObservacao.observacao}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-row items-end gap-2">
                                    {boletoRepresentativo && parcelasPagas > 0 && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                          setSelectedBoleto(boletoRepresentativo);
                                          setShowDetalheModal(true);
                                        }}
                                      >
                                        Comprovante
                                      </Button>
                                    )}
                                    {telefone && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        leftIcon={<Phone className="w-4 h-4" />}
                                        onClick={() => {
                                          const digits = telefone.replace(/\D/g, '');
                                          if (digits) {
                                            window.open(
                                              `https://wa.me/${digits}`,
                                              '_blank',
                                            );
                                          }
                                        }}
                                      >
                                        WhatsApp
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        if (boletoRepresentativo) {
                                          handleAbrirModalObservacao(boletoRepresentativo);
                                        } else {
                                          setObservacaoAtual(
                                            'Observação: Contato realizado via WhatsApp',
                                          );
                                          setObservacaoModalAberto(true);
                                        }
                                      }}
                                    >
                                      Anotar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        </>
      )}

      {activeTab === 'splits' && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Card className="p-4">
              <span className="text-sm text-gray-600">Pendentes</span>
              <p className="mt-2 text-lg font-bold text-amber-700">{splitsPendentes}</p>
            </Card>
            <Card className="p-4">
              <span className="text-sm text-gray-600">Realizados</span>
              <p className="mt-2 text-lg font-bold text-green-700">{splitsRealizados}</p>
            </Card>
            <Card className="p-4">
              <span className="text-sm text-gray-600">Total a Receber</span>
              <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(totalAReceberSplit)}</p>
            </Card>
            <Card className="p-4">
              <span className="text-sm text-gray-600">Próximo Pagamento</span>
              <p className="mt-2 text-base font-semibold text-gray-900">{proximoPagamentoSplit || '-'}</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por participante ou caixa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
              value={splitStatusFilter}
              onChange={(e) => setSplitStatusFilter(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="pago">Pagos</option>
            </select>
            <select className="px-3 py-2 rounded-xl border border-gray-200 text-sm" value={"todos"} onChange={() => { }}>
              <option value="todos">Todos os Tipos</option>
            </select>
          </div>

          {/* Lista de splits agrupados por caixa e participante (layout com expander por caixa) */}
          <div className="space-y-4">
            {[...caixasComBoletos]
              .sort((a, b) => {
                const ea =
                  splitsDados
                    .filter((s) => s.caixa._id === a._id)
                    .map((s) => new Date(s.boleto.dataVencimento))
                    .sort((x, y) => x.getTime() - y.getTime())[0]?.getTime() ||
                  Infinity;
                const eb =
                  splitsDados
                    .filter((s) => s.caixa._id === b._id)
                    .map((s) => new Date(s.boleto.dataVencimento))
                    .sort((x, y) => x.getTime() - y.getTime())[0]?.getTime() ||
                  Infinity;
                return ea - eb;
              })
              .map((caixa) => {
                const itens = splitsDados
                  .filter((s) => s.caixa._id === caixa._id)
                  .filter((s) => {
                    if (search) {
                      const nome = s.boleto.participanteNome.toLowerCase();
                      const cNome = s.caixa.nome.toLowerCase();
                      const term = search.toLowerCase();
                      if (!nome.includes(term) && !cNome.includes(term)) {
                        return false;
                      }
                    }
                    return true;
                  })
                  .sort(
                    (a, b) =>
                      new Date(a.boleto.dataVencimento).getTime() -
                      new Date(b.boleto.dataVencimento).getTime(),
                  );

                if (itens.length === 0) return null;

                const totalParcelas =
                  caixa.duracaoMeses || caixa.qtdParticipantes || 1;
                const splitsPagosCaixa = itens.filter(
                  (s) => s.status === 'pago',
                ).length;

                return (
                  <Card key={caixa._id} className="border border-gray-200 rounded-xl">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer"
                      onClick={() => toggleCaixa(caixa._id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {caixa.nome}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {caixa.tipo === 'semanal'
                              ? 'Caixa semanal'
                              : 'Caixa mensal'}{' '}
                            • {caixa.duracaoMeses}{' '}
                            {caixa.tipo === 'semanal' ? 'semanas' : 'meses'} •
                            Pago {splitsPagosCaixa}/{totalParcelas}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="info" size="sm">
                          {caixa.tipo === 'semanal' ? 'Semana' : 'Mês'}{' '}
                          {caixa.mesAtual}/{caixa.duracaoMeses}
                        </Badge>
                        {caixa.expanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {caixa.expanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/60 rounded-b-xl">
                        <div className="space-y-3">
                          {itens.map(({ id, boleto, caixa, valor, status }) => {
                            const pagamentosDoParticipante =
                              caixa.boletos.filter(
                                (b) =>
                                  String(b.pagadorId || b.participanteId) ===
                                  String(
                                    boleto.pagadorId || boleto.participanteId,
                                  ),
                              );
                            const parcelasPagas = pagamentosDoParticipante.filter(
                              (b) => b.status === 'pago',
                            ).length;
                            const progresso = `Pago ${parcelasPagas}/${totalParcelas}`;
                            const isPago = status === 'pago';
                            const participanteInfo =
                              caixa.participantes?.find(
                                (p) =>
                                  String(
                                    (typeof p.usuarioId === 'string'
                                      ? p.usuarioId
                                      : p.usuarioId?._id) || '',
                                  ) ===
                                  String(
                                    boleto.pagadorId || boleto.participanteId,
                                  ),
                              );
                            const usuarioObj =
                              participanteInfo &&
                                typeof participanteInfo.usuarioId === 'object'
                                ? participanteInfo.usuarioId
                                : undefined;
                            const telefone = usuarioObj?.telefone
                              ? String(usuarioObj.telefone)
                              : '';

                            const posicao = participanteInfo?.posicao || 0;
                            const dataPrevistaRecebimento =
                              posicao > 0
                                ? calcularDataPrevistaRecebimento(caixa, posicao)
                                : null;

                            return (
                              <Card
                                key={id}
                                className={cn(
                                  'p-3 relative transition-colors border',
                                  isPago
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-white border-gray-200',
                                )}
                              >
                                {isPago && (
                                  <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[10px] px-2 py-1 rounded-full shadow-md transform rotate-12 uppercase tracking-widest animate-pulse">
                                    Contemplado
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900">
                                        {boleto.participanteNome}
                                      </span>
                                      <Badge
                                        variant={isPago ? 'success' : 'warning'}
                                        size="sm"
                                      >
                                        {isPago
                                          ? 'Pago'
                                          : 'Aguardando pagamento'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      Caixa: {caixa.nome}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {progresso}
                                    </p>
                                    <p className="text-sm">
                                      <span className="text-gray-600">
                                        Valor a Receber:
                                      </span>{' '}
                                      <span className="text-green-700 font-semibold">
                                        {formatCurrency(valor)}
                                      </span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Vencimento:{' '}
                                      {formatDate(boleto.dataVencimento)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Data prevista do pagamento:{' '}
                                      {dataPrevistaRecebimento
                                        ? formatDate(dataPrevistaRecebimento)
                                        : '-'}
                                    </p>
                                  </div>
                                  <div className="flex flex-col sm:flex-row items-end gap-2">
                                    <Button
                                      size="sm"
                                      variant={isPago ? 'secondary' : 'primary'}
                                      disabled={isPago}
                                      onClick={() => marcarSplitPago(id)}
                                    >
                                      Marcar como Pago
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setSelectedSplitBoleto(boleto);
                                        setShowSplitModal(true);
                                      }}
                                    >
                                      Comprovante
                                    </Button>
                                    {telefone && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        leftIcon={<Phone className="w-4 h-4" />}
                                        onClick={() => {
                                          const digits = String(
                                            telefone,
                                          ).replace(/\D/g, '');
                                          if (digits) {
                                            window.open(
                                              `https://wa.me/${digits}`,
                                              '_blank',
                                            );
                                          }
                                        }}
                                      >
                                        WhatsApp
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        handleAbrirModalObservacao(boleto)
                                      }
                                    >
                                      Anotar
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        </>
      )}



      {/* Modal Detalhe do Boleto */}
      <Modal
        isOpen={showDetalheModal}
        onClose={() => {
          setShowDetalheModal(false);
          setSelectedBoleto(null);
        }}
        title="Comprovantes do participante"
        size="full"
      >
        {selectedBoleto && (
          <div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <Avatar
                name={selectedBoleto.participanteNome}
                src={selectedBoleto.participanteFoto}
                size="md"
              />
              <div className="flex-1">
                <p className="font-semibold">{selectedBoleto.participanteNome}</p>
                <p className="text-sm text-gray-500">{selectedBoleto.caixaNome}</p>
                {typeof totalParcelasParticipante === 'number' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Pagos:{' '}
                    {
                      boletosParticipanteSelecionado.filter(
                        (b) => b.status === 'pago',
                      ).length
                    }
                    /{totalParcelasParticipante}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4">
              {boletosParticipanteSelecionado.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nenhum pagamento encontrado para este participante.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {boletosParticipanteSelecionado.map((b, index) => {
                    const indice = index + 1;
                    const totalParcelas =
                      typeof totalParcelasParticipante === 'number'
                        ? totalParcelasParticipante
                        : boletosParticipanteSelecionado.length || 1;
                    const label = `PAGO ${indice}/${totalParcelas}`;
                    const isPago = b.status === 'pago';

                    return (
                      <div
                        key={b._id}
                        className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">
                            {caixaSelecionada?.tipo === 'semanal'
                              ? `Semana ${b.mes}`
                              : `Mês ${b.mes}`}
                          </span>
                          <Badge
                            variant={getStatusBadge(b.status).variant}
                            size="sm"
                          >
                            {getStatusBadge(b.status).label}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold mb-1">
                          {isPago ? label : `Parcela ${indice}/${totalParcelas}`}
                        </p>
                        <p className="text-sm mb-2">
                          <span className="text-gray-600">Valor:</span>{' '}
                          <span className="font-semibold text-green-700">
                            {formatCurrency(b.valorTotal)}
                          </span>
                        </p>
                        {b.comprovanteUrl ? (
                          <div className="mt-2">
                            <img
                              src={b.comprovanteUrl}
                              alt={label}
                              className="w-full max-h-80 object-contain rounded-md border border-gray-200 bg-white"
                            />
                          </div>
                        ) : (
                          <div className="mt-2">
                            <input
                              id={`modal-file-comprovante-${b._id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleUploadComprovante(
                                  b,
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={uploadingComprovanteId === b._id}
                              onClick={() => {
                                const input = document.getElementById(`modal-file-comprovante-${b._id}`) as HTMLInputElement | null;
                                input?.click();
                              }}
                            >
                              Anexar comprovante
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowDetalheModal(false);
                setSelectedBoleto(null);
              }}
            >
              Fechar
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal de Observação */}
      <Modal
        isOpen={observacaoModalAberto}
        onClose={() => setObservacaoModalAberto(false)}
        title="Anotar observação"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              Selecione uma frase ou escreva sua observação.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setObservacaoAtual(
                    'Observação: Solicitado comprovante via WhatsApp',
                  )
                }
              >
                Solicitado comprovante via WhatsApp
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setObservacaoAtual(
                    'Observação: Participante informou que irá pagar hoje',
                  )
                }
              >
                Pagamento combinado para hoje
              </Button>
            </div>
          </div>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={4}
            value={observacaoAtual}
            onChange={(e) => setObservacaoAtual(e.target.value)}
            placeholder="Escreva aqui a observação..."
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setObservacaoModalAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSalvarObservacao}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Comprovante Split */}
      <Modal
        isOpen={showSplitModal}
        onClose={() => {
          setShowSplitModal(false);
          setSelectedSplitBoleto(null);
        }}
        title="Comprovante de recebimento/split"
        size="lg"
      >
        {selectedSplitBoleto && (
          <div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <Avatar name={selectedSplitBoleto.participanteNome} src={selectedSplitBoleto.participanteFoto} size="md" />
              <div className="flex-1">
                <p className="font-semibold">{selectedSplitBoleto.participanteNome}</p>
                <p className="text-sm text-gray-500">{selectedSplitBoleto.caixaNome}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vencimento</span>
                <span className="text-sm font-medium">{formatDate(selectedSplitBoleto.dataVencimento)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Valor a Receber</span>
                <span className="text-sm font-semibold text-green-700">
                  {(() => {
                    const caixaSplit = caixasComBoletos.find(
                      (c) => c._id === selectedSplitBoleto.caixaId,
                    );
                    const valor =
                      caixaSplit != null
                        ? calcularSplitValor(
                          selectedSplitBoleto as Boleto,
                          caixaSplit,
                        )
                        : selectedSplitBoleto.valorParcela || 0;
                    return formatCurrency(valor);
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Data de Pagamento</span>
                <span className="text-sm font-medium">{(() => {
                  const id = `${selectedSplitBoleto._id}-split`;
                  const info = splitPagoDetalhes[id];
                  return info ? formatDate(info.data) : '-';
                })()}</span>
              </div>
              <div className="text-xs text-gray-500">
                Recebeu o caixa na {caixasComBoletos.find(c => c._id === selectedSplitBoleto.caixaId)?.tipo === 'semanal' ? 'Semana' : 'Mês'} {selectedSplitBoleto.mes} • {selectedSplitBoleto.caixaNome}
              </div>
              <div>
                <input
                  id={`split-file-${selectedSplitBoleto._id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadComprovante(selectedSplitBoleto, e.target.files?.[0] || null)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const el = document.getElementById(`split-file-${selectedSplitBoleto._id}`) as HTMLInputElement | null;
                    el?.click();
                  }}
                >
                  Anexar comprovante
                </Button>
                {selectedSplitBoleto.comprovanteUrl && (
                  <div className="mt-2">
                    <img src={selectedSplitBoleto.comprovanteUrl} alt="Comprovante" className="w-full max-h-80 object-contain rounded-md border border-gray-200 bg-white" />
                  </div>
                )}
              </div>
            </div>
            <Button variant="secondary" className="w-full mt-4" onClick={() => setShowSplitModal(false)}>Fechar</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
