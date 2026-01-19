import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Percent,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Users,
    Globe,
    User,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';

interface Faixa {
    min: number;
    max: number | null;
    percentual: number;
}

interface RegraComissao {
    _id: string;
    adminId: { _id: string; nome: string; email: string; caixasConcluidos: number } | null;
    faixas: Faixa[];
    ativo: boolean;
    descricao?: string;
    createdAt: string;
}

interface Administrador {
    _id: string;
    nome: string;
    email: string;
    caixasConcluidos: number;
}

const faixasPadrao: Faixa[] = [
    { min: 1, max: 2, percentual: 0.05 },
    { min: 3, max: 5, percentual: 0.08 },
    { min: 6, max: null, percentual: 0.10 },
];

export function GerenciarComissoes() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [regras, setRegras] = useState<RegraComissao[]>([]);
    const [administradores, setAdministradores] = useState<Administrador[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [selectedRegra, setSelectedRegra] = useState<RegraComissao | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Form state
    const [formTipo, setFormTipo] = useState<'global' | 'admin'>('global');
    const [formAdminId, setFormAdminId] = useState('');
    const [formFaixas, setFormFaixas] = useState<Faixa[]>(faixasPadrao);
    const [formDescricao, setFormDescricao] = useState('');
    const [formAtivo, setFormAtivo] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [regrasRes, adminsRes] = await Promise.all([
                api.get('/regras-comissao'),
                api.get('/usuarios?tipo=administrador'),
            ]);
            setRegras(regrasRes.data);
            setAdministradores(adminsRes.data.usuarios || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setErrorMessage('Erro ao carregar dados. Tente novamente.');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormTipo('global');
        setFormAdminId('');
        setFormFaixas(faixasPadrao);
        setFormDescricao('');
        setFormAtivo(true);
        setSelectedRegra(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (regra: RegraComissao) => {
        setSelectedRegra(regra);
        setFormTipo(regra.adminId ? 'admin' : 'global');
        setFormAdminId(regra.adminId?._id || '');
        setFormFaixas(regra.faixas.map(f => ({ ...f })));
        setFormDescricao(regra.descricao || '');
        setFormAtivo(regra.ativo);
        setShowModal(true);
    };

    const openDeleteModal = (regra: RegraComissao) => {
        setSelectedRegra(regra);
        setShowDeleteModal(true);
    };

    const handleAddFaixa = () => {
        const lastFaixa = formFaixas[formFaixas.length - 1];
        const newMin = lastFaixa ? (lastFaixa.max || lastFaixa.min) + 1 : 1;
        setFormFaixas([...formFaixas, { min: newMin, max: null, percentual: 0.1 }]);
    };

    const handleRemoveFaixa = (index: number) => {
        if (formFaixas.length > 1) {
            setFormFaixas(formFaixas.filter((_, i) => i !== index));
        }
    };

    const handleFaixaChange = (index: number, field: keyof Faixa, value: string) => {
        const newFaixas = [...formFaixas];
        if (field === 'percentual') {
            // Convert percentage input (1-100) to decimal (0-1)
            newFaixas[index].percentual = Math.min(100, Math.max(0, parseFloat(value) || 0)) / 100;
        } else if (field === 'max') {
            newFaixas[index].max = value === '' ? null : parseInt(value, 10);
        } else {
            newFaixas[index].min = parseInt(value, 10) || 1;
        }
        setFormFaixas(newFaixas);
    };

    const handleSubmit = async () => {
        try {
            setActionLoading(true);

            const payload = {
                adminId: formTipo === 'admin' ? formAdminId : null,
                faixas: formFaixas,
                descricao: formDescricao || undefined,
                ativo: formAtivo,
            };

            if (selectedRegra) {
                await api.put(`/regras-comissao/${selectedRegra._id}`, payload);
                setSuccessMessage('Regra de comissão atualizada com sucesso!');
            } else {
                await api.post('/regras-comissao', payload);
                setSuccessMessage('Regra de comissão criada com sucesso!');
            }

            await loadData();
            setShowModal(false);
            resetForm();
            setShowSuccessModal(true);
        } catch (error: any) {
            setShowModal(false);
            setErrorMessage(error.response?.data?.message || 'Erro ao salvar regra de comissão');
            setShowErrorModal(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedRegra) return;

        try {
            setActionLoading(true);
            await api.delete(`/regras-comissao/${selectedRegra._id}`);
            await loadData();
            setShowDeleteModal(false);
            setSuccessMessage('Regra de comissão removida com sucesso!');
            setShowSuccessModal(true);
            setSelectedRegra(null);
        } catch (error: any) {
            setShowDeleteModal(false);
            setErrorMessage(error.response?.data?.message || 'Erro ao remover regra de comissão');
            setShowErrorModal(true);
        } finally {
            setActionLoading(false);
        }
    };

    const formatPercentual = (value: number) => `${(value * 100).toFixed(0)}%`;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => navigate('/painel-master')}
                >
                    Voltar
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Regras de Comissão</h1>
                    <p className="text-sm text-gray-500">
                        Configure as taxas de comissão para administradores baseado no número de caixas concluídos
                    </p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={openCreateModal}
                >
                    Nova Regra
                </Button>
            </div>

            {/* Info Card */}
            <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800">
                            <strong>Como funciona:</strong> A comissão do administrador é calculada dinamicamente
                            baseado no número de caixas que ele concluiu com sucesso. Configure faixas de
                            quantidade de caixas e o percentual correspondente.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Regras específicas de um admin têm prioridade sobre a regra global.
                            Se nenhuma regra existir, aplica-se 10% como padrão.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && regras.length === 0 && (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Percent className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhuma regra configurada
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Crie uma regra de comissão para definir as taxas dos administradores.
                    </p>
                    <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                        Criar Regra
                    </Button>
                </Card>
            )}

            {/* Rules List */}
            {!loading && regras.length > 0 && (
                <div className="space-y-4">
                    {regras.map((regra) => (
                        <motion.div key={regra._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${regra.adminId ? 'bg-purple-100' : 'bg-green-100'
                                            }`}>
                                            {regra.adminId ? (
                                                <User className="w-5 h-5 text-purple-600" />
                                            ) : (
                                                <Globe className="w-5 h-5 text-green-600" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900">
                                                    {regra.adminId ? regra.adminId.nome : 'Regra Global'}
                                                </span>
                                                <Badge variant={regra.ativo ? 'success' : 'gray'} size="sm">
                                                    {regra.ativo ? 'Ativa' : 'Inativa'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {regra.adminId
                                                    ? `${regra.adminId.email} • ${regra.adminId.caixasConcluidos || 0} caixas concluídos`
                                                    : 'Aplica-se a todos os administradores sem regra específica'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<Edit2 className="w-4 h-4" />}
                                            onClick={() => openEditModal(regra)}
                                        >
                                            Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
                                            onClick={() => openDeleteModal(regra)}
                                            className="text-red-500 hover:bg-red-50"
                                        >
                                            Excluir
                                        </Button>
                                    </div>
                                </div>

                                {/* Faixas Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {regra.faixas.map((faixa, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                        >
                                            <div className="text-xs text-gray-500 mb-1">
                                                {faixa.max === null
                                                    ? `${faixa.min}+ caixas`
                                                    : `${faixa.min} a ${faixa.max} caixas`}
                                            </div>
                                            <div className="text-2xl font-bold text-primary-600">
                                                {formatPercentual(faixa.percentual)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {regra.descricao && (
                                    <p className="text-sm text-gray-500 mt-4 italic">{regra.descricao}</p>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {selectedRegra ? 'Editar Regra' : 'Nova Regra de Comissão'}
                        </h3>

                        {/* Tipo de Regra */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Regra
                            </label>
                            <div className="flex gap-2">
                                <Button
                                    variant={formTipo === 'global' ? 'primary' : 'ghost'}
                                    size="sm"
                                    leftIcon={<Globe className="w-4 h-4" />}
                                    onClick={() => setFormTipo('global')}
                                    className={formTipo === 'global' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                    Global
                                </Button>
                                <Button
                                    variant={formTipo === 'admin' ? 'primary' : 'ghost'}
                                    size="sm"
                                    leftIcon={<User className="w-4 h-4" />}
                                    onClick={() => setFormTipo('admin')}
                                    className={formTipo === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                                >
                                    Administrador Específico
                                </Button>
                            </div>
                        </div>

                        {/* Admin Selector */}
                        {formTipo === 'admin' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Administrador
                                </label>
                                <select
                                    value={formAdminId}
                                    onChange={(e) => setFormAdminId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Selecione um administrador</option>
                                    {administradores.map((admin) => (
                                        <option key={admin._id} value={admin._id}>
                                            {admin.nome} ({admin.caixasConcluidos || 0} caixas)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Faixas */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Faixas de Comissão
                                </label>
                                <Button variant="ghost" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddFaixa}>
                                    Adicionar
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {formFaixas.map((faixa, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                        <div className="flex-1 grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-500">Mín. Caixas</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={faixa.min}
                                                    onChange={(e) => handleFaixaChange(idx, 'min', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Máx. Caixas</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={faixa.max === null ? '' : faixa.max}
                                                    onChange={(e) => handleFaixaChange(idx, 'max', e.target.value)}
                                                    placeholder="∞"
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">% Comissão</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.5"
                                                    value={(faixa.percentual * 100).toFixed(0)}
                                                    onChange={(e) => handleFaixaChange(idx, 'percentual', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                        {formFaixas.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveFaixa(idx)}
                                                className="text-red-500 hover:bg-red-50 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Descrição */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descrição (opcional)
                            </label>
                            <input
                                type="text"
                                value={formDescricao}
                                onChange={(e) => setFormDescricao(e.target.value)}
                                placeholder="Ex: Faixas padrão para 2024"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {/* Ativo */}
                        <div className="mb-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formAtivo}
                                    onChange={(e) => setFormAtivo(e.target.checked)}
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700">Regra ativa</span>
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleSubmit}
                                isLoading={actionLoading}
                                disabled={formTipo === 'admin' && !formAdminId}
                            >
                                {selectedRegra ? 'Salvar Alterações' : 'Criar Regra'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedRegra && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Excluir Regra</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Tem certeza que deseja excluir esta regra de comissão
                                    {selectedRegra.adminId
                                        ? ` para ${selectedRegra.adminId.nome}`
                                        : ' global'}?
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedRegra(null);
                                }}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1"
                                onClick={handleDelete}
                                isLoading={actionLoading}
                            >
                                Confirmar Exclusão
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sucesso!</h3>
                            <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
                            <Button
                                variant="primary"
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => setShowSuccessModal(false)}
                            >
                                OK
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro</h3>
                            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
                            <Button
                                variant="danger"
                                className="w-full"
                                onClick={() => setShowErrorModal(false)}
                            >
                                Fechar
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
