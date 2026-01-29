import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign,
    Calendar,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    ArrowRight,
    Filter,
    Download,
} from 'lucide-react';
import { recebimentosService, caixasService, participantesService } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

function WithdrawalModal({
    visible,
    onClose,
    onConfirm,
    loading,
    recebimento
}: {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    recebimento: any;
}) {
    if (!visible || !recebimento) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="p-6">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                        Confirmar Solicitação de Saque
                    </h3>

                    <p className="text-center text-gray-500 mb-6">
                        Você está prestes a processar manualmente o saque para:
                    </p>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Participante:</span>
                            <span className="font-medium text-gray-900">{recebimento.recebedorId?.nome}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Caixa:</span>
                            <span className="font-medium text-gray-900">{recebimento.caixaId?.nome}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Valor:</span>
                            <span className="font-bold text-green-600">{formatCurrency(recebimento.valorTotal)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                            onClick={onConfirm}
                            isLoading={loading}
                        >
                            Confirmar Saque
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export function GestorContemplacao() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [recebimentos, setRecebimentos] = useState<any[]>([]);
    const [filtros, setFiltros] = useState({
        caixaId: '',
        status: '',
        search: '',
    });
    const [caixas, setCaixas] = useState<any[]>([]);

    const [selectedRecebimento, setSelectedRecebimento] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // State for Caixa Selection
    const [selectedCaixa, setSelectedCaixa] = useState<any>(null);

    const derivedStats = useMemo(() => {
        const concluidos = recebimentos.filter(r => r.status === 'concluido');
        const naoConcluidos = recebimentos.filter(r => r.status !== 'concluido');
        return {
            totalContemplacoes: concluidos.length,
            totalPago: concluidos.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0),
            pendentes: naoConcluidos.length,
            valorPendente: naoConcluidos.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0),
            valorFundoReserva: selectedCaixa?.valorParcela || 0,
            valorDevolucao: (selectedCaixa?.valorParcela || 0) / ((selectedCaixa?.qtdParticipantes || 0) + 1)
        };
    }, [recebimentos, selectedCaixa]);

    useEffect(() => {
        loadCaixas();
    }, []);

    useEffect(() => {
        // Se selecionou caixa, carrega dados específicos dele
        if (selectedCaixa) {
            setFiltros(prev => ({ ...prev, caixaId: selectedCaixa._id }));
        }
    }, [selectedCaixa]);

    // Se trocar caixa via dropdown (no dashboard), atualiza estado local também
    useEffect(() => {
        if (filtros.caixaId && filtros.caixaId !== selectedCaixa?._id) {
            const found = caixas.find(c => c._id === filtros.caixaId);
            if (found) setSelectedCaixa(found);
        }
    }, [filtros.caixaId, caixas]);

    const [participantesLista, setParticipantesLista] = useState<any[]>([]);

    useEffect(() => {
        if (selectedCaixa) {
            loadData();
            loadParticipantes();
        }
    }, [selectedCaixa, filtros.status]);

    const loadParticipantes = async () => {
        if (!selectedCaixa) return;
        try {
            const data = await participantesService.getByCaixa(selectedCaixa._id);
            // Verifica se retornou array direto ou objeto com chave participantes
            setParticipantesLista(Array.isArray(data) ? data : data.participantes || []);
        } catch (error) {
            console.error('Erro ao carregar participantes:', error);
        }
    };

    const loadData = async () => {
        if (!selectedCaixa && !filtros.caixaId) return; // Só carrega se tiver caixa selecionado

        try {
            setLoading(true);
            const [statsData, listData] = await Promise.all([
                // Se a API suportar filtro de stats por caixa, ideal seria passar aqui. 
                // Por enquanto, mantemos stats gerais ou implementamos endpoint específico no futuro.
                // Assumindo que getEstatisticas retorna geral, talvez seja melhor filtrar no front ou pedir endpoint novo.
                // Vamos manter o comportamento atual mas focado no filtro de lista.
                recebimentosService.getEstatisticas(),
                recebimentosService.getAll({
                    caixaId: filtros.caixaId || selectedCaixa._id,
                    status: filtros.status
                })
            ]);
            setStats(statsData);
            setRecebimentos(listData.recebimentos);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCaixas = async () => {
        try {
            const data = await caixasService.getAll();
            setCaixas(data.caixas);
        } catch (error) {
            console.error('Erro ao carregar caixas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSolicitarSaque = async () => {
        if (!selectedRecebimento) return;

        try {
            setActionLoading(true);
            const response = await recebimentosService.solicitarSaque(selectedRecebimento._id);

            if (response.success) {
                setModalVisible(false);
                setSelectedRecebimento(null);
                await loadData();
                alert("Solicitação de saque enviada com sucesso!");
            } else {
                alert(`Falha ao solicitar saque: ${response.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error("Erro ao solicitar saque:", error);
            alert("Erro ao processar solicitação.");
        } finally {
            setActionLoading(false);
        }
    };

    const filteredRecebimentos = recebimentos.filter(r =>
        !filtros.search ||
        r.recebedorId?.nome.toLowerCase().includes(filtros.search.toLowerCase()) ||
        r.caixaId?.nome.toLowerCase().includes(filtros.search.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'concluido': return <Badge variant="success">Pago</Badge>;
            case 'pendente': return <Badge variant="warning">Pendente</Badge>;
            case 'agendado': return <Badge variant="info">Agendado</Badge>;
            case 'processando': return <Badge variant="warning">Processando</Badge>;
            case 'falha': return <Badge variant="danger">Falha</Badge>;
            default: return <Badge variant="gray">{status}</Badge>;
        }
    };

    const [fixModalVisible, setFixModalVisible] = useState(false);
    const [fixPosicao, setFixPosicao] = useState('');

    const handleFixContemplacao = async () => {
        if (!selectedCaixa || !fixPosicao) return;
        try {
            setActionLoading(true);
            await caixasService.fixContemplacao(selectedCaixa._id, parseInt(fixPosicao, 10));
            alert(`Contemplação gerada com sucesso para posição ${fixPosicao}!`);
            setFixModalVisible(false);
            setFixPosicao('');
            await loadData();
        } catch (error) {
            console.error("Erro ao gerar contemplação:", error);
            alert("Erro ao gerar contemplação manual.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !stats && !selectedCaixa) { // Adjusted loading condition for initial caixa selection
        return (
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
                </div>
                <CardSkeleton />
            </div>
        );
    }

    // VIEW: LISTA DE CAIXAS (Step 1)
    if (!selectedCaixa) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Gestor de Contemplação</h1>
                    <p className="text-gray-500">Selecione um caixa para gerenciar</p>
                </div>

                {loading && caixas.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {caixas.map(caixa => (
                            <Card
                                key={caixa._id}
                                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-primary-500 hover:-translate-y-1 group"
                                onClick={() => setSelectedCaixa(caixa)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-primary-100 rounded-lg group-hover:bg-primary-600 transition-colors">
                                        <DollarSign className="w-6 h-6 text-primary-600 group-hover:text-white" />
                                    </div>
                                    <Badge variant={caixa.status === 'ativo' ? 'success' : 'gray'}>
                                        {caixa.status}
                                    </Badge>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{caixa.nome}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                    {caixa.descricao || 'Sem descrição'}
                                </p>

                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                                    <span className="text-gray-500">
                                        {caixa.tipo} • {formatCurrency(caixa.valorTotal || 0)}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-primary-500" />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }



    // VIEW: DASHBOARD (Step 2)
    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header com botão Voltar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCaixa(null)}>
                        <ArrowRight className="w-5 h-5 rotate-180" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedCaixa.nome}</h1>
                        <p className="text-gray-500">Gestão de Contemplados e Saques</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => setFixModalVisible(true)}
                    >
                        🔧 Gerar Contemplação Manual
                    </Button>
                    <Button size="sm" onClick={loadData}>Atualizar</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-white border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Fundo de Reserva</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(derivedStats.valorFundoReserva)}
                            </h3>
                            <p className="text-xs text-blue-600 mt-1">
                                Devolução: {formatCurrency(derivedStats.valorDevolucao)}
                            </p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pagamentos Pendentes</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(derivedStats.valorPendente)}
                            </h3>
                            <p className="text-xs text-amber-600 mt-1">{derivedStats.pendentes} aguardando</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border-l-4 border-l-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Pago</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {formatCurrency(derivedStats.totalPago)}
                            </h3>
                            <p className="text-xs text-green-600 mt-1">{derivedStats.totalContemplacoes} concluídos</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-white border-l-4 border-l-gray-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Contemplações</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                {derivedStats.totalContemplacoes}
                            </h3>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-gray-600" />
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por participante ou caixa..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={filtros.search}
                            onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            value={filtros.caixaId}
                            onChange={(e) => setFiltros({ ...filtros, caixaId: e.target.value })}
                        >
                            <option value="">Todos os Caixas</option>
                            {caixas.map(c => <option key={c._id} value={c._id}>{c.nome}</option>)}
                        </select>
                        <select
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            value={filtros.status}
                            onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                        >
                            <option value="">Todos Status</option>
                            <option value="pendente">Pendente</option>
                            <option value="agendado">Agendado</option>
                            <option value="processando">Processando</option>
                            <option value="concluido">Pago</option>
                            <option value="falha">Falha</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 text-left">
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Caixa</th>
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Participante</th>
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Ponto</th>
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Data Pagamento</th>
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="pb-3 text-xs font-semibold text-gray-500 uppercase text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRecebimentos.map((item) => (
                                <tr key={item._id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="py-4">
                                        <span className="font-medium text-gray-900">{item.caixaId?.nome}</span>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-700 font-medium">{item.recebedorId?.nome}</span>
                                            {!item.participanteId && <Badge variant="info">Admin</Badge>}
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        {!item.participanteId ? (
                                            <Badge variant="warning">Comissão</Badge>
                                        ) : (
                                            <span className="text-gray-600">{item.mesReferencia}/{item.caixaId?.duracaoEmMeses || 4}</span>
                                        )}
                                    </td>
                                    <td className="py-4">
                                        <span className="text-gray-600">
                                            {new Date(item.dataPrevista).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(item.valorTotal)}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    <td className="py-4 text-right">
                                        {item.status !== 'concluido' && item.status !== 'processando' && (
                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "text-white",
                                                    item.status === 'falha' ? "bg-red-600 hover:bg-red-700" :
                                                        item.status === 'agendado' ? "bg-blue-600 hover:bg-blue-700" :
                                                            "bg-green-600 hover:bg-green-700"
                                                )}
                                                onClick={() => {
                                                    setSelectedRecebimento(item);
                                                    setModalVisible(true);
                                                }}
                                            >
                                                {item.status === 'falha' ? 'Tentar Novamente' : 'Solicitar Saque'}
                                            </Button>
                                        )}
                                        {item.status === 'processando' && (
                                            <span className="text-sm text-amber-600 font-medium">Processando...</span>
                                        )}
                                        {item.status === 'concluido' && (
                                            <span className="text-sm text-gray-400">Concluído</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredRecebimentos.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <WithdrawalModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onConfirm={handleSolicitarSaque}
                loading={actionLoading}
                recebimento={selectedRecebimento}
            />

            {/* Modal de Contemplação Manual */}
            {fixModalVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Gerar Contemplação Manual</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Selecione o participante que será contemplado manualmente.
                            </p>

                            <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-6 bg-white"
                                value={fixPosicao}
                                onChange={(e) => setFixPosicao(e.target.value)}
                            >
                                <option value="">Selecione o participante...</option>
                                {participantesLista
                                    .filter(p => p.status !== 'inativo') // Opcional: filtrar apenas ativos
                                    .sort((a, b) => (a.posicao || 999) - (b.posicao || 999)) // Ordenar por posição
                                    .map(p => (
                                        <option key={p._id} value={p.posicao} disabled={!p.posicao}>
                                            {p.posicao ? `#${p.posicao} - ` : '(S/ Pos) - '}{p.usuarioId?.nome || p.nome || 'Participante'}
                                        </option>
                                    ))
                                }
                            </select>

                            <div className="flex gap-3">
                                <Button variant="secondary" className="flex-1" onClick={() => setFixModalVisible(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                                    onClick={handleFixContemplacao}
                                    disabled={!fixPosicao || actionLoading}
                                    isLoading={actionLoading}
                                >
                                    Gerar
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
