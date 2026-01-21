
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, FileText, AlertCircle, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bancosService, subcontasService, contaBancariaService } from '../lib/api';
import { formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { BankAccountForm } from './Carteira/components/BankAccountForm';

// Interface para props do componente de Criação de Subconta
interface SubAccountCreationProps {
    usuario: any;
    updateUsuario: (data: any) => void;
    onSuccess: () => void;
    setOnboardingUrl: (url: string) => void;
    setShowOnboardingModal: (show: boolean) => void;
}

export const SubAccountCreation = ({
    usuario,
    updateUsuario,
    onSuccess,
    setOnboardingUrl,
    setShowOnboardingModal
}: SubAccountCreationProps) => {
    const [creatingSubAccount, setCreatingSubAccount] = useState(false);
    const [subAccountError, setSubAccountError] = useState<string | null>(null);

    // Estado do formulário de subconta
    const [subForm, setSubForm] = useState({
        type: 'pf',
        cpfCnpj: usuario?.cpf || '',
        name: usuario?.nome || '',
        fantasyName: '',
        cellphone: usuario?.telefone || '',
        email: usuario?.email || '',
        aboutBusiness: '',
        branchOfActivity: '',
        webhookUrl: '',
        withdrawValue: 50000,
        numberOfExpectedMonthlyEmissions: 50,
        expectedMonthlyBilling: 50000,
        addressStreet: '',
        addressZone: '',
        addressCity: '',
        addressState: '',
        addressNumber: '',
        addressComplement: '',
        addressZip: '',
        adminCpf: usuario?.cpf || '',
        adminFullName: usuario?.nome || '',
        adminCellphone: usuario?.telefone || '',
        adminBirthDate: '',
        adminMotherName: '',
    });

    // Estados bancários locais para o formulário de criação

    const [selectedBankForSub, setSelectedBankForSub] = useState<{ code: string; name: string } | null>(null);
    const [bankAgency, setBankAgency] = useState('');
    const [bankAgencyDv, setBankAgencyDv] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankAccountDv, setBankAccountDv] = useState('');
    const [bankAccountType, setBankAccountType] = useState<'corrente' | 'poupanca'>('corrente');

    const handleCreateSubAccount = async () => {
        try {
            if (!usuario) {
                throw new Error('Usuário não autenticado');
            }
            setCreatingSubAccount(true);
            setSubAccountError(null);
            const payload: any = {
                type: subForm.type,
                cpfCnpj: subForm.cpfCnpj,
                name: subForm.name,
                fantasyName: subForm.type === 'pj' ? subForm.fantasyName : undefined,
                cellphone: subForm.cellphone,
                email: subForm.email,
                aboutBusiness: subForm.aboutBusiness,
                branchOfActivity: subForm.branchOfActivity,
                webhookUrl: subForm.webhookUrl || undefined,
                withdrawValue: subForm.withdrawValue,
                numberOfExpectedMonthlyEmissions:
                    subForm.numberOfExpectedMonthlyEmissions,
                expectedMonthlyBilling: subForm.expectedMonthlyBilling,
                address: subForm.addressStreet
                    ? {
                        street: subForm.addressStreet,
                        zone: subForm.addressZone,
                        city: subForm.addressCity,
                        state: subForm.addressState,
                        number: subForm.addressNumber || '0',
                        complement: subForm.addressComplement || undefined,
                        zip: subForm.addressZip,
                    }
                    : undefined,
                adminEnterprise: subForm.adminCpf
                    ? {
                        cpf: subForm.adminCpf,
                        fullName: subForm.adminFullName || subForm.name,
                        cellphone: subForm.adminCellphone || subForm.cellphone,
                        birthDate: subForm.adminBirthDate
                            ? new Date(subForm.adminBirthDate).toISOString()
                            : new Date().toISOString(),
                        motherName: subForm.adminMotherName || 'Não informado',
                    }
                    : undefined,
            };

            // Montar banksAccounts se preenchido
            if (selectedBankForSub && bankAgency && bankAccount) {
                // Padronizar nome do banco para corresponder ao Postman
                let bankName = selectedBankForSub.name;
                if (selectedBankForSub.code === '260') {
                    bankName = 'Nu Pagamentos S.A'; // Padronizado para Nubank
                }

                payload.banksAccounts = [
                    {
                        owner: {
                            name: subForm.name,
                            type: subForm.type,
                            cpfCnpj: subForm.cpfCnpj,
                        },
                        bank: {
                            code: selectedBankForSub.code,
                            name: bankName,
                            ispb: selectedBankForSub.code === '260' ? '18236120' : undefined,
                        },
                        agency: { number: bankAgencyDv ? `${bankAgency}${bankAgencyDv}` : bankAgency },
                        creditCard: false,
                        account: { type: bankAccountType, number: bankAccount, dv: bankAccountDv || '0' },
                    },
                ];
            }

            // CRÍTICO: Adicionar webhookUrl para gerar seção "Aplicação" no Lytex
            payload.webhookUrl = 'https://webhook.site/rafaela-notifications';

            console.log('[Carteira] Enviando payload de criação de subconta', payload);

            const resp = await subcontasService.createMine(payload);

            console.log('[Carteira] Resposta da API ao criar subconta', resp);
            const subAccountId =
                (resp && resp.subconta && (resp.subconta.lytexId || resp.subconta._id)) || (resp && resp.subAccountId) || (resp && resp.id) || undefined;

            if (subAccountId) {
                // Sucesso
                updateUsuario({ lytexSubAccountId: subAccountId });
                // onSuccess deve lidar com setHasSubAccount(true) e reload/mensagem

                // Verifica URL de onboarding
                let urlOnboarding = resp?.onboardingUrl || resp?.subconta?.onboardingUrl;

                // 🧪 TESTE: Se não vier URL (ex: Sandbox), usar a URL de teste simulada se necessário
                // (Mantendo lógica original comentada ou ajustada se necessário)
                if (!urlOnboarding && import.meta.env.DEV) {
                    // Em dev, pode ser que fallback seja útil, mas seguindo código original:
                    // console.log('[Carteira] Modo Teste: Usando URL de onboarding simulada');
                    // urlOnboarding = 'https://cadastro.io/9452ec3c2ab24ec84aed7723aae56f3d';
                    // Mantendo comportamento seguro de produção
                }

                if (urlOnboarding) {
                    console.log('[Carteira] Onboarding necessário. URL:', urlOnboarding);
                    setOnboardingUrl(urlOnboarding);
                    setShowOnboardingModal(true);
                    return; // Não chama onSuccess completo ainda pois user precisa verificar
                }

                onSuccess();
                return;
            }

            console.warn('[Carteira] Chamada de criação de subconta não retornou ID', resp);
            setSubAccountError('Não foi possível obter o ID da subconta criada');
            setTimeout(() => setSubAccountError(null), 5000);

        } catch (e: any) {
            const status = e?.response?.status;
            const data = e?.response?.data;
            const message = data?.message || e?.message || 'Falha ao criar subconta';

            console.error('[Carteira] Erro ao criar subconta', { status, data, erro: e });

            // Tratamento específico para erros de duplicação
            const errorCode = data?.error;

            if (errorCode === 'DUPLICATE_CPF_LYTEX' || errorCode === 'DUPLICATE_CPF') {
                setSubAccountError(
                    'Já existe uma subconta cadastrada com este CPF. Redirecionando para sua carteira...',
                );

                // Atualizar contexto se tiver subcontaId
                if (data?.subcontaId) {
                    updateUsuario({ lytexSubAccountId: data.subcontaId });
                }

                setTimeout(() => {
                    onSuccess(); // Simula sucesso para recarregar/avançar
                }, 2000);
                return;
            }

            if (
                status === 409 ||
                (typeof message === 'string' && message.toLowerCase().includes('subconta já criada'))
            ) {
                setSubAccountError('Você já possui uma subconta criada. Abrindo sua carteira.');
                onSuccess();
                return;
            }

            setSubAccountError(message);
            setTimeout(() => setSubAccountError(null), 5000);
        } finally {
            setCreatingSubAccount(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Crie sua subconta para começar a usar a carteira
                </h2>
                <div className="text-sm text-gray-700 mb-6 space-y-2">
                    <p>
                        Para que você possa receber seus pontos do caixa de forma automática e segura, precisamos criar sua subconta no nosso sistema de pagamentos.
                    </p>
                    <p className="font-medium">Por que isso é importante?</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>✓ Recebimento automático dos seus valores</li>
                        <li>✓ Segurança nas transações</li>
                        <li>✓ Rastreamento completo de todos os pagamentos</li>
                        <li>✓ Proteção dos seus dados financeiros</li>
                    </ul>
                    <p>
                        Preencha os dados abaixo: Alguns campos já foram preenchidos automaticamente com base no seu cadastro. Verifique se as informações estão corretas e complete os dados que faltam.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome completo
                        </label>
                        <input
                            type="text"
                            value={subForm.name}
                            onChange={(e) =>
                                setSubForm({ ...subForm, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {subForm.type === 'pj' ? 'CNPJ' : 'CPF'}
                        </label>
                        <input
                            type="text"
                            value={subForm.cpfCnpj}
                            onChange={(e) =>
                                setSubForm({ ...subForm, cpfCnpj: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo
                        </label>
                        <select
                            value={subForm.type}
                            onChange={(e) =>
                                setSubForm({ ...subForm, type: e.target.value as 'pf' | 'pj' })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pf">Pessoa Física</option>
                            <option value="pj">Pessoa Jurídica</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                        </label>
                        <input
                            type="text"
                            value={subForm.cellphone}
                            onChange={(e) =>
                                setSubForm({ ...subForm, cellphone: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            E-mail
                        </label>
                        <input
                            type="email"
                            value={subForm.email}
                            onChange={(e) =>
                                setSubForm({ ...subForm, email: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sobre o negócio
                        </label>
                        <input
                            type="text"
                            value={subForm.aboutBusiness}
                            onChange={(e) =>
                                setSubForm({ ...subForm, aboutBusiness: e.target.value })
                            }
                            placeholder="Ex: Administrador de caixas"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ramo de atividade
                        </label>
                        <input
                            type="text"
                            value={subForm.branchOfActivity}
                            onChange={(e) =>
                                setSubForm({ ...subForm, branchOfActivity: e.target.value })
                            }
                            placeholder="Serviços"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {subForm.type === 'pj' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                            <input
                                type="text"
                                value={subForm.fantasyName}
                                onChange={(e) => setSubForm({ ...subForm, fantasyName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Administrador da conta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                            <input
                                type="text"
                                value={subForm.adminCpf}
                                onChange={(e) => setSubForm({ ...subForm, adminCpf: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                            <input
                                type="text"
                                value={subForm.adminFullName}
                                onChange={(e) => setSubForm({ ...subForm, adminFullName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                            <input
                                type="text"
                                value={subForm.adminCellphone}
                                onChange={(e) => setSubForm({ ...subForm, adminCellphone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                            <input
                                type="date"
                                value={subForm.adminBirthDate}
                                onChange={(e) => setSubForm({ ...subForm, adminBirthDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da mãe</label>
                            <input
                                type="text"
                                value={subForm.adminMotherName}
                                onChange={(e) => setSubForm({ ...subForm, adminMotherName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Dados Bancários */}
                <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Dados bancários</h3>
                    <BankAccountForm
                        bankCode={selectedBankForSub?.code}
                        bankName={selectedBankForSub?.name}
                        agency={bankAgency}
                        agencyDv={bankAgencyDv}
                        account={bankAccount}
                        accountDv={bankAccountDv}
                        accountType={bankAccountType}
                        onChange={(data) => {
                            if (data.bankCode !== undefined || data.bankName !== undefined) {
                                if (data.bankCode === undefined) {
                                    setSelectedBankForSub(null);
                                } else {
                                    setSelectedBankForSub({ code: data.bankCode!, name: data.bankName || '' });
                                }
                            }
                            if (data.agency !== undefined) setBankAgency(data.agency);
                            if (data.agencyDv !== undefined) setBankAgencyDv(data.agencyDv);
                            if (data.account !== undefined) setBankAccount(data.account);
                            if (data.accountDv !== undefined) setBankAccountDv(data.accountDv);
                            if (data.accountType !== undefined) setBankAccountType(data.accountType);
                        }}
                    />
                </div>

                <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">
                        Endereço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rua
                            </label>
                            <input
                                type="text"
                                value={subForm.addressStreet}
                                onChange={(e) =>
                                    setSubForm({ ...subForm, addressStreet: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={subForm.addressZone}
                                onChange={(e) =>
                                    setSubForm({ ...subForm, addressZone: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cidade
                            </label>
                            <input
                                type="text"
                                value={subForm.addressCity}
                                onChange={(e) =>
                                    setSubForm({ ...subForm, addressCity: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado
                            </label>
                            <input
                                type="text"
                                value={subForm.addressState}
                                onChange={(e) =>
                                    setSubForm({ ...subForm, addressState: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={subForm.addressZip}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setSubForm({ ...subForm, addressZip: digits });
                                }}
                                onBlur={async () => {
                                    const cep = String(subForm.addressZip || '').replace(/\D/g, '');
                                    if (cep.length !== 8) return;
                                    try {
                                        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                        const data = await resp.json();
                                        if (!data?.erro) {
                                            setSubForm({
                                                ...subForm,
                                                addressStreet: data.logradouro || subForm.addressStreet,
                                                addressZone: data.bairro || subForm.addressZone,
                                                addressCity: data.localidade || subForm.addressCity,
                                                addressState: data.uf || subForm.addressState,
                                            });
                                        }
                                    } catch { }
                                }}
                                placeholder="00000000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número
                            </label>
                            <input
                                type="text"
                                value={subForm.addressNumber}
                                onChange={(e) =>
                                    setSubForm({ ...subForm, addressNumber: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Complemento
                            </label>
                            <input
                                type="text"
                                value={subForm.addressComplement}
                                onChange={(e) =>
                                    setSubForm({
                                        ...subForm,
                                        addressComplement: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {subAccountError && (
                    <p className="mb-4 text-sm text-red-600">{subAccountError}</p>
                )}

                <button
                    onClick={handleCreateSubAccount}
                    disabled={creatingSubAccount}
                    className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                    {creatingSubAccount ? 'Criando subconta...' : 'Criar Subconta'}
                </button>
            </div>

            {/* Toast Error interno se precisar - (Mantendo simples conforme original) */}
        </div>
    );
};


// --------------------------------------------------------------------------------
// Componente Principal: CarteiraDataAccounts (Tab Dados da Conta)
// --------------------------------------------------------------------------------

interface CarteiraDataAccountsProps {
    usuario: any;
    subcontaData: any;
    accountData: any;
    caixasGerenciados: any[];
    hasSubAccount: boolean;
    createSubAccountAction: () => void; // Ação para ir para a tela de criação se necessário
}

const CarteiraDataAccounts = ({
    usuario,
    subcontaData,
    accountData,
    caixasGerenciados,
    hasSubAccount,
    createSubAccountAction,
}: CarteiraDataAccountsProps) => {

    const [savingBankAccount, setSavingBankAccount] = useState(false);
    const [bankAccountError, setBankAccountError] = useState<string | null>(null);
    const [loadingBankAccount, setLoadingBankAccount] = useState(false);
    const [bankAccountData, setBankAccountData] = useState<{
        bank?: { code: string; name: string; ispb?: string };
        agency?: { number: string; dv?: string };
        account?: { type: string; number: string; dv?: string; operation?: string };
    } | null>(null);

    // Estados locais do formulário de EDIÇÃO de banco

    const [selectedBankForSub, setSelectedBankForSub] = useState<{ code: string; name: string } | null>(null);
    const [bankAgency, setBankAgency] = useState('');
    const [bankAgencyDv, setBankAgencyDv] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankAccountDv, setBankAccountDv] = useState('');
    const [bankAccountType, setBankAccountType] = useState<'corrente' | 'poupanca'>('corrente');

    // Buscar dados bancários locais
    const fetchMyBankAccountsFromLocal = async () => {
        try {
            setLoadingBankAccount(true);
            setBankAccountError(null);

            // console.log('🔍 [CarteiraDataAccounts] Buscando dados bancários...');

            // Aqui usamos contaBancariaService conforme originallly
            // Como não importamos contaBancariaService, vamos importar corretamente no topo
            // Mas espere, no arquivo original era contaBancariaService.getMyBankAccounts()
            // Precisamos importar o serviço
            // Dynamic import removed


            const response = await contaBancariaService.getMyBankAccounts();
            const accounts = Array.isArray(response) ? response : response?.contas || response?.data || [];

            if (accounts.length > 0) {
                const firstAccount = accounts[0];
                setBankAccountData({
                    bank: {
                        code: firstAccount.bankCode || '',
                        name: firstAccount.bankName || '',
                    },
                    agency: {
                        number: firstAccount.agency || '',
                        dv: firstAccount.agencyDv || '',
                    },
                    account: {
                        type: firstAccount.accountType || 'corrente',
                        number: firstAccount.account || '',
                        dv: firstAccount.accountDv || '',
                    },
                });
            } else {
                setBankAccountData(null);
            }
        } catch (e: any) {
            console.error('❌ [CarteiraDataAccounts] Erro ao buscar dados bancários:', e);
            setBankAccountError(e?.response?.data?.message || e?.message || 'Erro ao buscar dados bancários');
            setBankAccountData(null);
        } finally {
            setLoadingBankAccount(false);
        }
    };

    useEffect(() => {
        if (usuario?._id && hasSubAccount) {
            fetchMyBankAccountsFromLocal();
        }
    }, [usuario?._id, hasSubAccount]);

    const handleSaveBankAccount = async () => {
        if (!subcontaData?.lytexId || !selectedBankForSub) {
            setBankAccountError('Selecione um banco');
            return;
        }

        if (!bankAgency || !bankAccount || !bankAccountDv) {
            setBankAccountError('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setSavingBankAccount(true);
            setBankAccountError(null);

            const payload = {
                name: subcontaData.name || usuario?.nome || '',
                email: subcontaData.email || usuario?.email || '',
                cpfCnpj: subcontaData.cpfCnpj || usuario?.cpf || '',
                address: {
                    street: subcontaData.address?.street || '',
                    zone: subcontaData.address?.zone || '',
                    city: subcontaData.address?.city || '',
                    state: subcontaData.address?.state || '',
                    number: subcontaData.address?.number || '',
                    complement: subcontaData.address?.complement || '',
                    zip: subcontaData.address?.zip || '',
                },
                bankAccount: {
                    bankCode: selectedBankForSub.code,
                    bankName: selectedBankForSub.name,
                    bankIspb: '',
                    accountType: bankAccountType,
                    agency: bankAgency,
                    agencyDv: bankAgencyDv || '',
                    accountNumber: bankAccount,
                    accountDv: bankAccountDv,
                },
            };

            const lytexId = subcontaData.lytexId!;
            // Import dinâmico pois subcontasService não estava no escopo global dessa função no original, 
            // mas aqui já importamos acima. 
            const response = await subcontasService.updateBankAccount(lytexId, payload);

            if (response.success) {
                await fetchMyBankAccountsFromLocal();
                // Limpar formulário
                setSelectedBankForSub(null);
                setBankAgency('');
                setBankAgencyDv('');
                setBankAccount('');
                setBankAccountDv('');
                setBankAccountType('corrente');
            } else {
                setBankAccountError(response.message || 'Erro ao salvar dados bancários');
            }
        } catch (e: any) {
            console.error('❌ Erro ao salvar dados bancários:', e);
            setBankAccountError(e?.response?.data?.message || e?.message || 'Erro ao salvar dados bancários');
        } finally {
            setSavingBankAccount(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Card de Status da Conta */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${subcontaData ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center`}>
                        {subcontaData ? (
                            <Check className="text-green-600" size={24} />
                        ) : (
                            <X className="text-yellow-600" size={24} />
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">
                            {subcontaData ? 'Conta Ativa' : 'Subconta Não Encontrada'}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {subcontaData
                                ? 'Sua conta está funcionando normalmente'
                                : 'Crie sua subconta para começar a receber'}
                        </p>
                    </div>
                </div>

                {!hasSubAccount && (
                    <div className="mb-4">
                        <button
                            onClick={createSubAccountAction}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Criar Subconta
                        </button>
                    </div>
                )}

                {/* Dados Principais */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Nome Completo</span>
                        <span className="font-medium text-gray-800">{subcontaData?.name || accountData.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">CPF/CNPJ</span>
                        <span className="font-medium text-gray-800">{subcontaData?.cpfCnpj || accountData.cpf}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">E-mail</span>
                        <span className="font-medium text-gray-800">{subcontaData?.email || accountData.email}</span>
                    </div>
                    {subcontaData?.cellphone && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Celular</span>
                            <span className="font-medium text-gray-800">{subcontaData.cellphone}</span>
                        </div>
                    )}
                    {subcontaData?.type && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tipo</span>
                            <span className="font-medium text-gray-800">{subcontaData.type.toUpperCase()}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className={`px-3 py-1 ${subcontaData ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} rounded-full text-sm font-medium`}>
                            {subcontaData ? 'Ativa' : 'Pendente'}
                        </span>
                    </div>
                    {subcontaData?.createdAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Conta criada em</span>
                            <span className="font-medium text-gray-800">{formatDate(subcontaData.createdAt)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card de Dados Lytex */}
            {subcontaData?.lytexId && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">📋 Dados Lytex</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">ID Lytex</span>
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                {subcontaData.lytexId}
                            </span>
                        </div>
                        {subcontaData._id && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">ID Local</span>
                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                    {subcontaData._id}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Credenciais API</span>
                            <span className={`px-3 py-1 ${subcontaData.hasCredentials ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} rounded-full text-sm font-medium`}>
                                {subcontaData.hasCredentials ? '✓ Configuradas' : '⚠ Não configuradas'}
                            </span>
                        </div>
                        {subcontaData.clientId && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Client ID</span>
                                <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded text-blue-800">
                                    {subcontaData.clientId}
                                </span>
                            </div>
                        )}
                        {subcontaData.clientSecret && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Client Secret</span>
                                <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded text-blue-800">
                                    {subcontaData.clientSecret}
                                </span>
                            </div>
                        )}
                        {subcontaData.nomeCaixa && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Caixa Associado</span>
                                <span className="font-medium text-gray-800">
                                    {subcontaData.nomeCaixa}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Card de Dados Bancários */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-800 mb-4">🏦 Dados Bancários</h4>

                {loadingBankAccount ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Carregando dados bancários...</span>
                    </div>
                ) : bankAccountError ? (
                    <div className="text-sm text-red-600 py-2">
                        {bankAccountError}
                    </div>
                ) : bankAccountData ? (
                    <div className="space-y-3">
                        {bankAccountData.bank && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Banco</span>
                                    <span className="font-medium text-gray-800">
                                        {bankAccountData.bank.name}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Código do Banco</span>
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                        {bankAccountData.bank.code}
                                    </span>
                                </div>
                                {bankAccountData.bank.ispb && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">ISPB</span>
                                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                            {bankAccountData.bank.ispb}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {bankAccountData.agency && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Agência</span>
                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                    {bankAccountData.agency.number}
                                    {bankAccountData.agency.dv && `-${bankAccountData.agency.dv}`}
                                </span>
                            </div>
                        )}

                        {bankAccountData.account && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Tipo de Conta</span>
                                    <span className="font-medium text-gray-800 capitalize">
                                        {bankAccountData.account.type}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Conta</span>
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                        {bankAccountData.account.number}
                                        {bankAccountData.account.dv && `-${bankAccountData.account.dv}`}
                                    </span>
                                </div>
                                {bankAccountData.account.operation && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Operação</span>
                                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                            {bankAccountData.account.operation}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                            ⚠️ Nenhum dado bancário cadastrado. Preencha abaixo para receber seus pagamentos.
                        </p>

                        <BankAccountForm
                            bankCode={selectedBankForSub?.code}
                            bankName={selectedBankForSub?.name}
                            agency={bankAgency}
                            agencyDv={bankAgencyDv}
                            account={bankAccount}
                            accountDv={bankAccountDv}
                            accountType={bankAccountType}
                            onChange={(data) => {
                                if (data.bankCode !== undefined || data.bankName !== undefined) {
                                    if (data.bankCode === undefined) {
                                        setSelectedBankForSub(null);
                                    } else {
                                        setSelectedBankForSub({ code: data.bankCode!, name: data.bankName || '' });
                                    }
                                }
                                if (data.agency !== undefined) setBankAgency(data.agency);
                                if (data.agencyDv !== undefined) setBankAgencyDv(data.agencyDv);
                                if (data.account !== undefined) setBankAccount(data.account);
                                if (data.accountDv !== undefined) setBankAccountDv(data.accountDv);
                                if (data.accountType !== undefined) setBankAccountType(data.accountType);
                            }}
                            error={bankAccountError}
                        />

                        {/* Botão Confirmar */}
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={handleSaveBankAccount}
                                disabled={savingBankAccount || !selectedBankForSub || !bankAgency || !bankAccount || !bankAccountDv}
                                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {savingBankAccount ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Salvando...
                                    </>
                                ) : (
                                    '✅ Confirmar dados bancários'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Card de Caixas Gerenciados (apenas admin/master) */}
            {caixasGerenciados.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">📦 Caixas Gerenciados ({caixasGerenciados.length})</h4>
                    <div className="space-y-2">
                        {caixasGerenciados.map((caixa) => (
                            <div key={caixa._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <span className="font-medium text-gray-800">{caixa.nome}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${caixa.status === 'ativo' ? 'bg-green-100 text-green-700' :
                                    caixa.status === 'completo' ? 'bg-blue-100 text-blue-700' :
                                        caixa.status === 'finalizado' ? 'bg-gray-100 text-gray-700' :
                                            'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {caixa.status || 'Rascunho'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Card de Endereço */}
            {subcontaData?.address && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">📍 Endereço</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Logradouro</span>
                            <span className="font-medium text-gray-800">
                                {subcontaData.address.street}{subcontaData.address.number ? `, ${subcontaData.address.number}` : ''}
                            </span>
                        </div>
                        {subcontaData.address.complement && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Complemento</span>
                                <span className="font-medium text-gray-800">{subcontaData.address.complement}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-600">Bairro</span>
                            <span className="font-medium text-gray-800">{subcontaData.address.zone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Cidade/UF</span>
                            <span className="font-medium text-gray-800">{subcontaData.address.city}/{subcontaData.address.state}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">CEP</span>
                            <span className="font-medium text-gray-800">{subcontaData.address.zip}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Informações Importantes */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Informações Importantes</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Saques processados em até 1 dia útil</li>
                    <li>• Sem taxa para transferências acima de R$ 100</li>
                    <li>• Suporte disponível de segunda a sexta, 9h às 18h</li>
                    {!subcontaData?.hasCredentials && (
                        <li className="text-orange-700">• ⚠ Credenciais API não configuradas - solicite ao master</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CarteiraDataAccounts;
