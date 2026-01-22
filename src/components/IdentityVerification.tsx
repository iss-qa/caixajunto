import { motion } from 'framer-motion';
import { useRef, useState } from 'react';

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
    const iframeRef = useRef<HTMLIFrameElement>(null);

    if (!isOpen || !onboardingUrl) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl w-full h-full max-w-4xl max-h-[95vh] mx-4 flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Header fixo - Verde Juntix */}
                <div className="flex-shrink-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Verificação de Identidade</h3>
                            <p className="text-green-100 text-sm">Ambiente seguro</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Conteúdo - Expandido/Colapsado */}
                {!isIframeMode ? (
                    /* Estado inicial: Explicação completa */
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        <div className="max-w-2xl mx-auto">
                            {/* Título com ícone */}
                            <div className="flex items-start gap-3 mb-6">
                                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-green-700 mb-1">Por que verificar sua identidade?</h4>
                                    <p className="text-gray-600">
                                        A captura do documento e reconhecimento facial são <strong className="text-gray-800">obrigatórios por lei</strong> e garantem:
                                    </p>
                                </div>
                            </div>

                            {/* Lista de garantias */}
                            <ul className="space-y-3 mb-6 pl-4">
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Proteção contra fraudes e golpes</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Segurança nas suas transações financeiras</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Conformidade com as normas do Banco Central</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Transferências realizadas apenas para a conta do titular verificado</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Ambiente seguro para todos os usuários</span>
                                </li>
                            </ul>

                            {/* Texto informativo */}
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
                                <p className="text-green-700 text-sm leading-relaxed">
                                    Como o <strong>Juntix trabalha com dinheiro real</strong>, essa verificação garante que você sempre receberá seus recursos na sua própria conta bancária.
                                </p>
                            </div>

                            {/* Informações de segurança e tempo */}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span>Dados criptografados (LGPD)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Menos de 2 minutos</span>
                                </div>
                            </div>

                            {/* Label escolha */}
                            <p className="text-sm font-medium text-gray-600 mb-3">Escolha como deseja verificar:</p>

                            {/* Botões de ação */}
                            <div className="space-y-3">
                                {/* Verificar aqui (interno) */}
                                <button
                                    onClick={() => setIsIframeMode(true)}
                                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Iniciar Verificação Agora
                                </button>

                                {/* Verificar externamente */}
                                <a
                                    href={onboardingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full block text-center border-2 border-gray-200 text-gray-600 font-medium py-3 px-6 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all"
                                >
                                    Abrir em nova janela (verificação externa)
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Estado expandido: iFrame em tela cheia */
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Barra minimizada com informações */}
                        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
                            <button
                                onClick={() => setIsIframeMode(false)}
                                className="flex items-center gap-2 text-amber-700 hover:text-amber-800 text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Ver instruções
                            </button>
                            <span className="text-amber-600 text-sm">
                                Siga as instruções na tela para concluir a verificação
                            </span>
                        </div>

                        {/* iFrame com conteúdo do Lytex */}
                        <div className="flex-1 min-h-0">
                            <iframe
                                ref={iframeRef}
                                src={onboardingUrl}
                                title="Verificação de Identidade - Lytex"
                                className="w-full h-full border-0"
                                allow="camera; microphone; fullscreen"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                            />
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default IdentityVerification;
