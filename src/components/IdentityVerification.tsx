import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { subcontasService } from '../lib/api';
import { Loader2, Check, ChevronLeft, Shield, AlertTriangle, Lock, Clock, ExternalLink } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface IdentityVerificationProps {
    isOpen: boolean;
    onboardingUrl: string | null;
    onClose: () => void;
}

/**
 * Modal de Verificação de Identidade
 * 
 * Exibe um modal com explicações sobre a verificação de identidade
 * e permite ao usuário realizar a verificação internamente (iframe)
 * ou externamente (nova janela).
 */
export const IdentityVerification = ({
    isOpen,
    onboardingUrl,
    onClose,
}: IdentityVerificationProps) => {
    const [isIframeMode, setIsIframeMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showManualButton, setShowManualButton] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { setBottomNavVisible } = useUI();

    // Hide bottom nav when modal is open (mobile only)
    useEffect(() => {
        if (isOpen) {
            setBottomNavVisible(false);
        } else {
            setBottomNavVisible(true);
        }

        // Cleanup: restore bottom nav when component unmounts
        return () => {
            setBottomNavVisible(true);
        };
    }, [isOpen, setBottomNavVisible]);

    // Timer silencioso para exibir o botão manual após 3 minutos
    useEffect(() => {
        if (!isOpen) return;

        console.log('⏳ Iniciando timer de 3 minutos para botão manual...');
        const timer = setTimeout(() => {
            console.log('🕒 3 minutos passaram, exibindo botão manual.');
            setShowManualButton(true);
        }, 180000); // 180 segundos = 3 minutos

        return () => clearTimeout(timer);
    }, [isOpen]);

    // Polling de status (Pulse Check) - Verificação silenciosa
    useEffect(() => {
        if (!isOpen) return;

        const pollTimer = setInterval(async () => {
            try {
                // Check silencioso - não afeta UI a menos que verificado
                const status = await subcontasService.checkStatus();

                if (status.verified) {
                    console.log('✅ Verificação confirmada automaticamente! Recarregando...');
                    clearInterval(pollTimer);
                    setIsLoading(true); // Bloqueia UI
                    window.location.reload(); // Recarrega para atualizar status principal
                }
            } catch (error) {
                // Erros silenciosos no console para não atrapalhar o usuário
                console.warn('Silent check falhou:', error);
            }
        }, 5000); // Verifica a cada 5 segundos

        return () => clearInterval(pollTimer);
    }, [isOpen]);

    const handleComplete = async () => {
        try {
            setIsLoading(true);
            await subcontasService.updateFacialRecognition(true);
            // Redirecionar para home e forçar recarregamento para atualizar status
            window.location.href = '/';
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            setIsLoading(false);
        }
    };

    if (!isOpen || !onboardingUrl) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl sm:rounded-2xl w-full h-full sm:max-w-4xl sm:max-h-[95vh] sm:mx-4 flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Botão de Fechar removido para forçar verificação - Header movido para dentro do conteúdo */}

                {/* Conteúdo - Expandido/Colapsado */}
                {!isIframeMode ? (
                    /* Estado inicial: Explicação completa */
                    <div className="flex-1 overflow-y-auto flex flex-col">
                        {/* Header fixo - Verde Juntix (Apenas no modo inicial) */}
                        <div className="flex-shrink-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base sm:text-lg leading-tight">Verificação de Identidade</h3>
                                    <p className="text-green-100 text-xs sm:text-sm">Ambiente seguro</p>
                                </div>
                            </div>
                            <div className="w-8 sm:w-10"></div>
                        </div>

                        <div className="p-4 sm:p-6 md:p-8">
                            <div className="max-w-2xl mx-auto">
                                {/* Título com ícone */}
                                <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-base sm:text-xl font-bold text-green-700 mb-0.5 sm:mb-1">Por que verificar sua identidade?</h4>
                                        <p className="text-xs sm:text-base text-gray-600">
                                            A captura do documento e reconhecimento facial são <strong className="text-gray-800">obrigatórios por lei</strong> e garantem:
                                        </p>
                                    </div>
                                </div>

                                {/* Lista de garantias - Compactada para mobile */}
                                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 pl-2 sm:pl-4">
                                    {[
                                        'Proteção contra fraudes e golpes',
                                        'Segurança nas suas transações financeiras',
                                        'Conformidade com as normas do Banco Central',
                                        'Transferências apenas para conta do titular',
                                        'Ambiente seguro para todos os usuários'
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-start gap-2 sm:gap-3">
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600" />
                                            </div>
                                            <span className="text-xs sm:text-base text-gray-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Texto informativo - Compactado */}
                                <div className="bg-green-50 border border-green-100 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                    <p className="text-green-700 text-xs sm:text-sm leading-relaxed">
                                        Como o <strong>Juntix trabalha com dinheiro real</strong>, essa verificação garante que você sempre receberá seus recursos na sua própria conta bancária.
                                    </p>
                                </div>

                                {/* Informações de segurança e tempo - Compactado */}
                                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-8">
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                        <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">Dados criptografados</span>
                                        <span className="xs:hidden">LGPD</span>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span>~2 min</span>
                                    </div>
                                </div>

                                {/* Label escolha */}
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2 sm:mb-3">Escolha como deseja verificar:</p>

                                {/* Botões de ação */}
                                <div className="space-y-2 sm:space-y-3">
                                    {/* Verificar aqui (interno) */}
                                    <button
                                        onClick={() => setIsIframeMode(true)}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Iniciar Verificação Agora
                                    </button>

                                    {/* Verificar externamente */}
                                    <a
                                        href={onboardingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-xs sm:text-base"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Abrir em nova janela (verificação externa)</span>
                                        <span className="sm:hidden">Abrir em nova janela</span>
                                    </a>

                                    {/* Já concluí a verificação (Botão Manual com Delay) */}
                                    {showManualButton && (
                                        <motion.button
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            onClick={handleComplete}
                                            disabled={isLoading}
                                            className="w-full bg-gray-100 text-gray-700 font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                            )}
                                            {isLoading ? 'Confirmando...' : 'Já concluí a verificação'}
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Estado expandido: iFrame em tela cheia */
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Barra minimizada com informações - Compactada para mobile */}
                        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-100 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between">
                            <button
                                onClick={() => setIsIframeMode(false)}
                                className="flex items-center gap-1 sm:gap-2 text-amber-700 hover:text-amber-800 text-xs sm:text-sm font-medium"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Ver instruções</span>
                                <span className="sm:hidden">Voltar</span>
                            </button>
                            <span className="text-amber-600 text-[10px] sm:text-sm truncate ml-2">
                                <span className="hidden sm:inline">Siga as instruções na tela para concluir a verificação</span>
                                <span className="sm:hidden">Siga as instruções na tela</span>
                            </span>
                        </div>

                        {/* iFrame com conteúdo do Lytex - Maximizado */}
                        <div className="flex-1 min-h-0 relative">
                            <iframe
                                ref={iframeRef}
                                src={onboardingUrl}
                                title="Verificação de Identidade - Lytex"
                                className="w-full h-full border-0"
                                allow="camera; microphone; fullscreen"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                            />
                        </div>

                        {/* Footer Compacto - Botão minimalista para maximizar iframe */}
                        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100 p-2 sm:p-3 z-10">
                            <button
                                onClick={handleComplete}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                                <span className="hidden sm:inline">Finalizar e voltar ao início</span>
                                <span className="sm:hidden">Concluir verificação</span>
                            </button>
                            {/* Texto de ajuda removido para economizar espaço no mobile */}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default IdentityVerification;

