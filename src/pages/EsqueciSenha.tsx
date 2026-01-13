import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Phone, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import axios from 'axios';
import { formatPhone, unformatPhone } from '../lib/phoneMask';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function EsqueciSenha() {
    const [telefone, setTelefone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!telefone) {
            setError('Por favor, informe seu telefone');
            return;
        }

        try {
            setLoading(true);
            // Enviar telefone sem formatação
            await axios.post(`${API_URL}/auth/esqueci-senha`, {
                telefone: unformatPhone(telefone)
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao processar solicitação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                        className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
                    >
                        <Users className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">Juntix</h1>
                    <p className="text-white/80">Junte seus amigos e realize seus sonhos</p>
                </div>

                {/* Forgot Password Form */}
                <Card className="p-6 md:p-8">
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Enviado!</h2>
                            <p className="text-gray-600 mb-6">
                                Uma nova senha foi enviada para o WhatsApp <strong>{telefone}</strong>.
                                Verifique suas mensagens.
                            </p>
                            <Link to="/login">
                                <Button variant="primary" className="w-full">
                                    Voltar para Login
                                </Button>
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <Link to="/login" className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </Link>
                                <h2 className="text-2xl font-bold text-gray-900">Esqueci minha senha</h2>
                            </div>
                            <p className="text-gray-500 mb-6">
                                Informe seu telefone cadastrado e enviaremos uma nova senha via WhatsApp.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Telefone (WhatsApp)"
                                    type="tel"
                                    placeholder="(11) 99999-9999"
                                    value={telefone}
                                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                                    leftIcon={<Phone className="w-4 h-4" />}
                                    maxLength={15}
                                    error={error && !telefone ? 'Telefone é obrigatório' : undefined}
                                />

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

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    isLoading={loading}
                                >
                                    Enviar nova senha
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-gray-500">
                                    Lembrou a senha?{' '}
                                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                                        Fazer login
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </Card>

                {/* Support */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 text-center"
                >
                    <p className="text-white/60 text-sm">
                        Precisa de ajuda? <a href="mailto:suporte@juntix.com.br" className="text-white/80 hover:text-white underline">suporte@juntix.com.br</a>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
