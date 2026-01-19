import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function Seguranca() {
    const navigate = useNavigate();
    const [senhaAtual, setSenhaAtual] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
    const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
    const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validações
        if (!senhaAtual || !novaSenha || !confirmarSenha) {
            setError('Todos os campos são obrigatórios');
            return;
        }

        if (novaSenha.length < 6) {
            setError('A nova senha deve ter no mínimo 6 caracteres');
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setError('As senhas não coincidem');
            return;
        }

        if (senhaAtual === novaSenha) {
            setError('A nova senha deve ser diferente da senha atual');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            await axios.patch(
                `${API_URL}/auth/change-password`,
                {
                    senhaAtual,
                    novaSenha,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSuccess(true);
            setSenhaAtual('');
            setNovaSenha('');
            setConfirmarSenha('');

            // Redirecionar após 2 segundos
            setTimeout(() => {
                navigate('/perfil');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao alterar senha. Verifique sua senha atual.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/perfil')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Voltar para Perfil</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Segurança</h1>
                            <p className="text-gray-500">Gerencie a segurança da sua conta</p>
                        </div>
                    </div>
                </div>

                {/* Alterar Senha Card */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
                            <p className="text-sm text-gray-500">Mantenha sua conta segura com uma senha forte</p>
                        </div>
                    </div>

                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-8"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Senha Alterada!</h3>
                            <p className="text-gray-600 mb-4">
                                Sua senha foi alterada com sucesso.
                            </p>
                            <p className="text-sm text-gray-500">
                                Redirecionando para o perfil...
                            </p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Senha Atual */}
                            <div className="relative">
                                <Input
                                    label="Senha Atual"
                                    type={mostrarSenhaAtual ? 'text' : 'password'}
                                    placeholder="Digite sua senha atual"
                                    value={senhaAtual}
                                    onChange={(e) => setSenhaAtual(e.target.value)}
                                    leftIcon={<Lock className="w-4 h-4" />}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                                    style={{ width: '44px', height: '44px' }}
                                    aria-label={mostrarSenhaAtual ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {mostrarSenhaAtual ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Nova Senha */}
                            <div className="relative">
                                <Input
                                    label="Nova Senha"
                                    type={mostrarNovaSenha ? 'text' : 'password'}
                                    placeholder="Digite sua nova senha"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    leftIcon={<Lock className="w-4 h-4" />}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                                    style={{ width: '44px', height: '44px' }}
                                    aria-label={mostrarNovaSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {mostrarNovaSenha ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Confirmar Nova Senha */}
                            <div className="relative">
                                <Input
                                    label="Confirmar Nova Senha"
                                    type={mostrarConfirmarSenha ? 'text' : 'password'}
                                    placeholder="Digite novamente a nova senha"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    leftIcon={<Lock className="w-4 h-4" />}
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                                    style={{ width: '44px', height: '44px' }}
                                    aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {mostrarConfirmarSenha ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Dicas de Senha */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Dicas para uma senha forte:</p>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Mínimo de 6 caracteres</li>
                                    <li>• Use letras maiúsculas e minúsculas</li>
                                    <li>• Inclua números e caracteres especiais</li>
                                    <li>• Evite informações pessoais óbvias</li>
                                </ul>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate('/perfil')}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1"
                                    isLoading={loading}
                                >
                                    Alterar Senha
                                </Button>
                            </div>
                        </form>
                    )}
                </Card>

                {/* Informações de Segurança */}
                <Card className="p-6 mt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Informações de Segurança</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">Suas informações estão protegidas</p>
                                <p className="text-gray-500">Utilizamos criptografia de ponta para proteger seus dados</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">Altere sua senha regularmente</p>
                                <p className="text-gray-500">Recomendamos trocar sua senha a cada 3 meses</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
