import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Shield,
    Users,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink,
    Copy,
    Check,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface TaxaAdesaoData {
    status: 'pendente' | 'pago' | 'isento';
    linkBoleto?: string;
    linkCheckout?: string;
    pixQrCode?: string;
    pixCopiaECola?: string;
    dataPagamento?: string;
    isentoPorNome?: string;
    dataIsencao?: string;
}

export function TaxaAdesao() {
    const navigate = useNavigate();
    const { usuario, recarregarUsuario } = useAuth();
    const [loading, setLoading] = useState(true);
    const [gerando, setGerando] = useState(false);
    const [taxaData, setTaxaData] = useState<TaxaAdesaoData | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (usuario?._id) {
            carregarStatus();
        }
    }, [usuario?._id]);

    const carregarStatus = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/usuarios/administradores/${usuario?._id}/taxa-adesao/status`);
            setTaxaData(response.data);
        } catch (err: any) {
            console.error('Erro ao carregar status:', err);
            // Se não tem dados, considera pendente
            setTaxaData({ status: 'pendente' });
        } finally {
            setLoading(false);
        }
    };

    const gerarFatura = async () => {
        try {
            setGerando(true);
            setError(null);
            const response = await api.post(`/usuarios/administradores/${usuario?._id}/taxa-adesao/gerar`);
            setTaxaData({
                ...taxaData,
                status: 'pendente',
                linkBoleto: response.data.linkBoleto,
                linkCheckout: response.data.linkCheckout,
                pixQrCode: response.data.pixQrCode,
                pixCopiaECola: response.data.pixCopiaECola,
            });
        } catch (err: any) {
            console.error('Erro ao gerar fatura:', err);
            setError(err.response?.data?.message || 'Erro ao gerar fatura. Tente novamente.');
        } finally {
            setGerando(false);
        }
    };

    const copiarPix = async () => {
        if (taxaData?.pixCopiaECola) {
            await navigator.clipboard.writeText(taxaData.pixCopiaECola);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 3000);
        }
    };

    const abrirBoleto = () => {
        if (taxaData?.linkBoleto) {
            window.open(taxaData.linkBoleto, '_blank');
        }
    };

    // Se taxa já paga ou isento, recarregar usuário e redirecionar para dashboard
    useEffect(() => {
        if (taxaData?.status === 'pago' || taxaData?.status === 'isento') {
            // Recarregar dados do usuário para atualizar o contexto
            recarregarUsuario().then(() => {
                setTimeout(() => navigate('/dashboard'), 1500);
            });
        }
    }, [taxaData?.status, navigate, recarregarUsuario]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </div>
        );
    }

    // Tela de sucesso - Taxa paga ou isenta
    if (taxaData?.status === 'pago' || taxaData?.status === 'isento') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {taxaData.status === 'pago' ? 'Taxa de Adesão Paga!' : 'Você está Isento!'}
                    </h1>
                    <p className="text-gray-600 mb-6">
                        {taxaData.status === 'pago'
                            ? 'Obrigado! Sua taxa de adesão foi confirmada.'
                            : `Você foi isento da taxa por ${taxaData.isentoPorNome || 'um administrador master'}.`}
                    </p>
                    <p className="text-sm text-gray-500">Redirecionando para o painel...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Taxa de Adesão Juntix
                    </h1>
                    <Badge variant="warning" size="sm">R$ 100,00 - Pagamento Único</Badge>
                </motion.div>

                {/* Explicação */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Por que cobramos essa taxa?
                        </h2>

                        <div className="space-y-4 text-sm text-gray-700">
                            <p>
                                Como administrador, você tem a <strong>responsabilidade de recrutar e selecionar participantes confiáveis e adimplentes do seu círculo de relacionamento</strong> para participar dos seus caixas.
                                Cada participante que cria uma subconta financeira gera um custo de <strong>R$ 10,00</strong> para a Juntix (pagamos ao gatway de pagamentos para realizar o reconhecimento facial, validação de documentos, etc. e adequar as boas práticas do mercado).
                            </p>

                            <p>
                                <strong>Participantes que não seguem até o fim do caixa ou que são inadimplentes geram prejuízos para a plataforma.</strong> Por isso, cobramos esta taxa de adesão única de <strong>R$ 100,00</strong> para criar um senso de responsabilidade e comprometimento com a gestão do caixa.
                            </p>

                            <p>
                                <strong>Importante:</strong> Para receber sua comissão como administrador, o caixa precisa ser completado com sucesso. Portanto, escolha seus participantes com critério e acompanhe a evolução do grupo atentamente.
                            </p>

                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="font-medium text-blue-900 mb-2">✅ O que a taxa cobre:</p>
                                <ul className="space-y-1 text-blue-800">
                                    <li>• Custo dos <strong>10 primeiros participantes</strong> do seu caixa</li>
                                    <li>• Acesso completo à plataforma para criar quantos caixas desejar</li>
                                    <li>• Participantes adicionais são cobertos pela Juntix</li>
                                </ul>
                            </div>

                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <p className="font-medium text-green-900 mb-3">🎯 Benefícios para você:</p>

                                <div className="bg-white rounded-md p-4 mb-3 border border-green-100">
                                    <p className="text-sm font-medium text-green-900 mb-3 text-center">Comissão por caixa completado:</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                                            <div className="text-2xl font-bold text-green-600 mb-1">5%</div>
                                            <div className="text-gray-600 text-xs">1 a 2 caixas</div>
                                        </div>
                                        <div className="text-center p-2 bg-green-100 rounded border border-green-300">
                                            <div className="text-2xl font-bold text-green-700 mb-1">8%</div>
                                            <div className="text-gray-600 text-xs">3 a 5 caixas</div>
                                        </div>
                                        <div className="text-center p-2 bg-green-200 rounded border border-green-400">
                                            <div className="text-2xl font-bold text-green-800 mb-1">10%</div>
                                            <div className="text-gray-600 text-xs">6+ caixas</div>
                                        </div>
                                    </div>
                                </div>

                                <ul className="space-y-1 text-green-800 text-sm">
                                    <li>• Gerencie múltiplos caixas simultaneamente</li>
                                    <li>• Tudo é automatizado, sua responsabilidade na prática após o recrutamente é cobrar os participantes em caso de inadimplência</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Card de Pagamento */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <div className="text-center">
                            <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Taxa de Adesão
                            </h3>
                            <p className="text-4xl font-bold text-green-600 mb-4">
                                R$ 100,00
                            </p>
                            <p className="text-sm text-gray-600 mb-6">
                                Pagamento único • Pix ou Boleto
                            </p>

                            {error && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Se ainda não gerou fatura */}
                            {!taxaData?.linkBoleto && (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={gerarFatura}
                                    isLoading={gerando}
                                    leftIcon={<CreditCard className="w-5 h-5" />}
                                >
                                    Gerar Boleto / PIX
                                </Button>
                            )}

                            {/* Se já gerou fatura, mostrar opções de pagamento */}
                            {taxaData?.linkBoleto && (
                                <div className="space-y-4">
                                    {/* PIX */}
                                    {taxaData.pixCopiaECola && (
                                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                                            <p className="font-semibold text-gray-900 mb-2">📱 Pagar com PIX</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={taxaData.pixCopiaECola.substring(0, 40) + '...'}
                                                    readOnly
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                                />
                                                <Button
                                                    variant={copiado ? 'primary' : 'secondary'}
                                                    size="sm"
                                                    onClick={copiarPix}
                                                    leftIcon={copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                >
                                                    {copiado ? 'Copiado!' : 'Copiar'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Boleto */}
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        className="w-full"
                                        onClick={abrirBoleto}
                                        leftIcon={<ExternalLink className="w-5 h-5" />}
                                    >
                                        Visualizar QR CODE - PIX ou BOLETO
                                    </Button>

                                    <p className="text-xs text-gray-500 mt-4">
                                        Após o pagamento, aguarde alguns minutos para a confirmação automática.
                                        <br />
                                        Em caso de dúvidas, entre em contato com o suporte.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>

                {/* Aviso */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-sm text-gray-500"
                >
                    <p>
                        Enquanto a taxa não for paga, você poderá acessar apenas a página inicial.
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => navigate('/dashboard')}
                    >
                        Voltar para Home
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
