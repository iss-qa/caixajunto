import { useState, useEffect } from 'react';
import axios from 'axios';

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
        email?: string;
    } | string;
}

interface SubcontaAPI {
    _id: string;
    accountId?: string;
    lytexId?: string;
    name: string;
    email: string;
    type?: string;
    usuarioId?: string;
}

export function useCaixaConfiguracao(
    caixaId: string,
    participantes: Participante[],
    adminId: string,
    adminEmail?: string,
    adminNome?: string
) {
    const [splitConfigStatus, setSplitConfigStatus] = useState<SplitConfigStatus>({
        adminTemSubconta: false,
        regrasSplit: false,
        participantesVinculados: false,
    });

    const [participantesSubcontasStatus, setParticipantesSubcontasStatus] = useState<ParticipanteSubcontaStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Busca todas as subcontas do sistema via API
     */
    const buscarSubcontas = async (): Promise<SubcontaAPI[]> => {
        try {
            const token = localStorage.getItem('token');

            console.log('📡 Fazendo requisição para /api/subcontas...');

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await axios.get(`${API_URL}/subcontas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('📡 Resposta completa da API:', response);
            console.log('📡 response.data:', response.data);
            console.log('📡 Tipo:', typeof response.data);
            console.log('📡 É array?', Array.isArray(response.data));

            // Garantir que sempre retornamos um array
            if (!response.data) {
                console.warn('⚠️ API retornou dados vazios');
                return [];
            }

            // Se response.data for um objeto com propriedade aninhada
            if (typeof response.data === 'object' && !Array.isArray(response.data)) {
                if (Array.isArray(response.data.data)) {
                    console.log('✅ Subcontas em response.data.data');
                    return response.data.data;
                }
                if (Array.isArray(response.data.subcontas)) {
                    console.log('✅ Subcontas em response.data.subcontas');
                    return response.data.subcontas;
                }
            }

            // Se já for um array direto
            if (Array.isArray(response.data)) {
                console.log('✅ response.data é array direto');
                return response.data;
            }

            console.warn('⚠️ Formato inesperado:', response.data);
            return [];

        } catch (err: any) {
            console.error('❌ Erro ao buscar subcontas:', err);
            console.error('❌ Detalhes:', err.response?.data);
            throw err;
        }
    };

    /**
     * Verifica se um usuário possui subconta criada
     * Compara por: usuarioId, _id, email e nome
     */
    const verificarSubcontaUsuario = (
        usuarioId: string,
        usuarioEmail: string | undefined,
        usuarioNome: string,
        subcontas: SubcontaAPI[]
    ): boolean => {
        console.log(`\n🔍 === VERIFICANDO SUBCONTA ===`);
        console.log(`🔍 Dados do usuário:`, {
            usuarioId,
            usuarioEmail,
            usuarioNome
        });
        console.log(`🔍 Total de subcontas: ${subcontas.length}`);

        if (!usuarioId && !usuarioEmail && !usuarioNome) {
            console.warn('⚠️ Nenhum dado para comparação!');
            return false;
        }

        if (!Array.isArray(subcontas) || subcontas.length === 0) {
            console.warn('⚠️ Nenhuma subconta disponível');
            return false;
        }

        // Log detalhado de cada subconta
        subcontas.forEach((sub, idx) => {
            console.log(`📋 Subconta ${idx + 1}:`, {
                _id: sub._id,
                email: sub.email,
                name: sub.name,
                type: sub.type,
                usuarioId: sub.usuarioId,
                accountId: sub.accountId
            });
        });

        // Normalizar strings para comparação (remover acentos, lowercase, trim)
        const normalizar = (str: string) => {
            return str
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim();
        };

        const nomeNormalizado = normalizar(usuarioNome);
        const emailNormalizado = usuarioEmail ? normalizar(usuarioEmail) : null;

        console.log('🔍 Comparando com:', {
            nomeNormalizado,
            emailNormalizado
        });

        const temSubconta = subcontas.some((subconta) => {
            // 1. Comparar por usuarioId (se existir)
            if (subconta.usuarioId && subconta.usuarioId === usuarioId) {
                console.log(`✅ MATCH por usuarioId! Subconta: ${subconta.email}`);
                return true;
            }

            // 2. Comparar por _id da subconta
            if (subconta._id === usuarioId) {
                console.log(`✅ MATCH por _id! Subconta: ${subconta.email}`);
                return true;
            }

            // 3. Comparar por EMAIL (match exato)
            if (emailNormalizado && subconta.email) {
                const subcontaEmail = normalizar(subconta.email);
                if (subcontaEmail === emailNormalizado) {
                    console.log(`✅ MATCH por EMAIL! ${subconta.email} === ${usuarioEmail}`);
                    return true;
                }
            }

            // 4. Comparar por NOME (match exato ou similar)
            if (subconta.name) {
                const subcontaNome = normalizar(subconta.name);

                // Match exato
                if (subcontaNome === nomeNormalizado) {
                    console.log(`✅ MATCH por NOME exato! ${subconta.name} === ${usuarioNome}`);
                    return true;
                }

                // Match parcial (nome contém ou é contido)
                if (nomeNormalizado.includes(subcontaNome) || subcontaNome.includes(nomeNormalizado)) {
                    console.log(`✅ MATCH por NOME similar! ${subconta.name} ≈ ${usuarioNome}`);
                    return true;
                }
            }

            return false;
        });

        console.log(`🔍 Resultado final: ${temSubconta ? '✅ TEM' : '❌ NÃO TEM'} subconta`);
        console.log(`🔍 === FIM VERIFICAÇÃO ===\n`);

        return temSubconta;
    };

    /**
     * Verifica as regras de split via API
     */
    const verificarRegrasSplit = async (caixaId: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem('token');

            console.log(`⚙️ Verificando regras de split para caixa ${caixaId}...`);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

            const response = await axios.get(
                `${API_URL}/split-config/${caixaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('⚙️ Resposta completa da API:', response.data);

            // A API retorna: { success: boolean, config: { ... } | null }
            const config = response.data?.config;

            console.log('⚙️ Split config extraída:', config);

            // Verifica se as regras de split estão configuradas
            const configurado = !!(
                config &&
                config.taxaServicoSubId &&
                config.fundoReservaSubId &&
                config.adminSubId &&
                config.participantesMesOrdem &&
                config.participantesMesOrdem.length > 0
            );

            console.log('⚙️ Regras configuradas?', configurado);

            return configurado;

        } catch (err: any) {
            console.error('❌ Erro ao verificar regras de split:', err);
            console.error('❌ Detalhes:', err.response?.data);
            return false;
        }
    };

    /**
     * Função principal que verifica toda a configuração
     */
    const verificarConfiguracaoSplitDetalhada = async () => {
        console.log('\n🚀 ========================================');
        console.log('🚀 INICIANDO VERIFICAÇÃO DE CONFIGURAÇÃO');
        console.log('🚀 ========================================');
        console.log('📋 Parâmetros:', {
            caixaId,
            adminId,
            participantesCount: participantes.length,
            participantes: participantes.map(p => ({
                id: p._id,
                usuarioId: typeof p.usuarioId === 'object' ? p.usuarioId._id : p.usuarioId,
                nome: typeof p.usuarioId === 'object' ? p.usuarioId.nome : 'N/A'
            }))
        });

        if (!caixaId || !adminId) {
            console.warn('⚠️ Faltam caixaId ou adminId - abortando');
            return;
        }

        if (participantes.length === 0) {
            console.warn('⚠️ Nenhum participante - limpando status');
            setParticipantesSubcontasStatus([]);
            setSplitConfigStatus({
                adminTemSubconta: false,
                regrasSplit: false,
                participantesVinculados: false,
            });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // ========================================
            // 1. BUSCAR SUBCONTAS
            // ========================================
            console.log('\n📡 ETAPA 1: Buscando subcontas...');
            let subcontas: SubcontaAPI[] = [];

            try {
                subcontas = await buscarSubcontas();
                console.log(`✅ ${subcontas.length} subcontas encontradas`);
            } catch (err) {
                console.error('❌ Erro ao buscar subcontas:', err);
                subcontas = [];
            }

            // ========================================
            // 2. VERIFICAR ADMIN
            // ========================================
            console.log('\n👤 ETAPA 2: Verificando administrador...');
            console.log(`👤 Admin ID: ${adminId}`);
            console.log(`👤 Total de subcontas disponíveis: ${subcontas.length}`);

            // Log detalhado de cada subconta para comparação
            console.log('\n📋 Detalhes das subcontas:');
            subcontas.forEach((sub, idx) => {
                console.log(`  ${idx + 1}. Subconta:`, {
                    _id: sub._id,
                    usuarioId: sub.usuarioId,
                    lytexId: sub.lytexId,
                    email: sub.email,
                    name: sub.name
                });
            });

            console.log(`\n🔍 Procurando match com adminId: ${adminId}`);
            console.log(`🔍 Admin email: ${adminEmail || 'N/A'}`);
            console.log(`🔍 Admin nome: ${adminNome || 'N/A'}`);

            // Use the same comprehensive verification function as participants
            // This checks by: usuarioId, _id, email, and name
            const adminTemSubconta = subcontas.length > 0 && (adminId || adminEmail || adminNome)
                ? verificarSubcontaUsuario(
                    adminId,
                    adminEmail,
                    adminNome || 'Administrador',
                    subcontas
                )
                : false;

            console.log(`👤 Admin tem subconta? ${adminTemSubconta ? '✅ SIM' : '❌ NÃO'}`);

            // ========================================
            // 3. VERIFICAR PARTICIPANTES
            // ========================================
            console.log('\n👥 ETAPA 3: Verificando participantes...');

            const participantesStatus: ParticipanteSubcontaStatus[] = participantes.map((p, index) => {
                console.log(`\n👤 --- Participante ${index + 1}/${participantes.length} ---`);
                console.log('📋 Dados brutos:', p);

                // Extrair usuarioId, nome e email corretamente
                let usuarioId: string;
                let nome: string;
                let email: string | undefined;

                if (typeof p.usuarioId === 'object' && p.usuarioId !== null) {
                    usuarioId = p.usuarioId._id;
                    nome = p.usuarioId.nome || 'Sem nome';
                    email = p.usuarioId.email;
                    console.log('📋 Tipo: Objeto populado');
                } else {
                    usuarioId = String(p.usuarioId);
                    nome = 'Sem nome (não populado)';
                    email = undefined;
                    console.log('📋 Tipo: String (ID direto)');
                }

                console.log(`📋 Dados extraídos:`, {
                    usuarioId,
                    nome,
                    email
                });

                const temSubconta = subcontas.length > 0
                    ? verificarSubcontaUsuario(usuarioId, email, nome, subcontas)
                    : false;

                const resultado = {
                    _id: usuarioId,
                    nome: nome,
                    temSubconta,
                };

                console.log(`👤 Resultado: ${nome} -> ${temSubconta ? '✅ TEM' : '❌ NÃO TEM'} subconta`);

                return resultado;
            });

            console.log('\n👥 RESUMO DOS PARTICIPANTES:');
            participantesStatus.forEach((p, idx) => {
                console.log(`  ${idx + 1}. ${p.nome}: ${p.temSubconta ? '✅' : '❌'}`);
            });

            // ========================================
            // 4. VERIFICAR VINCULAÇÃO COMPLETA
            // ========================================
            const todosParticipantesVinculados = participantesStatus.length > 0 &&
                participantesStatus.every((p) => p.temSubconta);

            const comSubconta = participantesStatus.filter(p => p.temSubconta).length;

            console.log('\n📊 Estatísticas:');
            console.log(`   Total: ${participantesStatus.length}`);
            console.log(`   Com subconta: ${comSubconta}`);
            console.log(`   Sem subconta: ${participantesStatus.length - comSubconta}`);
            console.log(`   Todos vinculados? ${todosParticipantesVinculados ? '✅ SIM' : '❌ NÃO'}`);

            // ========================================
            // 5. VERIFICAR REGRAS DE SPLIT
            // ========================================
            console.log('\n⚙️ ETAPA 4: Verificando regras de split...');
            const regrasSplitConfiguradas = await verificarRegrasSplit(caixaId);
            console.log(`⚙️ Regras configuradas? ${regrasSplitConfiguradas ? '✅ SIM' : '❌ NÃO'}`);

            // ========================================
            // 6. ATUALIZAR ESTADOS
            // ========================================
            console.log('\n💾 ETAPA 5: Atualizando estados...');

            const novoStatus = {
                adminTemSubconta,
                regrasSplit: regrasSplitConfiguradas,
                participantesVinculados: todosParticipantesVinculados,
            };

            console.log('💾 Novo status:', novoStatus);
            console.log('💾 Participantes status:', participantesStatus);

            setParticipantesSubcontasStatus(participantesStatus);
            setSplitConfigStatus(novoStatus);

            // ========================================
            // RESULTADO FINAL
            // ========================================
            console.log('\n✅ ========================================');
            console.log('✅ VERIFICAÇÃO CONCLUÍDA');
            console.log('✅ ========================================');
            console.log('📊 Status Final:', {
                adminTemSubconta: novoStatus.adminTemSubconta ? '✅' : '❌',
                regrasSplit: novoStatus.regrasSplit ? '✅' : '❌',
                participantesVinculados: novoStatus.participantesVinculados ? '✅' : '❌',
                totalParticipantes: participantesStatus.length,
                comSubconta: comSubconta,
                semSubconta: participantesStatus.length - comSubconta
            });
            console.log('========================================\n');

        } catch (err: any) {
            console.error('\n❌ ========================================');
            console.error('❌ ERRO NA VERIFICAÇÃO');
            console.error('❌ ========================================');
            console.error('❌ Erro:', err);
            console.error('❌ Mensagem:', err.message);
            console.error('❌ Stack:', err.stack);
            console.error('========================================\n');

            setError(err.message || 'Erro ao verificar configuração');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Validação antes de iniciar a caixa
     */
    const validarIniciarCaixa = (): { valido: boolean; mensagem?: string } => {
        console.log('\n🔐 Validando inicialização da caixa...');
        console.log('🔐 Status:', splitConfigStatus);

        if (!splitConfigStatus.adminTemSubconta) {
            console.log('❌ Admin sem subconta');
            return {
                valido: false,
                mensagem: 'Administrador precisa criar subconta antes de iniciar',
            };
        }

        if (!splitConfigStatus.participantesVinculados) {
            const participantesSemSubconta = participantesSubcontasStatus
                .filter((p) => !p.temSubconta)
                .map((p) => p.nome);

            console.log('❌ Participantes sem subconta:', participantesSemSubconta);

            return {
                valido: false,
                mensagem: `Participantes sem subconta: ${participantesSemSubconta.join(', ')}`,
            };
        }

        if (!splitConfigStatus.regrasSplit) {
            console.log('❌ Regras de split não configuradas');
            return {
                valido: false,
                mensagem: 'Regras de split não configuradas pelo Admin Master',
            };
        }

        console.log('✅ Validação passou!');
        return { valido: true };
    };

    // ========================================
    // EFFECT - Executar verificação
    // ========================================
    useEffect(() => {
        console.log('\n🔄 useEffect disparado');
        console.log('🔄 Deps:', {
            caixaId,
            participantesLength: participantes.length,
            adminId,
            shouldRun: !!(caixaId && participantes.length > 0 && adminId)
        });

        if (caixaId && participantes.length > 0 && adminId) {
            console.log('🔄 Executando verificação...');
            verificarConfiguracaoSplitDetalhada();
        } else {
            console.log('🔄 Condições não atendidas, pulando verificação');
        }
    }, [caixaId, participantes.length, adminId]);

    return {
        splitConfigStatus,
        participantesSubcontasStatus,
        loading,
        error,
        verificarConfiguracaoSplitDetalhada,
        validarIniciarCaixa,
    };
}