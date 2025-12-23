import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Shield,
    Users,
    CheckCircle,
    XCircle,
    Play,
    FileText,
    AlertCircle,
    Check,
    RefreshCw,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface ParticipanteSubcontaStatus {
    _id: string;
    nome: string;
    temSubconta: boolean;
}

interface SplitConfigStatus {
    adminTemSubconta: boolean;
    regrasSplit: boolean;
    participantesVinculados: boolean;
}

interface Participante {
    _id: string;
    usuarioId: {
        _id: string;
        nome: string;
    };
    posicao?: number;
}

interface Caixa {
    _id: string;
    nome: string;
    tipo?: string;
    valorTotal: number;
    qtdParticipantes: number;
    duracaoMeses: number;
    diaVencimento: number;
    dataInicio?: string;
}

interface ConfiguracoesObrigatoriasCaixaProps {
    // Modal Configuração Obrigatória
    showSplitConfigModal: boolean;
    setShowSplitConfigModal: (show: boolean) => void;
    splitConfigStatus: SplitConfigStatus;
    participantesSubcontasStatus: ParticipanteSubcontaStatus[];
    verificarConfiguracaoSplitDetalhada: () => void;
    usuarioTipo?: string;

    // Modal Iniciar Caixa
    showIniciarCaixa: boolean;
    setShowIniciarCaixa: (show: boolean) => void;
    caixa: Caixa;
    participantes: Participante[];
    aceiteContrato: boolean;
    setAceiteContrato: (aceite: boolean) => void;
    handleIniciarCaixa: () => void;
}

export function ConfiguracoesObrigatoriasCaixa({
    showSplitConfigModal,
    setShowSplitConfigModal,
    splitConfigStatus,
    participantesSubcontasStatus,
    verificarConfiguracaoSplitDetalhada,
    usuarioTipo,
    showIniciarCaixa,
    setShowIniciarCaixa,
    caixa,
    participantes,
    aceiteContrato,
    setAceiteContrato,
    handleIniciarCaixa,
}: ConfiguracoesObrigatoriasCaixaProps) {
    const navigate = useNavigate();
    const [recarregando, setRecarregando] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // Log quando receber novos dados
    useEffect(() => {
        console.log('📊 ConfiguracoesObrigatoriasCaixa - Props atualizadas:', {
            splitConfigStatus,
            participantesSubcontasStatus,
            totalParticipantes: participantesSubcontasStatus.length
        });
    }, [splitConfigStatus, participantesSubcontasStatus]);

    // Calcular data de término
    const dataInicio = caixa.dataInicio ? new Date(caixa.dataInicio) : new Date();
    const dataTermino = new Date(dataInicio);
    dataTermino.setMonth(dataTermino.getMonth() + caixa.duracaoMeses);

    // Verificar se configuração está completa
    const configuracaoCompleta =
        splitConfigStatus.adminTemSubconta &&
        splitConfigStatus.regrasSplit &&
        splitConfigStatus.participantesVinculados;

    // Contadores para estatísticas
    const participantesComSubconta = participantesSubcontasStatus.filter(p => p.temSubconta).length;
    const totalParticipantes = participantesSubcontasStatus.length;
    const progressoPercentual = totalParticipantes > 0
        ? (participantesComSubconta / totalParticipantes) * 100
        : 0;

    // Calcular progresso geral (3 etapas)
    const etapasCompletas =
        (splitConfigStatus.participantesVinculados ? 1 : 0) +
        (splitConfigStatus.adminTemSubconta ? 1 : 0) +
        (splitConfigStatus.regrasSplit ? 1 : 0);
    const progressoGeral = (etapasCompletas / 3) * 100;

    // Função para recarregar status
    const handleRecarregar = async () => {
        setRecarregando(true);
        console.log('🔄 Recarregando configuração...');
        await verificarConfiguracaoSplitDetalhada();
        setTimeout(() => setRecarregando(false), 500);
    };

    return (
        <>
            {/* ========================================
                MODAL: INICIAR CAIXA COM CONTRATO
                ======================================== */}
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
                    {/* Resumo em Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-green-50 rounded-xl text-center border border-green-200">
                            <p className="text-xs text-gray-500 font-medium">Nome</p>
                            <p className="font-bold text-green-700 truncate mt-1">{caixa.nome}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl text-center border border-blue-200">
                            <p className="text-xs text-gray-500 font-medium">Tipo</p>
                            <p className="font-bold text-blue-700 capitalize mt-1">{caixa.tipo || 'Mensal'}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl text-center border border-purple-200">
                            <p className="text-xs text-gray-500 font-medium">Valor Total</p>
                            <p className="font-bold text-purple-700 mt-1">{formatCurrency(caixa.valorTotal)}</p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-200">
                            <p className="text-xs text-gray-500 font-medium">Parcela</p>
                            <p className="font-bold text-amber-700 mt-1">
                                {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-indigo-50 rounded-xl text-center border border-indigo-200">
                            <p className="text-xs text-gray-500 font-medium">Participantes</p>
                            <p className="font-bold text-indigo-700 mt-1">{caixa.qtdParticipantes}</p>
                        </div>
                        <div className="p-3 bg-teal-50 rounded-xl text-center border border-teal-200">
                            <p className="text-xs text-gray-500 font-medium">Duração</p>
                            <p className="font-bold text-teal-700 mt-1">{caixa.duracaoMeses} meses</p>
                        </div>
                    </div>

                    {/* Termos e Condições */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <FileText className="w-5 h-5 text-gray-700" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">Termos e Condições</h3>
                        </div>

                        <div className="space-y-4 text-sm text-gray-700">
                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="font-semibold text-gray-900 mb-1">📅 Datas:</p>
                                <p className="text-gray-700">
                                    Início em <span className="font-medium">{formatDate(dataInicio)}</span> •
                                    Término previsto em <span className="font-medium">{formatDate(dataTermino)}</span>
                                </p>
                            </div>

                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="font-semibold text-gray-900 mb-2">👥 Participantes:</p>
                                <ol className="list-decimal list-inside ml-2 space-y-1">
                                    {participantes.map((p) => (
                                        <li key={p._id} className="text-gray-700">{p.usuarioId.nome}</li>
                                    ))}
                                </ol>
                            </div>

                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="font-semibold text-gray-900 mb-2">📋 Obrigações:</p>
                                <ul className="space-y-1.5">
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span>Pagar parcela até a data de vencimento</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                        <span>Não pagamento resulta em penalidade no score</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <span>Administrador gerencia e distribui os valores</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-lg p-3 shadow-sm">
                                <p className="font-semibold text-gray-900 mb-2">💰 Composição da Parcela:</p>
                                <ul className="space-y-2">
                                    <li className="pl-3 border-l-2 border-green-400">
                                        <span className="font-medium text-green-700">1ª Parcela:</span>{' '}
                                        {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)} + R$ 5,00 (serviço) +
                                        R$ 50,00 (fundo reserva) + R$ 50,00 (taxa administrativa)
                                    </li>
                                    <li className="pl-3 border-l-2 border-blue-400">
                                        <span className="font-medium text-blue-700">Parcelas 2-{caixa.duracaoMeses - 1}:</span>{' '}
                                        {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)} + R$ 5,00 (serviço) + IPCA
                                    </li>
                                    <li className="pl-3 border-l-2 border-purple-400">
                                        <span className="font-medium text-purple-700">Última Parcela:</span>{' '}
                                        {formatCurrency(caixa.valorTotal / caixa.qtdParticipantes)} + R$ 5,00 (serviço) +
                                        IPCA + R$ 400,00 (comissão admin)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Aceite do Contrato */}
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm">
                        <label className="flex items-start gap-3 group">
                            <input
                                type="checkbox"
                                checked={aceiteContrato}
                                onChange={(e) => setAceiteContrato(e.target.checked)}
                                className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                            />
                            <div>
                                <p className="font-bold text-gray-900">
                                    Li e aceito os{' '}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowTermsModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 underline cursor-pointer"
                                    >
                                        termos do contrato
                                    </button>
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Ao marcar, você confirma que entendeu todas as condições e concorda em cumpri-las.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3 pt-2">
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

            {/* ========================================
                MODAL: TERMOS E CONDIÇÕES
                ======================================== */}
            <Modal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                title="Termos de Uso e Condições Gerais"
                size="xl"
            >
                <div className="space-y-4">
                    {/* Scrollable content */}
                    <div className="max-h-[60vh] overflow-y-auto pr-2 text-sm text-gray-700 leading-relaxed">
                        <div className="space-y-4">
                            <p className="text-xs text-gray-500">Última atualização: Dezembro de 2024</p>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">1. DEFINIÇÕES E NATUREZA DO SERVIÇO</h2>
                                <p className="mb-2"><strong>1.1.</strong> A plataforma <strong>[NOME DO APP]</strong> é um sistema de tecnologia que facilita a organização e gestão de grupos de poupança coletiva informal ("Caixinhas") entre pessoas físicas previamente conhecidas.</p>
                                <p className="mb-2"><strong>1.2.</strong> O serviço consiste exclusivamente em:</p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Ferramenta tecnológica de organização e controle</li>
                                    <li>Processamento de pagamentos via gateway terceirizado (Lytex)</li>
                                    <li>Gestão de ordem de contemplação</li>
                                    <li>Comunicação e lembretes aos participantes</li>
                                </ul>
                                <p className="mt-2"><strong>1.3. DECLARAÇÃO IMPORTANTE:</strong> Esta plataforma <strong>NÃO é instituição financeira</strong>, <strong>NÃO oferece produtos financeiros</strong>, <strong>NÃO capta recursos do público</strong>, <strong>NÃO promete rentabilidade</strong> e <strong>NÃO realiza intermediação financeira regulada pelo Banco Central do Brasil</strong>.</p>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">2. REQUISITOS PARA PARTICIPAÇÃO</h2>
                                <p className="mb-2"><strong>2.1.</strong> Podem participar apenas:</p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Pessoas físicas maiores de 18 anos</li>
                                    <li>Residentes no território brasileiro</li>
                                    <li>Com CPF regularizado</li>
                                    <li>Indicadas ou conhecidas de participantes existentes</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">3. FUNCIONAMENTO DO CAIXINHA</h2>
                                <p className="mb-2"><strong>3.1. Estrutura Básica</strong></p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Cada grupo possui número definido de participantes</li>
                                    <li>Valor total do caixinha é dividido em parcelas mensais iguais</li>
                                    <li>Cada participante contribui mensalmente até completar o ciclo</li>
                                    <li>Um participante é contemplado por mês na ordem estabelecida</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">4. OBRIGAÇÕES DOS PARTICIPANTES</h2>
                                <p className="mb-2"><strong>4.1.</strong> O participante compromete-se a:</p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Pagar todas as parcelas nas datas estabelecidas</li>
                                    <li>Manter dados cadastrais atualizados</li>
                                    <li>Comunicar imediatamente qualquer dificuldade de pagamento</li>
                                    <li>Respeitar a ordem de contemplação</li>
                                    <li>Não transferir sua posição sem autorização</li>
                                </ul>
                                <p className="mt-2"><strong>ATENÇÃO:</strong> O participante é obrigado a pagar sua própria parcela mesmo no mês em que for contemplado.</p>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">5. PROCESSAMENTO DE PAGAMENTOS</h2>
                                <p className="mb-2"><strong>5.1.</strong> Todos os pagamentos são processados via gateway de pagamento <strong>Lytex</strong>, empresa terceirizada e devidamente autorizada.</p>
                                <p className="mb-2"><strong>5.2.</strong> A plataforma não retém, custodia ou administra os valores pagos pelos participantes, exceto Fundo de Reserva e Taxa de serviço.</p>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">6. RESPONSABILIDADES E LIMITAÇÕES</h2>
                                <p className="mb-2"><strong>6.1. A PLATAFORMA NÃO:</strong></p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>❌ Garante adimplência dos participantes</li>
                                    <li>❌ Responde por inadimplência de terceiros além do Fundo de Reserva</li>
                                    <li>❌ Oferece seguro ou garantia financeira</li>
                                    <li>❌ Atua como instituição financeira</li>
                                </ul>
                                <p className="mt-2"><strong>6.2. RISCOS ASSUMIDOS:</strong> Existe risco real de inadimplência de outros participantes. Não há cobertura do FGC ou qualquer proteção estatal.</p>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">7. POLÍTICA DE INADIMPLÊNCIA</h2>
                                <p className="mb-2"><strong>Inadimplência Grave (acima de 15 dias):</strong></p>
                                <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>Utilização do Fundo de Reserva</li>
                                    <li>Exclusão definitiva da plataforma</li>
                                    <li>Cobrança judicial do valor devido</li>
                                    <li>Possibilidade de negativação</li>
                                </ul>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-2">8. DADOS PESSOAIS E PRIVACIDADE</h2>
                                <p className="mb-2">A plataforma coleta e trata dados pessoais conforme Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p>
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mt-6">
                                <h2 className="text-lg font-bold text-blue-900 mb-3">DECLARAÇÃO DE CIÊNCIA E CONSENTIMENTO</h2>
                                <div className="space-y-2 text-sm">
                                    <p>☑ Li e compreendi integralmente as condições estabelecidas</p>
                                    <p>☑ Estou ciente de que a plataforma NÃO é instituição financeira</p>
                                    <p>☑ Entendo os riscos de inadimplência de outros participantes</p>
                                    <p>☑ Concordo com a utilização do Fundo de Reserva conforme descrito</p>
                                    <p>☑ Assumo a responsabilidade pelo pagamento de todas as parcelas</p>
                                    <p>☑ Autorizo o tratamento dos meus dados pessoais conforme LGPD</p>
                                    <p>☑ Aceito as taxas, encargos e condições de pagamento</p>
                                    <p>☑ Reconheço que não há garantia estatal ou proteção do FGC</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowTermsModal(false)}
                        >
                            Fechar
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1"
                            onClick={() => {
                                setAceiteContrato(true);
                                setShowTermsModal(false);
                            }}
                            leftIcon={<Check className="w-4 h-4" />}
                        >
                            Aceitar Termos
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ========================================
                MODAL: CONFIGURAÇÃO OBRIGATÓRIA
                ======================================== */}
            <Modal
                isOpen={showSplitConfigModal}
                onClose={() => {
                    setShowSplitConfigModal(false);
                    verificarConfiguracaoSplitDetalhada();
                }}
                title="⚙️ Configuração Obrigatória Pendente"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Header com progresso geral */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-700 font-medium">
                                Antes de iniciar as cobranças, verifique todas as etapas:
                            </p>
                            <button
                                onClick={handleRecarregar}
                                disabled={recarregando}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Recarregar status"
                            >
                                <RefreshCw className={cn(
                                    "w-4 h-4 text-blue-600",
                                    recarregando && "animate-spin"
                                )} />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                                    style={{ width: `${progressoGeral}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-gray-700">
                                {etapasCompletas}/3
                            </span>
                        </div>
                    </div>

                    {/* ========================================
                        ETAPA 1: PARTICIPANTES
                        ======================================== */}
                    <div className={cn(
                        "rounded-xl p-5 border-2 transition-all duration-300",
                        splitConfigStatus.participantesVinculados
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-sm"
                            : "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
                    )}>
                        <div className="flex items-start gap-3 mb-4">
                            <div className={cn(
                                "p-2 rounded-lg",
                                splitConfigStatus.participantesVinculados ? "bg-green-100" : "bg-red-100"
                            )}>
                                <Users className={cn(
                                    "w-5 h-5",
                                    splitConfigStatus.participantesVinculados ? "text-green-700" : "text-red-700"
                                )} />
                            </div>
                            <div className="flex-1">
                                <h4 className={cn(
                                    "font-bold text-base mb-1",
                                    splitConfigStatus.participantesVinculados ? "text-green-900" : "text-red-900"
                                )}>
                                    1.  Participantes
                                </h4>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                                        splitConfigStatus.participantesVinculados
                                            ? "bg-green-200 text-green-800"
                                            : "bg-red-200 text-red-800"
                                    )}>
                                        {participantesComSubconta}/{totalParticipantes} completos
                                    </span>
                                    {totalParticipantes > 0 && (
                                        <span className="text-xs text-gray-600">
                                            ({progressoPercentual.toFixed(0)}%)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={cn(
                                "text-2xl font-bold",
                                splitConfigStatus.participantesVinculados ? "text-green-600" : "text-gray-300"
                            )}>
                                {splitConfigStatus.participantesVinculados ? '✓' : '○'}
                            </div>
                        </div>

                        <div className="bg-white/60 rounded-lg p-3 mb-3">
                            <p className="text-sm text-gray-700 font-medium mb-2">
                                ✓ Status das subcontas dos participantes
                            </p>

                            {/* Lista detalhada de participantes */}
                            {participantesSubcontasStatus.length > 0 ? (
                                <div className="space-y-2 mt-3">
                                    {participantesSubcontasStatus.map((p) => (
                                        <div
                                            key={p._id}
                                            className={cn(
                                                "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                                                p.temSubconta
                                                    ? "bg-green-50 border border-green-200"
                                                    : "bg-red-50 border border-red-200"
                                            )}
                                        >
                                            {p.temSubconta ? (
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                            )}
                                            <span className={cn(
                                                "font-medium text-sm flex-1",
                                                p.temSubconta ? 'text-green-800' : 'text-red-800'
                                            )}>
                                                {p.nome}
                                            </span>
                                            {p.temSubconta && (
                                                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                                                    Configurado
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    Nenhum participante encontrado. Recarregue a página.
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Atenção:</strong> Os participantes receberão um email e precisarão
                                    acessar suas contas para configurar as subcontas no sistema de pagamento (Lytex).
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* ========================================
                        ETAPA 2: ADMINISTRADOR
                        ======================================== */}
                    <div className={cn(
                        "rounded-xl p-5 border-2 transition-all duration-300",
                        splitConfigStatus.adminTemSubconta
                            ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 shadow-sm"
                            : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
                    )}>
                        <div className="flex items-start gap-3 mb-3">
                            <div className={cn(
                                "p-2 rounded-lg",
                                splitConfigStatus.adminTemSubconta ? "bg-blue-100" : "bg-gray-100"
                            )}>
                                <User className={cn(
                                    "w-5 h-5",
                                    splitConfigStatus.adminTemSubconta ? "text-blue-700" : "text-gray-500"
                                )} />
                            </div>
                            <div className="flex-1">
                                <h4 className={cn(
                                    "font-bold text-base",
                                    splitConfigStatus.adminTemSubconta ? "text-blue-900" : "text-gray-700"
                                )}>
                                    2.  Administrador/Gestor
                                </h4>
                            </div>
                            <div className={cn(
                                "text-2xl font-bold",
                                splitConfigStatus.adminTemSubconta ? "text-blue-600" : "text-gray-300"
                            )}>
                                {splitConfigStatus.adminTemSubconta ? '✓' : '○'}
                            </div>
                        </div>

                        <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                <Check className={cn(
                                    "w-4 h-4",
                                    splitConfigStatus.adminTemSubconta ? "text-blue-600" : "text-gray-400"
                                )} />
                                Subconta criada no sistema de pagamento (Lytex)
                            </p>
                        </div>
                    </div>

                    {/* ========================================
                        ETAPA 3: ADMIN MASTER
                        ======================================== */}
                    <div className={cn(
                        "rounded-xl p-5 border-2 transition-all duration-300",
                        splitConfigStatus.regrasSplit
                            ? "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-300 shadow-sm"
                            : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
                    )}>
                        <div className="flex items-start gap-3 mb-3">
                            <div className={cn(
                                "p-2 rounded-lg",
                                splitConfigStatus.regrasSplit ? "bg-purple-100" : "bg-gray-100"
                            )}>
                                <Shield className={cn(
                                    "w-5 h-5",
                                    splitConfigStatus.regrasSplit ? "text-purple-700" : "text-gray-500"
                                )} />
                            </div>
                            <div className="flex-1">
                                <h4 className={cn(
                                    "font-bold text-base",
                                    splitConfigStatus.regrasSplit ? "text-purple-900" : "text-gray-700"
                                )}>
                                    3.  Administrador Master
                                </h4>
                            </div>
                            <div className={cn(
                                "text-2xl font-bold",
                                splitConfigStatus.regrasSplit ? "text-purple-600" : "text-gray-300"
                            )}>
                                {splitConfigStatus.regrasSplit ? '✓' : '○'}
                            </div>
                        </div>

                        <div className="bg-white/60 rounded-lg p-3">
                            <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                <Check className={cn(
                                    "w-4 h-4",
                                    splitConfigStatus.regrasSplit ? "text-purple-600" : "text-gray-400"
                                )} />
                                Regras de split definidas (taxas, bônus, fundo de reserva)
                            </p>
                        </div>
                    </div>

                    {/* ========================================
                        STATUS FINAL
                        ======================================== */}
                    <div className={cn(
                        "border-2 rounded-xl p-4 transition-all duration-300",
                        configuracaoCompleta
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg"
                            : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300"
                    )}>
                        <div className="flex items-center gap-3">
                            {configuracaoCompleta ? (
                                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                            )}
                            <div>
                                <p className={cn(
                                    "font-bold text-base",
                                    configuracaoCompleta ? "text-green-900" : "text-amber-900"
                                )}>
                                    {configuracaoCompleta
                                        ? '🎉 Configuração Completa!'
                                        : '⏳ Configuração Incompleta'
                                    }
                                </p>
                                {!configuracaoCompleta && (
                                    <p className="text-sm text-amber-700 mt-1">
                                        {usuarioTipo === 'master'
                                            ? 'Configure os itens pendentes para iniciar a caixa.'
                                            : 'Aguardando configuração do Administrador Master.'
                                        }
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3 pt-2">
                        {configuracaoCompleta ? (
                            <>
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowSplitConfigModal(false)}
                                >
                                    Fechar
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                    onClick={handleIniciarCaixa}
                                >
                                    🚀 Iniciar Caixa
                                </Button>
                            </>
                        ) : usuarioTipo === 'master' ? (
                            <>
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowSplitConfigModal(false)}
                                >
                                    Fechar
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={() => {
                                        navigate('/painel-master/split');
                                        setShowSplitConfigModal(false);
                                    }}
                                >
                                    Ir para Configurações
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowSplitConfigModal(false)}
                            >
                                Fechar
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}