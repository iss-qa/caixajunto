import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  FileImage,
  Download,
  ChevronRight,
  Calendar,
  Wallet,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { pagamentosService, caixasService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatCurrency, formatDate, cn } from '../lib/utils';

// Taxas
const TAXA_SERVICO = 3;
const FUNDO_RESERVA = 50;
const TAXA_ADMIN = 50;
const TAXA_IPCA_MENSAL = 0.004;

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
  correcaoIPCA: number;
  valorTotal: number;
  dataVencimento: string;
  status: 'pago' | 'pendente' | 'atrasado' | 'enviado';
  comprovanteUrl?: string;
  dataPagamento?: string;
  diasAtraso: number;
}

interface CaixaComBoletos {
  _id: string;
  nome: string;
  valorParcela: number;
  duracaoMeses: number;
  mesAtual: number;
  boletos: Boleto[];
  expanded: boolean;
}

const statusFilters = [
  { value: '', label: 'Todos', icon: Filter },
  { value: 'pendente', label: 'Pendentes', icon: Clock },
  { value: 'enviado', label: 'Aguardando', icon: Eye },
  { value: 'pago', label: 'Pagos', icon: CheckCircle2 },
  { value: 'atrasado', label: 'Atrasados', icon: AlertTriangle },
];

export function Pagamentos() {
  const { usuario } = useAuth();
  const [caixasComBoletos, setCaixasComBoletos] = useState<CaixaComBoletos[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [showDetalheModal, setShowDetalheModal] = useState(false);
  const enviarComprovante = (boletoId: string) => {
    setCaixasComBoletos((prev) =>
      prev.map((caixa) => ({
        ...caixa,
        boletos: caixa.boletos.map((b) =>
          b._id === boletoId ? { ...b, status: 'enviado' } : b
        ),
      }))
    );
  };

  useEffect(() => {
    loadPagamentos();
  }, [usuario, statusFilter]);

  const gerarBoletosParaCaixa = (caixa: any): Boleto[] => {
    const boletos: Boleto[] = [];
    const participantes = ['Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Lima', 'Julia Ferreira', 
                          'Roberto Alves', 'Fernanda Lima', 'Lucas Silva', 'Amanda Costa', 'Bruno Santos'];
    
    const dataBase = new Date();
    dataBase.setMonth(dataBase.getMonth() - caixa.mesAtual + 1);
    
    for (let mes = 1; mes <= caixa.duracaoMeses; mes++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + mes - 1);
      dataVencimento.setDate(10);
      
      const correcaoIPCA = caixa.valorParcela * TAXA_IPCA_MENSAL * (mes - 1);
      const fundoReserva = mes === 1 ? FUNDO_RESERVA : 0;
      const taxaAdmin = mes === caixa.duracaoMeses ? TAXA_ADMIN : 0;
      const valorTotal = caixa.valorParcela + TAXA_SERVICO + correcaoIPCA + fundoReserva + taxaAdmin;
      
      const isPago = mes < caixa.mesAtual;
      const isAtrasado = !isPago && mes === caixa.mesAtual && new Date() > dataVencimento;
      
      // Gerar boleto para cada participante
      for (let p = 0; p < Math.min(caixa.qtdParticipantes, participantes.length); p++) {
        boletos.push({
          _id: `${caixa._id}-${mes}-${p}`,
          caixaId: caixa._id,
          caixaNome: caixa.nome,
          participanteId: `part-${p}`,
          participanteNome: participantes[p],
          mes,
          valorParcela: caixa.valorParcela,
          taxaServico: TAXA_SERVICO,
          fundoReserva,
          taxaAdmin,
          correcaoIPCA,
          valorTotal,
          dataVencimento: dataVencimento.toISOString(),
          status: isPago ? 'pago' : isAtrasado ? 'atrasado' : 'pendente',
          dataPagamento: isPago ? dataVencimento.toISOString() : undefined,
          diasAtraso: isAtrasado ? Math.floor((new Date().getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        });
      }
    }
    
    return boletos;
  };

  const loadPagamentos = async () => {
    try {
      setLoading(true);
      // Tentar carregar do backend
      const caixasResponse = await caixasService.getByAdmin(usuario?._id || '');
      const caixas = Array.isArray(caixasResponse) ? caixasResponse : caixasResponse.caixas || [];
      
      const caixasProcessados: CaixaComBoletos[] = caixas.map((caixa: any) => ({
        _id: caixa._id,
        nome: caixa.nome,
        valorParcela: caixa.valorParcela,
        duracaoMeses: caixa.duracaoMeses,
        mesAtual: caixa.mesAtual || 1,
        boletos: gerarBoletosParaCaixa(caixa),
        expanded: false,
      }));
      
      setCaixasComBoletos(caixasProcessados);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      // Mock data
      const mockCaixas = [
        { _id: '1', nome: 'Caixa da Família', valorParcela: 500, duracaoMeses: 10, mesAtual: 4, qtdParticipantes: 10 },
        { _id: '2', nome: 'Caixa do Trabalho', valorParcela: 500, duracaoMeses: 8, mesAtual: 7, qtdParticipantes: 8 },
      ];
      
      setCaixasComBoletos(mockCaixas.map(caixa => ({
        _id: caixa._id,
        nome: caixa.nome,
        valorParcela: caixa.valorParcela,
        duracaoMeses: caixa.duracaoMeses,
        mesAtual: caixa.mesAtual,
        boletos: gerarBoletosParaCaixa(caixa),
        expanded: false,
      })));
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
      pendente: { variant: 'warning', label: 'Pendente' },
      enviado: { variant: 'info', label: 'Aguardando' },
      pago: { variant: 'success', label: 'Pago' },
      atrasado: { variant: 'danger', label: 'Atrasado' },
    };
    return config[status] || { variant: 'gray', label: status };
  };

  // Estatísticas gerais
  const allBoletos = caixasComBoletos.flatMap(c => c.boletos);
  const filteredBoletos = allBoletos.filter(b => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (search && !b.participanteNome.toLowerCase().includes(search.toLowerCase()) &&
        !b.caixaNome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const estatisticas = {
    total: allBoletos.length,
    pendentes: allBoletos.filter((b) => b.status === 'pendente').length,
    aguardando: allBoletos.filter((b) => b.status === 'enviado').length,
    pagos: allBoletos.filter((b) => b.status === 'pago').length,
    atrasados: allBoletos.filter((b) => b.status === 'atrasado').length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-sm text-gray-500">
          Visualize todos os boletos e pagamentos dos participantes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.pendentes}</p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.aguardando}</p>
              <p className="text-xs text-gray-500">Aguardando</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.pagos}</p>
              <p className="text-xs text-gray-500">Pagos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas.atrasados}</p>
              <p className="text-xs text-gray-500">Atrasados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Legenda de valores */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">Composição do Boleto</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Taxa serviço:</span>
                <span className="font-medium text-gray-900 ml-1">{formatCurrency(TAXA_SERVICO)}/mês</span>
              </div>
              <div>
                <span className="text-gray-600">Fundo reserva:</span>
                <span className="font-medium text-gray-900 ml-1">{formatCurrency(FUNDO_RESERVA)} (1º mês)</span>
              </div>
              <div>
                <span className="text-gray-600">Taxa admin:</span>
                <span className="font-medium text-gray-900 ml-1">{formatCurrency(TAXA_ADMIN)} (último)</span>
              </div>
              <div>
                <span className="text-gray-600">IPCA:</span>
                <span className="font-medium text-gray-900 ml-1">{(TAXA_IPCA_MENSAL * 100).toFixed(2)}%/mês</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome ou caixa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                statusFilter === filter.value
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
              )}
              style={statusFilter === filter.value ? { boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)' } : {}}
            >
              <filter.icon className="w-4 h-4" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Caixas com Boletos */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : caixasComBoletos.length > 0 ? (
        <div className="space-y-4">
          {caixasComBoletos.map((caixa) => {
            const caixaBoletos = caixa.boletos.filter(b => {
              if (statusFilter && b.status !== statusFilter) return false;
              if (search && !b.participanteNome.toLowerCase().includes(search.toLowerCase())) return false;
              return true;
            });

            // Agrupar por mês
            const boletosPorMes = Array.from({ length: caixa.duracaoMeses }, (_, i) => ({
              mes: i + 1,
              boletos: caixaBoletos.filter(b => b.mes === i + 1),
            }));

            return (
              <Card key={caixa._id}>
                {/* Header do Caixa */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleCaixa(caixa._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{caixa.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {caixa.duracaoMeses} meses • {formatCurrency(caixa.valorParcela)}/mês
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="info">
                      Mês {caixa.mesAtual}/{caixa.duracaoMeses}
                    </Badge>
                    {caixa.expanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Boletos por mês */}
                {caixa.expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-100"
                  >
                    {boletosPorMes.map(({ mes, boletos }) => {
                      if (boletos.length === 0) return null;
                      
                      const primeiroBoleto = boletos[0];
                      const isPago = primeiroBoleto.status === 'pago';
                      const isAtual = mes === caixa.mesAtual;
                      
                      return (
                        <div key={mes} className="mb-4">
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-lg mb-2",
                            isPago ? "bg-green-50" : isAtual ? "bg-amber-50" : "bg-gray-50"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-semibold",
                                isPago ? "text-green-700" : isAtual ? "text-amber-700" : "text-gray-700"
                              )}>
                                Mês {mes}
                              </span>
                              <Badge 
                                variant={isPago ? 'success' : isAtual ? 'warning' : 'gray'} 
                                size="sm"
                              >
                                {isPago ? 'Pago' : isAtual ? 'Atual' : 'Futuro'}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Valor por participante</p>
                              <p className="font-bold text-gray-900">
                                {formatCurrency(primeiroBoleto.valorTotal)}
                              </p>
                            </div>
                          </div>

                          {/* Detalhes do boleto */}
                          <div className="ml-4 mb-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <span>Parcela: {formatCurrency(primeiroBoleto.valorParcela)}</span>
                              <span>Taxa: {formatCurrency(primeiroBoleto.taxaServico)}</span>
                              {primeiroBoleto.fundoReserva > 0 && (
                                <span className="text-blue-600">Fundo: {formatCurrency(primeiroBoleto.fundoReserva)}</span>
                              )}
                              {primeiroBoleto.taxaAdmin > 0 && (
                                <span className="text-purple-600">Admin: {formatCurrency(primeiroBoleto.taxaAdmin)}</span>
                              )}
                              {primeiroBoleto.correcaoIPCA > 0 && (
                                <span className="text-amber-600">IPCA: {formatCurrency(primeiroBoleto.correcaoIPCA)}</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Vencimento: {formatDate(primeiroBoleto.dataVencimento)}
                            </div>
                          </div>

                          {/* Lista de participantes */}
                          <div className="space-y-2 ml-4">
                            {boletos.map((boleto) => (
                              <div
                                key={boleto._id}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                                  boleto.status === 'atrasado' && "bg-red-50 hover:bg-red-100"
                                )}
                                onClick={() => {
                                  setSelectedBoleto(boleto);
                                  setShowDetalheModal(true);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar name={boleto.participanteNome} src={boleto.participanteFoto} size="sm" />
                                  <span className="text-sm font-medium text-gray-700">{boleto.participanteNome}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {boleto.status === 'atrasado' && (
                                    <span className="text-xs text-red-600">{boleto.diasAtraso} dias</span>
                                  )}
                                  <Badge variant={getStatusBadge(boleto.status).variant} size="sm">
                                    {getStatusBadge(boleto.status).label}
                                  </Badge>
                                {boleto.status !== 'pago' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => enviarComprovante(boleto._id)}
                                  >
                                    Enviar comprovante
                                  </Button>
                                )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Wallet}
          title="Nenhum pagamento encontrado"
          description="Os pagamentos aparecerão aqui quando você tiver caixas com participantes."
        />
      )}

      {/* Modal Detalhe do Boleto */}
      <Modal
        isOpen={showDetalheModal}
        onClose={() => {
          setShowDetalheModal(false);
          setSelectedBoleto(null);
        }}
        title="Detalhes do Boleto"
        size="md"
      >
        {selectedBoleto && (
          <div>
            {/* Info do participante */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <Avatar name={selectedBoleto.participanteNome} src={selectedBoleto.participanteFoto} size="md" />
              <div className="flex-1">
                <p className="font-semibold">{selectedBoleto.participanteNome}</p>
                <p className="text-sm text-gray-500">{selectedBoleto.caixaNome}</p>
              </div>
              <Badge variant={getStatusBadge(selectedBoleto.status).variant}>
                {getStatusBadge(selectedBoleto.status).label}
              </Badge>
            </div>

            {/* Detalhes do valor */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Parcela base</span>
                <span className="font-medium">{formatCurrency(selectedBoleto.valorParcela)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Taxa de serviço</span>
                <span className="font-medium">{formatCurrency(selectedBoleto.taxaServico)}</span>
              </div>
              {selectedBoleto.fundoReserva > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-blue-600">Fundo de reserva</span>
                  <span className="font-medium text-blue-600">{formatCurrency(selectedBoleto.fundoReserva)}</span>
                </div>
              )}
              {selectedBoleto.taxaAdmin > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-purple-600">Taxa admin</span>
                  <span className="font-medium text-purple-600">{formatCurrency(selectedBoleto.taxaAdmin)}</span>
                </div>
              )}
              {selectedBoleto.correcaoIPCA > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-amber-600">Correção IPCA</span>
                  <span className="font-medium text-amber-600">{formatCurrency(selectedBoleto.correcaoIPCA)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-green-50 rounded-lg px-3">
                <span className="font-semibold text-gray-900">Valor Total</span>
                <span className="font-bold text-green-600">{formatCurrency(selectedBoleto.valorTotal)}</span>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">Mês</p>
                <p className="font-semibold">{selectedBoleto.mes}º mês</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">Vencimento</p>
                <p className="font-semibold">{formatDate(selectedBoleto.dataVencimento)}</p>
              </div>
            </div>

            {selectedBoleto.dataPagamento && (
              <div className="p-3 bg-green-50 rounded-xl mb-4">
                <p className="text-xs text-green-600">Pago em</p>
                <p className="font-semibold text-green-700">{formatDate(selectedBoleto.dataPagamento)}</p>
              </div>
            )}

            {selectedBoleto.status === 'atrasado' && (
              <div className="p-3 bg-red-50 rounded-xl mb-4">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Boleto atrasado há {selectedBoleto.diasAtraso} dias
                </p>
              </div>
            )}

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
    </div>
  );
}
