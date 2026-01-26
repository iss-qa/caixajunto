import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Calendar, User, FileText, CheckCircle2, XCircle, Clock, Search, Filter, RefreshCw, Send, BookOpen } from 'lucide-react';
import { comunicacaoService, type MensagemHistorico } from '../lib/api/comunicacao.service';
import { caixasService, participantesService } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const tipoMensagemLabels: Record<string, string> = {
    boas_vindas: 'Boas-vindas',
    lembrete_pagamento: 'Lembrete - Vencimento próximo',
    confirmacao_pagamento: 'Confirmação de Pagamento',
    alerta_atraso: 'Alerta de Atraso',
    manual: 'Manual',
    cobranca: 'Cobrança',
    caixa_iniciado: 'Caixa Iniciado',
    contemplacao: 'Participante Contemplado',
};

const tipoMensagemColors: Record<string, string> = {
    boas_vindas: 'bg-purple-100 text-purple-700',
    lembrete_pagamento: 'bg-blue-100 text-blue-700',
    confirmacao_pagamento: 'bg-green-100 text-green-700',
    alerta_atraso: 'bg-red-100 text-red-700',
    manual: 'bg-gray-100 text-gray-700',
    cobranca: 'bg-orange-100 text-orange-700',
    caixa_iniciado: 'bg-emerald-100 text-emerald-700',
    contemplacao: 'bg-yellow-100 text-yellow-700',
};

export function GerenciarComunicacao() {
    const [mensagens, setMensagens] = useState<MensagemHistorico[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filtros
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [filtroStatus, setFiltroStatus] = useState<string>('');
    const [filtroCaixaId, setFiltroCaixaId] = useState<string>('');
    const [caixas, setCaixas] = useState<Array<{ _id: string; nome: string }>>([]);

    // Modal de detalhes
    const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemHistorico | null>(null);
    const [showModal, setShowModal] = useState(false);
    // Reenviando mensagem
    const [resendingId, setResendingId] = useState<string | null>(null);

    // Modal de mensagem manual
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualCaixaId, setManualCaixaId] = useState<string>('');
    const [manualEscopo, setManualEscopo] = useState<'todos' | 'participante_especifico' | 'apenas_admins'>('todos');
    const [manualParticipanteId, setManualParticipanteId] = useState<string>('');
    const [manualMensagem, setManualMensagem] = useState<string>('');
    const [participantesCaixa, setParticipantesCaixa] = useState<Array<{ _id: string; usuarioId: any }>>([]);
    const [sendingManual, setSendingManual] = useState(false);
    const [caixasAtivos, setCaixasAtivos] = useState<Array<{ _id: string; nome: string }>>([]);

    // Modal de Regras de Disparo
    const [showRegrasModal, setShowRegrasModal] = useState(false);

    const regrasComunicacao = [
        {
            nome: 'Boas-vindas',
            gatilho: 'Ao Iniciar o Caixa',
            descricao: 'Enviada para todos os participantes quando o administrador inicia o caixa (status muda para Ativo).'
        },
        {
            nome: 'Caixa Iniciado',
            gatilho: '1 min após Boas-vindas',
            descricao: 'Informa a ordem de contemplação (posição sorteada) para cada participante. Agendada automaticamente após o envio das boas-vindas.'
        },
        {
            nome: 'Envio de Contrato',
            gatilho: '2 min após Boas-vindas',
            descricao: 'Envia o arquivo PDF do contrato "Juntix" para assinatura digital.'
        },
        {
            nome: 'Envio de Termos',
            gatilho: '3 min após Boas-vindas',
            descricao: 'Envia o arquivo PDF dos Termos de Uso da plataforma.'
        },
        {
            nome: 'Nova Cobrança',
            gatilho: 'Ao Gerar Cobrança',
            descricao: 'Enviada quando um boleto/PIX é gerado pelo sistema (integração Lytex). Contém link de pagamento, código de barras e QR Code.'
        },
        {
            nome: 'Lembrete Pré-Vencimento',
            gatilho: '1 a 5 dias ANTES do vencimento',
            descricao: 'Lembrete diário automático (09:00) enviado para o participante com QR Code e código PIX Copia e Cola.'
        },
        {
            nome: 'Alerta Atraso Leve',
            gatilho: '0 a 5 dias APÓS vencimento',
            descricao: 'Alerta diário automático (09:00) enviado APENAS para o Administrador informando sobre o atraso do participante.'
        },
        {
            nome: 'Alerta Atraso Crítico',
            gatilho: '6 a 30 dias APÓS vencimento',
            descricao: 'Alerta diário automático (09:00) enviado para o Administrador e para TODOS os participantes do grupo, expondo o atraso.'
        },
        {
            nome: 'Confirmação de Pagamento',
            gatilho: 'Ao Confirmar Pagamento',
            descricao: 'Notifica o grupo quando o pagamento de um participante é confirmado (via webhook ou baixa manual).'
        }
    ];

    useEffect(() => {
        loadCaixas();
    }, []);

    useEffect(() => {
        loadHistorico();
    }, [page, filtroTipo, filtroStatus, filtroCaixaId]);

    const loadCaixas = async () => {
        try {
            const response = await caixasService.getAll({ limit: 100 });
            const caixasList = Array.isArray(response) ? response : response.caixas || [];
            setCaixas(caixasList);
        } catch (err) {
            console.error('Erro ao carregar caixas:', err);
        }
    };

    const loadHistorico = async () => {
        try {
            setLoading(true);
            setError(null);

            const filtros: any = { page, limit: 20 };
            if (filtroTipo) filtros.tipo = filtroTipo;
            if (filtroStatus) filtros.status = filtroStatus;
            if (filtroCaixaId) filtros.caixaId = filtroCaixaId;

            const response = await comunicacaoService.getHistorico(filtros);
            setMensagens(response.mensagens);
            setTotal(response.total);
            setTotalPages(response.pages);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar histórico de comunicação');
        } finally {
            setLoading(false);
        }
    };

    const renderStatusIcon = (status: string) => {
        if (status === 'enviado') {
            return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        } else if (status === 'falha') {
            return <XCircle className="w-5 h-5 text-red-500" />;
        } else {
            return <Clock className="w-5 h-5 text-amber-500" />;
        }
    };

    const renderStatusBadge = (status: string) => {
        if (status === 'enviado') {
            return (
                <Badge variant="success" size="sm">
                    Enviado
                </Badge>
            );
        } else if (status === 'falha') {
            return (
                <Badge variant="danger" size="sm">
                    Falha
                </Badge>
            );
        } else {
            return (
                <Badge variant="warning" size="sm">
                    Pendente
                </Badge>
            );
        }
    };

    const limparFiltros = () => {
        setFiltroTipo('');
        setFiltroStatus('');
        setFiltroCaixaId('');
        setPage(1);
    };

    const handleResend = async (mensagemId: string) => {
        try {
            setResendingId(mensagemId);
            await comunicacaoService.resendMessage(mensagemId);
            // Recarregar a lista para ver o novo status
            await loadHistorico();
        } catch (err: any) {
            console.error('Erro ao reenviar mensagem:', err);
            alert(err.message || 'Erro ao reenviar mensagem');
        } finally {
            setResendingId(null);
        }
    };

    // Carregar caixas ativos para o modal de envio manual
    const loadCaixasAtivos = async () => {
        try {
            const response = await caixasService.getAll({ limit: 100 });
            const caixasList = Array.isArray(response) ? response : response.caixas || [];
            const ativos = caixasList.filter((c: any) => c.status === 'ativo');
            setCaixasAtivos(ativos);
        } catch (err) {
            console.error('Erro ao carregar caixas ativos:', err);
        }
    };

    // Carregar participantes de uma caixa específica
    const loadParticipantesCaixa = async (caixaId: string) => {
        try {
            const participantes = await participantesService.getByCaixa(caixaId);
            const lista = Array.isArray(participantes) ? participantes : participantes.participantes || [];
            setParticipantesCaixa(lista);
        } catch (err) {
            console.error('Erro ao carregar participantes:', err);
            setParticipantesCaixa([]);
        }
    };

    // Abrir modal de envio manual
    const handleOpenManualModal = () => {
        loadCaixasAtivos();
        setManualCaixaId('');
        setManualEscopo('todos');
        setManualParticipanteId('');
        setManualMensagem('');
        setParticipantesCaixa([]);
        setShowManualModal(true);
    };

    // Quando caixa muda, carregar participantes
    const handleManualCaixaChange = (caixaId: string) => {
        setManualCaixaId(caixaId);
        setManualParticipanteId('');
        if (caixaId) {
            loadParticipantesCaixa(caixaId);
        } else {
            setParticipantesCaixa([]);
        }
    };

    // Enviar mensagem manual
    const handleSendManualMessage = async () => {
        if (!manualCaixaId || !manualMensagem.trim()) {
            alert('Selecione uma caixa e digite uma mensagem');
            return;
        }

        if (manualEscopo === 'participante_especifico' && !manualParticipanteId) {
            alert('Selecione um participante');
            return;
        }

        try {
            setSendingManual(true);
            const result = await comunicacaoService.enviarMensagemManual({
                caixaId: manualCaixaId,
                mensagem: manualMensagem,
                escopo: manualEscopo,
                participanteId: manualEscopo === 'participante_especifico' ? manualParticipanteId : undefined,
            });

            if (result.success) {
                alert(`✅ ${result.enviados} mensagem(ns) enviada(s) com sucesso!`);
                setShowManualModal(false);
                loadHistorico(); // Recarregar lista
            } else {
                alert(`❌ Erro: ${result.message}`);
            }
        } catch (err: any) {
            console.error('Erro ao enviar mensagem manual:', err);
            alert(err.message || 'Erro ao enviar mensagem manual');
        } finally {
            setSendingManual(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Comunicação</h1>
                        <p className="text-sm text-gray-500">
                            Histórico de mensagens automáticas enviadas via WhatsApp
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="flex justify-end mb-6">
                <Button
                    variant="secondary"
                    className="border-red-500 text-red-600 hover:bg-red-50 bg-white"
                    leftIcon={<BookOpen className="w-4 h-4" />}
                    onClick={() => setShowRegrasModal(true)}
                >
                    Regras de Disparo
                </Button>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Filtro por Caixa */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Caixa
                        </label>
                        <select
                            value={filtroCaixaId}
                            onChange={(e) => {
                                setFiltroCaixaId(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">Todos os caixas</option>
                            {caixas.map((caixa) => (
                                <option key={caixa._id} value={caixa._id}>
                                    {caixa.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por Tipo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Mensagem
                        </label>
                        <select
                            value={filtroTipo}
                            onChange={(e) => {
                                setFiltroTipo(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">Todos os tipos</option>
                            <option value="boas_vindas">Boas-vindas</option>
                            <option value="caixa_iniciado">Caixa Iniciado</option>
                            <option value="lembrete_pagamento">Lembrete - Vencimento próximo</option>
                            <option value="confirmacao_pagamento">Confirmação de Pagamento</option>
                            <option value="alerta_atraso">Alerta de Atraso</option>
                            <option value="cobranca">Cobrança Gerada</option>
                            <option value="contemplacao">Participante Contemplado</option>
                            <option value="manual">Manual</option>
                        </select>
                    </div>

                    {/* Filtro por Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            value={filtroStatus}
                            onChange={(e) => {
                                setFiltroStatus(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="">Todos os status</option>
                            <option value="enviado">Enviado</option>
                            <option value="pendente">Pendente</option>
                            <option value="falha">Falha</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={limparFiltros}>
                            Limpar Filtros
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Send className="w-4 h-4" />}
                            onClick={handleOpenManualModal}
                        >
                            Enviar Mensagem Manual
                        </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                        {total} {total === 1 ? 'mensagem encontrada' : 'mensagens encontradas'}
                    </p>
                </div>
            </Card>

            {/* Tabela de Mensagens */}
            {loading ? (
                <Card>
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        <p className="mt-4 text-gray-500">Carregando histórico...</p>
                    </div>
                </Card>
            ) : error ? (
                <Card>
                    <div className="text-center py-12">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">{error}</p>
                        <Button onClick={loadHistorico} className="mt-4">
                            Tentar Novamente
                        </Button>
                    </div>
                </Card>
            ) : mensagens.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhuma mensagem encontrada</p>
                        <p className="text-sm text-gray-400 mt-2">
                            As mensagens aparecerão aqui quando forem disparadas
                        </p>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Data/Hora
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Caixa
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Participante
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Tipo
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {mensagens.map((mensagem) => (
                                    <tr
                                        key={mensagem._id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-900">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {formatDate(mensagem.dataEnvio || mensagem.createdAt)}
                                            </div>
                                            <div className="text-xs text-gray-500 ml-6">
                                                {new Date(mensagem.dataEnvio || mensagem.createdAt).toLocaleTimeString('pt-BR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm font-medium text-gray-900">
                                                {mensagem.caixaNome}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {mensagem.participanteNome}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {mensagem.participanteTelefone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoMensagemColors[mensagem.tipo] || 'bg-gray-100 text-gray-700'}`}
                                                >
                                                    {tipoMensagemLabels[mensagem.tipo] || mensagem.tipo}
                                                </span>
                                                {/* Identificação de escopo para mensagens manuais */}
                                                {mensagem.tipo === 'manual' && (mensagem as any).metadata?.escopo && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(mensagem as any).metadata.escopo === 'participante_especifico'
                                                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                                        : (mensagem as any).metadata.escopo === 'apenas_admins'
                                                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                                            : 'bg-green-50 text-green-600 border border-green-200'
                                                        }`}>
                                                        {(mensagem as any).metadata.escopo === 'participante_especifico'
                                                            ? '👤 Individual'
                                                            : (mensagem as any).metadata.escopo === 'apenas_admins'
                                                                ? '👥 Admins'
                                                                : '📢 Todos'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {renderStatusIcon(mensagem.status)}
                                                {renderStatusBadge(mensagem.status)}
                                            </div>
                                            {mensagem.errorMessage && (
                                                <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                                                    {mensagem.errorMessage}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    leftIcon={<FileText className="w-4 h-4" />}
                                                    onClick={() => {
                                                        setMensagemSelecionada(mensagem);
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    Ver
                                                </Button>
                                                {mensagem.status !== 'enviado' && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        leftIcon={<RefreshCw className={`w-4 h-4 ${resendingId === mensagem._id ? 'animate-spin' : ''}`} />}
                                                        onClick={() => handleResend(mensagem._id)}
                                                        disabled={resendingId === mensagem._id}
                                                    >
                                                        {resendingId === mensagem._id ? 'Enviando...' : 'Reenviar'}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                            >
                                Anterior
                            </Button>
                            <span className="text-sm text-gray-600">
                                Página {page} de {totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </Card>
            )}

            {/* Modal de Detalhes */}
            {showModal && mensagemSelecionada && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh]overflow-y-auto"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Detalhes da Mensagem</h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Caixa</label>
                                    <p className="text-base text-gray-900 mt-1">{mensagemSelecionada.caixaNome}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Participante</label>
                                    <p className="text-base text-gray-900 mt-1">{mensagemSelecionada.participanteNome}</p>
                                    <p className="text-sm text-gray-500 mt-1">{mensagemSelecionada.participanteTelefone}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Tipo</label>
                                    <p className="text-base text-gray-900 mt-1">
                                        {tipoMensagemLabels[mensagemSelecionada.tipo] || mensagemSelecionada.tipo}
                                    </p>
                                </div>

                                {/* Identificador de Escopo para Mensagens Manuais */}
                                {mensagemSelecionada.tipo === 'manual' && mensagemSelecionada.metadata?.escopo && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Destinatário</label>
                                        <div className="mt-1">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${mensagemSelecionada.metadata.escopo === 'participante_especifico'
                                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                : mensagemSelecionada.metadata.escopo === 'apenas_admins'
                                                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                    : 'bg-green-100 text-green-700 border border-green-200'
                                                }`}>
                                                {mensagemSelecionada.metadata.escopo === 'participante_especifico'
                                                    ? '👤 Mensagem Individual'
                                                    : mensagemSelecionada.metadata.escopo === 'apenas_admins'
                                                        ? '👥 Apenas Administradores'
                                                        : '📢 Todos os Participantes'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                    <div className="mt-1">{renderStatusBadge(mensagemSelecionada.status)}</div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-500">Data de Envio</label>
                                    <p className="text-base text-gray-900 mt-1">
                                        {formatDate(mensagemSelecionada.dataEnvio || mensagemSelecionada.createdAt)} às{' '}
                                        {new Date(mensagemSelecionada.dataEnvio || mensagemSelecionada.createdAt).toLocaleTimeString(
                                            'pt-BR',
                                            {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            },
                                        )}
                                    </p>
                                </div>

                                {mensagemSelecionada.errorMessage && (
                                    <div>
                                        <label className="text-sm font-medium text-red-600">Erro</label>
                                        <p className="text-base text-red-700 mt-1 bg-red-50 p-3 rounded-lg">
                                            {mensagemSelecionada.errorMessage}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                                        Conteúdo da Mensagem
                                    </label>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                                            {mensagemSelecionada.conteudo}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button onClick={() => setShowModal(false)}>Fechar</Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal de Envio Manual */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Enviar Mensagem Manual</h3>
                                <button
                                    onClick={() => setShowManualModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Seleção de Caixa */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Caixa *
                                    </label>
                                    <select
                                        value={manualCaixaId}
                                        onChange={(e) => handleManualCaixaChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione uma caixa ativa</option>
                                        {caixasAtivos.map((caixa) => (
                                            <option key={caixa._id} value={caixa._id}>
                                                {caixa.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Escopo de Envio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Enviar para
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="escopo"
                                                value="todos"
                                                checked={manualEscopo === 'todos'}
                                                onChange={() => setManualEscopo('todos')}
                                                className="text-purple-600"
                                            />
                                            <span className="text-sm text-gray-700">Todos os participantes</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="escopo"
                                                value="participante_especifico"
                                                checked={manualEscopo === 'participante_especifico'}
                                                onChange={() => setManualEscopo('participante_especifico')}
                                                className="text-purple-600"
                                            />
                                            <span className="text-sm text-gray-700">Participante específico</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="escopo"
                                                value="apenas_admins"
                                                checked={manualEscopo === 'apenas_admins'}
                                                onChange={() => setManualEscopo('apenas_admins')}
                                                className="text-purple-600"
                                            />
                                            <span className="text-sm text-gray-700">Apenas administradores</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Seleção de Participante (se escopo específico) */}
                                {manualEscopo === 'participante_especifico' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Participante *
                                        </label>
                                        <select
                                            value={manualParticipanteId}
                                            onChange={(e) => setManualParticipanteId(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            disabled={!manualCaixaId}
                                        >
                                            <option value="">
                                                {manualCaixaId ? 'Selecione um participante' : 'Selecione uma caixa primeiro'}
                                            </option>
                                            {participantesCaixa.map((p: any) => (
                                                <option key={p._id} value={p._id}>
                                                    {p.usuarioId?.nome || 'Participante'}
                                                    {p.usuarioId?.tipo === 'admin' || p.usuarioId?.tipo === 'master' ? ' (Admin)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Mensagem */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mensagem *
                                    </label>
                                    <textarea
                                        value={manualMensagem}
                                        onChange={(e) => setManualMensagem(e.target.value)}
                                        placeholder="Digite sua mensagem aqui..."
                                        rows={5}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {manualMensagem.length} caracteres
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowManualModal(false)}
                                    disabled={sendingManual}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleSendManualMessage}
                                    disabled={sendingManual || !manualCaixaId || !manualMensagem.trim()}
                                    leftIcon={sendingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                >
                                    {sendingManual ? 'Enviando...' : 'Enviar Mensagem'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Modal de Regras de Disparo */}
            {showRegrasModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Regras de Disparo Automático</h3>
                                        <p className="text-sm text-gray-500">
                                            Entenda quando cada mensagem é enviada pelo sistema Evolution API
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRegrasModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Regra / Tipo</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Gatilho</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {regrasComunicacao.map((regra, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {regra.nome}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <Badge variant={regra.gatilho.includes('ANTES') ? 'warning' : regra.gatilho.includes('APÓS') && regra.gatilho.includes('Crítico') ? 'danger' : 'gray'} size="sm">
                                                        {regra.gatilho}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {regra.descricao}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button onClick={() => setShowRegrasModal(false)}>Fechar</Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
