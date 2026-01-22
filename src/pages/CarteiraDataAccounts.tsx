import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, FileText, AlertCircle, Wallet, Building2, CreditCard, MapPin, User, Phone, Mail, Calendar, Hash, Info, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

import { subcontasService, contaBancariaService } from '../lib/api';

// Mock data
const mockUsuario = {
    _id: 'user-123',
    nome: 'João Silva',
    cpf: '123.456.789-00',
    telefone: '(71) 99999-9999',
    email: 'joao@example.com'
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
};

// Componente de Input Moderno
const ModernInput = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    icon: Icon,
    error,
    required = false,
    onBlur,
    className = ''
}: any) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.length > 0;

    return (
        <div className={`relative ${className}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur?.(e);
                    }}
                    placeholder={placeholder}
                    className={`
            w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5 
            bg-white border-2 rounded-xl
            text-gray-900 placeholder-gray-400
            transition-all duration-200 ease-in-out
            ${isFocused
                            ? 'border-blue-500 ring-4 ring-blue-100'
                            : hasValue
                                ? 'border-gray-300 hover:border-gray-400'
                                : 'border-gray-200 hover:border-gray-300'
                        }
            ${error ? 'border-red-300 ring-4 ring-red-50' : ''}
            focus:outline-none
            font-medium
          `}
                />
                {hasValue && !error && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                        <CheckCircle2 size={18} />
                    </div>
                )}
                {error && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                        <XCircle size={18} />
                    </div>
                )}
            </div>
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-600 flex items-center gap-1"
                >
                    <AlertCircle size={14} />
                    {error}
                </motion.p>
            )}
        </div>
    );
};

// Componente de Select Moderno
const ModernSelect = ({ label, value, onChange, options, icon: Icon, required = false }: any) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Icon size={18} />
                    </div>
                )}
                <select
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`
            w-full ${Icon ? 'pl-12' : 'pl-4'} pr-10 py-3.5
            bg-white border-2 rounded-xl
            text-gray-900 font-medium
            transition-all duration-200 ease-in-out
            ${isFocused ? 'border-blue-500 ring-4 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}
            focus:outline-none
            appearance-none cursor-pointer
          `}
                >
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

// Componente BankAccountForm Modernizado - Importado de components
import { BankAccountForm } from './Carteira/components/BankAccountForm';

// Componente SubAccountCreation Modernizado
export const SubAccountCreation = ({
    usuario = mockUsuario,
    updateUsuario = () => { },
    onSuccess = () => { },
    setOnboardingUrl = () => { },
    setShowOnboardingModal = () => { }
}: any) => {
    const [creatingSubAccount, setCreatingSubAccount] = useState(false);
    const [subAccountError, setSubAccountError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

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

    const [selectedBankForSub, setSelectedBankForSub] = useState<{ code: string; name: string } | null>(null);
    const [bankAgency, setBankAgency] = useState('');
    const [bankAgencyDv, setBankAgencyDv] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankAccountDv, setBankAccountDv] = useState('');
    const [bankAccountType, setBankAccountType] = useState<'corrente' | 'poupanca'>('corrente');

    // Função para validar campo individual
    const validateField = (fieldName: string, value: any) => {
        const newErrors = { ...validationErrors };

        const errorMessages: { [key: string]: string } = {
            name: 'Por favor, informe seu nome completo',
            cpfCnpj: 'Por favor, informe seu CPF',
            cellphone: 'Por favor, informe seu telefone com DDD (11 dígitos)',
            email: 'Por favor, informe seu e-mail',
            aboutBusiness: 'Por favor, informe sobre o seu negócio',
            branchOfActivity: 'Por favor, informe o ramo de atividade',
            adminCpf: 'Por favor, informe o CPF do administrador',
            adminFullName: 'Por favor, informe o nome completo do administrador',
            adminCellphone: 'Por favor, informe o telefone do administrador com DDD (11 dígitos)',
            adminBirthDate: 'Por favor, informe a data de nascimento',
            adminMotherName: 'Por favor, informe o nome da mãe',
            bank: 'Por favor, selecione um banco',
            bankAgency: 'Por favor, informe a agência',
            bankAccount: 'Por favor, informe a conta',
            bankAccountDv: 'Por favor, informe o dígito da conta',
            addressZip: 'Por favor, informe o CEP',
            addressStreet: 'Por favor, informe a rua',
            addressNumber: 'Por favor, informe o número',
            addressZone: 'Por favor, informe o bairro',
            addressCity: 'Por favor, informe a cidade',
            addressState: 'Por favor, informe o estado',
            fantasyName: 'Por favor, informe o Nome Fantasia',
        };

        let isValid = true;
        let errorMessage = errorMessages[fieldName] || 'Campo obrigatório';

        if (!value || !value.toString().trim()) {
            isValid = false;
        } else {
            // Validação específica para telefone
            if (fieldName === 'cellphone' || fieldName === 'adminCellphone') {
                const digits = value.toString().replace(/\D/g, '');
                if (digits.length < 10 || digits.length > 11) {
                    isValid = false;
                    errorMessage = 'Telefone inválido (use DDD + Número, ex: 11999999999)';
                }
            }
        }

        if (isValid) {
            delete newErrors[fieldName];
        } else {
            newErrors[fieldName] = errorMessage;
        }

        setValidationErrors(newErrors);
    };

    // Verificar se formulário está válido
    const isFormValid =
        subForm.name.trim() &&
        subForm.cpfCnpj.trim() &&
        subForm.cellphone.trim() &&
        subForm.email.trim() &&
        subForm.aboutBusiness.trim() &&
        subForm.branchOfActivity.trim() &&
        subForm.adminCpf.trim() &&
        subForm.adminFullName.trim() &&
        subForm.adminCellphone.trim() &&
        subForm.adminBirthDate.trim() &&
        subForm.adminMotherName.trim() &&
        selectedBankForSub &&
        bankAgency.trim() &&
        bankAccount.trim() &&
        bankAccountDv.trim() &&
        subForm.addressZip.trim() &&
        subForm.addressStreet.trim() &&
        subForm.addressNumber.trim() &&
        subForm.addressZone.trim() &&
        subForm.addressCity.trim() &&
        subForm.addressCity.trim() &&
        subForm.addressState.trim() &&
        (subForm.type !== 'pj' || (subForm.fantasyName && subForm.fantasyName.trim()));

    const handleCreateSubAccount = async () => {
        try {
            if (!usuario) {
                throw new Error('Usuário não autenticado');
            }
            setCreatingSubAccount(true);
            setSubAccountError(null);

            const payload: any = {
                type: subForm.type,
                cpfCnpj: subForm.cpfCnpj.replace(/\D/g, ''),
                name: subForm.name.trim(),
                fantasyName: subForm.type === 'pj' ? subForm.fantasyName.trim() : undefined,
                cellphone: subForm.cellphone.replace(/\D/g, ''),
                email: subForm.email.trim(),
                aboutBusiness: subForm.aboutBusiness.trim(),
                branchOfActivity: subForm.branchOfActivity.trim(),
                // webhookUrl: 'https://webhook.site/rafaela-notifications', // REMOVIDO: Evitar erro 500 se URL for inválida
                withdrawValue: subForm.withdrawValue,
                numberOfExpectedMonthlyEmissions: subForm.numberOfExpectedMonthlyEmissions,
                expectedMonthlyBilling: subForm.expectedMonthlyBilling,
                address: subForm.addressStreet ? {
                    street: subForm.addressStreet.trim(),
                    zone: subForm.addressZone.trim(),
                    city: subForm.addressCity.trim(),
                    state: subForm.addressState.trim(),
                    number: (subForm.addressNumber || '0').trim(),
                    complement: (subForm.addressComplement || '').trim() || undefined,
                    zip: subForm.addressZip.replace(/\D/g, ''),
                } : undefined,
                adminEnterprise: (subForm.adminCpf && subForm.adminBirthDate) ? { // Só envia se tiver data de nascimento
                    cpf: subForm.adminCpf.replace(/\D/g, ''),
                    fullName: (subForm.adminFullName || subForm.name).trim(),
                    cellphone: (subForm.adminCellphone || subForm.cellphone).replace(/\D/g, ''),
                    birthDate: new Date(subForm.adminBirthDate).toISOString(),
                    motherName: (subForm.adminMotherName || '').trim() || 'Não informado',
                } : undefined,
            };

            if (selectedBankForSub && bankAgency && bankAccount) {
                let bankName = selectedBankForSub.name;
                if (selectedBankForSub.code === '260') {
                    bankName = 'Nu Pagamentos S.A';
                }

                payload.banksAccounts = [{
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
                    agency: { number: bankAgencyDv ? `${bankAgency.replace(/^0+/, '')}${bankAgencyDv}` : bankAgency.replace(/^0+/, '') },
                    creditCard: false,
                    account: { type: bankAccountType, number: bankAccount, dv: bankAccountDv || '0' },
                }];
            }

            const resp = await subcontasService.createMine(payload);

            if (!resp.success) {
                // Se o backend retornou erro explícito (ex: 500 do Lytex tratado)
                setSubAccountError(resp.message || resp.error || 'Erro ao criar subconta');
                setTimeout(() => setSubAccountError(null), 10000);
                return;
            }

            const subAccountId = resp?.subconta?.lytexId || resp?.subconta?._id;

            if (subAccountId) {
                updateUsuario({ lytexSubAccountId: subAccountId });

                // 🆕 NOVO: Acionar modal de onboarding se URL estiver disponível
                if (resp.onboardingUrl) {
                    console.log('✅ URL de onboarding recebida:', resp.onboardingUrl);
                    setOnboardingUrl(resp.onboardingUrl);
                    setShowOnboardingModal(true);
                } else {
                    console.warn('⚠️ URL de onboarding não recebida do backend');
                }

                onSuccess();
                return;
            }

            setSubAccountError('Não foi possível obter o ID da subconta criada (Resposta sem ID)');
            setTimeout(() => setSubAccountError(null), 5000);

        } catch (e: any) {
            const message = e?.response?.data?.message || e?.message || 'Falha ao criar subconta';
            setSubAccountError(message);
            setTimeout(() => setSubAccountError(null), 5000);
        } finally {
            setCreatingSubAccount(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <Wallet size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">Crie sua Subconta</h2>
                                <p className="text-blue-100 mt-1">Configure sua carteira para começar a receber</p>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mt-6">
                            <p className="font-semibold mb-3 flex items-center gap-2">
                                <Info size={20} />
                                Por que isso é importante?
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 size={16} className="text-green-300" />
                                    Recebimento automático
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 size={16} className="text-green-300" />
                                    Segurança nas transações
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 size={16} className="text-green-300" />
                                    Rastreamento completo
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 size={16} className="text-green-300" />
                                    Proteção de dados
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formulário */}
                    <div className="p-8 space-y-8">
                        {/* Dados Principais */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <User size={24} className="text-blue-600" />
                                Dados Principais
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ModernInput
                                    label="Nome completo"
                                    value={subForm.name}
                                    onChange={(e: any) => setSubForm({ ...subForm, name: e.target.value })}
                                    icon={User}
                                    required
                                />
                                <ModernInput
                                    label={subForm.type === 'pj' ? 'CNPJ' : 'CPF'}
                                    value={subForm.cpfCnpj}
                                    onChange={(e: any) => setSubForm({ ...subForm, cpfCnpj: e.target.value })}
                                    icon={Hash}
                                    required
                                />
                                <ModernSelect
                                    label="Tipo"
                                    value={subForm.type}
                                    onChange={(e: any) => setSubForm({ ...subForm, type: e.target.value })}
                                    options={[
                                        { value: 'pf', label: 'Pessoa Física' },
                                        { value: 'pj', label: 'Pessoa Jurídica' }
                                    ]}
                                    icon={FileText}
                                    required
                                />
                                <ModernInput
                                    label="Telefone"
                                    value={subForm.cellphone}
                                    onChange={(e: any) => setSubForm({ ...subForm, cellphone: e.target.value })}
                                    icon={Phone}
                                    required
                                />
                                <ModernInput
                                    label="E-mail"
                                    type="email"
                                    value={subForm.email}
                                    onChange={(e: any) => setSubForm({ ...subForm, email: e.target.value })}
                                    icon={Mail}
                                    required
                                />
                                {subForm.type === 'pj' && (
                                    <ModernInput
                                        label="Nome Fantasia"
                                        value={subForm.fantasyName}
                                        onChange={(e: any) => setSubForm({ ...subForm, fantasyName: e.target.value })}
                                        onBlur={() => validateField('fantasyName', subForm.fantasyName)}
                                        icon={Building2}
                                        required
                                        error={validationErrors.fantasyName}
                                    />
                                )}
                            </div>
                        </section>

                        {/* Informações do Negócio */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Building2 size={24} className="text-blue-600" />
                                Informações do Negócio
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ModernInput
                                    label="Sobre o negócio"
                                    value={subForm.aboutBusiness}
                                    onChange={(e: any) => setSubForm({ ...subForm, aboutBusiness: e.target.value })}
                                    onBlur={() => validateField('aboutBusiness', subForm.aboutBusiness)}
                                    placeholder="Ex: Administrador de caixas"
                                    error={validationErrors.aboutBusiness}
                                    required
                                />
                                <ModernInput
                                    label="Ramo de atividade"
                                    value={subForm.branchOfActivity}
                                    onChange={(e: any) => setSubForm({ ...subForm, branchOfActivity: e.target.value })}
                                    onBlur={() => validateField('branchOfActivity', subForm.branchOfActivity)}
                                    placeholder="Serviços"
                                    error={validationErrors.branchOfActivity}
                                    required
                                />
                            </div>
                        </section>

                        {/* Administrador */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <User size={24} className="text-blue-600" />
                                Administrador da Conta
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ModernInput
                                    label="CPF"
                                    value={subForm.adminCpf}
                                    onChange={(e: any) => setSubForm({ ...subForm, adminCpf: e.target.value })}
                                    onBlur={() => validateField('adminCpf', subForm.adminCpf)}
                                    icon={Hash}
                                    error={validationErrors.adminCpf}
                                    required
                                />
                                <ModernInput
                                    label="Nome completo"
                                    value={subForm.adminFullName}
                                    onChange={(e: any) => setSubForm({ ...subForm, adminFullName: e.target.value })}
                                    onBlur={() => validateField('adminFullName', subForm.adminFullName)}
                                    icon={User}
                                    error={validationErrors.adminFullName}
                                    required
                                />
                                <ModernInput
                                    label="Telefone"
                                    value={subForm.adminCellphone}
                                    onChange={(e: any) => setSubForm({ ...subForm, adminCellphone: e.target.value })}
                                    onBlur={() => validateField('adminCellphone', subForm.adminCellphone)}
                                    icon={Phone}
                                    error={validationErrors.adminCellphone}
                                    required
                                />
                                <ModernInput
                                    label="Data de nascimento"
                                    type="date"
                                    value={subForm.adminBirthDate}
                                    onChange={(e: any) => setSubForm({ ...subForm, adminBirthDate: e.target.value })}
                                    onBlur={() => validateField('adminBirthDate', subForm.adminBirthDate)}
                                    icon={Calendar}
                                    error={validationErrors.adminBirthDate}
                                    required
                                />
                                <ModernInput
                                    label="Nome da mãe"
                                    value={subForm.adminMotherName}
                                    onChange={(e: any) => setSubForm({ ...subForm, adminMotherName: e.target.value })}
                                    onBlur={() => validateField('adminMotherName', subForm.adminMotherName)}
                                    icon={User}
                                    className="md:col-span-2"
                                    error={validationErrors.adminMotherName}
                                    required
                                />
                            </div>
                        </section>

                        {/* Dados Bancários */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CreditCard size={24} className="text-blue-600" />
                                Dados Bancários
                            </h3>
                            <BankAccountForm
                                bankCode={selectedBankForSub?.code}
                                bankName={selectedBankForSub?.name}
                                agency={bankAgency}
                                agencyDv={bankAgencyDv}
                                account={bankAccount}
                                accountDv={bankAccountDv}
                                accountType={bankAccountType}
                                onChange={(data: any) => {
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
                        </section>

                        {/* Endereço */}
                        <section>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <MapPin size={24} className="text-blue-600" />
                                Endereço
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ModernInput
                                    label="CEP"
                                    value={subForm.addressZip}
                                    onChange={(e: any) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                        setSubForm({ ...subForm, addressZip: digits });
                                    }}
                                    onBlur={async () => {
                                        validateField('addressZip', subForm.addressZip);
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
                                    placeholder="00000-000"
                                    icon={Hash}
                                    error={validationErrors.addressZip}
                                    required
                                />
                                <ModernInput
                                    label="Rua"
                                    value={subForm.addressStreet}
                                    onChange={(e: any) => setSubForm({ ...subForm, addressStreet: e.target.value })}
                                    onBlur={() => validateField('addressStreet', subForm.addressStreet)}
                                    icon={MapPin}
                                    error={validationErrors.addressStreet}
                                    required
                                />
                                <ModernInput
                                    label="Número"
                                    value={subForm.addressNumber}
                                    onChange={(e: any) => setSubForm({ ...subForm, addressNumber: e.target.value })}
                                    onBlur={() => validateField('addressNumber', subForm.addressNumber)}
                                    icon={Hash}
                                    error={validationErrors.addressNumber}
                                    required
                                />
                                <ModernInput
                                    label="Complemento"
                                    value={subForm.addressComplement}
                                    onChange={(e: any) => setSubForm({ ...subForm, addressComplement: e.target.value })}
                                />
                                <ModernInput
                                    label="Bairro"
                                    value={subForm.addressZone}
                                    onChange={(e: any) => setSubForm({ ...subForm, addressZone: e.target.value })}
                                    onBlur={() => validateField('addressZone', subForm.addressZone)}
                                    icon={MapPin}
                                    error={validationErrors.addressZone}
                                    required
                                />
                                <ModernInput
                                    label="Cidade"
                                    value={subForm.addressCity}
                                    onChange={(e: any) => setSubForm({ ...subForm, addressCity: e.target.value })}
                                    onBlur={() => validateField('addressCity', subForm.addressCity)}
                                    icon={MapPin}
                                    error={validationErrors.addressCity}
                                    required
                                />
                                <ModernInput
                                    label="Estado"
                                    value={subForm.addressState}
                                    onChange={(e: any) => setSubForm({ ...subForm, addressState: e.target.value })}
                                    onBlur={() => validateField('addressState', subForm.addressState)}
                                    placeholder="UF"
                                    icon={MapPin}
                                    error={validationErrors.addressState}
                                    required
                                />
                            </div>
                        </section>

                        {/* Error Message */}
                        <AnimatePresence>
                            {subAccountError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3"
                                >
                                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                                    <p className="text-sm text-red-800 font-medium">{subAccountError}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: isFormValid ? 1.02 : 1 }}
                            whileTap={{ scale: isFormValid ? 0.98 : 1 }}
                            onClick={handleCreateSubAccount}
                            disabled={creatingSubAccount || !isFormValid}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-3"
                        >
                            {creatingSubAccount ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} />
                                    Criando subconta...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={24} />
                                    Criar Subconta
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Componente CarteiraDataAccounts Modernizado
const CarteiraDataAccounts = ({
    usuario = mockUsuario,
    subcontaData,
    accountData = mockUsuario,
    caixasGerenciados = [],
    hasSubAccount = false,
    createSubAccountAction = () => { },
}: any) => {
    const [savingBankAccount, setSavingBankAccount] = useState(false);
    const [bankAccountError, setBankAccountError] = useState<string | null>(null);
    const [loadingBankAccount, setLoadingBankAccount] = useState(false);
    const [bankAccountData, setBankAccountData] = useState<any>(null);

    const [selectedBankForSub, setSelectedBankForSub] = useState<{ code: string; name: string } | null>(null);
    const [bankAgency, setBankAgency] = useState('');
    const [bankAgencyDv, setBankAgencyDv] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankAccountDv, setBankAccountDv] = useState('');
    const [bankAccountType, setBankAccountType] = useState<'corrente' | 'poupanca'>('corrente');

    // Estado para Endereço
    const [addressZip, setAddressZip] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressComplement, setAddressComplement] = useState('');
    const [addressZone, setAddressZone] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressState, setAddressState] = useState('');
    const [bankAccountId, setBankAccountId] = useState<string | null>(null);

    useEffect(() => {
        if (subcontaData?.address) {
            setAddressZip(subcontaData.address.zip || '');
            setAddressStreet(subcontaData.address.street || '');
            setAddressNumber(subcontaData.address.number || '');
            setAddressComplement(subcontaData.address.complement || '');
            setAddressZone(subcontaData.address.zone || '');
            setAddressCity(subcontaData.address.city || '');
            setAddressState(subcontaData.address.state || '');
        }
    }, [subcontaData]);

    const fetchMyBankAccountsFromLocal = async () => {
        try {
            setLoadingBankAccount(true);
            setBankAccountError(null);

            const response = await contaBancariaService.getMyBankAccounts();
            const accounts = Array.isArray(response) ? response : (response as any)?.contas || (response as any)?.data || [];

            if (accounts.length > 0) {
                const firstAccount = accounts[0];
                setBankAccountData({
                    _id: firstAccount._id || firstAccount.lytexId,
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
                setBankAccountId(firstAccount._id || firstAccount.lytexId || null);
            } else {
                setBankAccountData(null);
            }
        } catch (e: any) {
            console.error('❌ Erro ao buscar dados bancários:', e);
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

            const payload: any = {
                name: subcontaData.name || usuario?.nome || '',
                email: subcontaData.email || usuario?.email || '',
                cpfCnpj: subcontaData.cpfCnpj || usuario?.cpf || '',
                address: (addressZip && addressStreet) ? {
                    street: addressStreet,
                    zone: addressZone,
                    city: addressCity,
                    state: addressState,
                    number: addressNumber || '0',
                    complement: addressComplement,
                    zip: addressZip,
                } : undefined,
                banksAccounts: [{
                    _bankAccountId: bankAccountId || undefined,
                    owner: {
                        name: subcontaData.name || usuario?.nome || '',
                        type: (subcontaData.type || 'pf') as 'pf' | 'pj',
                        cpfCnpj: subcontaData.cpfCnpj || usuario?.cpf || '',
                    },
                    bank: {
                        code: selectedBankForSub.code,
                        name: selectedBankForSub.name,
                        ispb: selectedBankForSub.code === '260' ? '18236120' : undefined,
                    },
                    agency: {
                        number: bankAgency,
                        dv: bankAgencyDv || undefined
                    },
                    account: {
                        type: bankAccountType,
                        number: bankAccount,
                        dv: bankAccountDv,
                    },
                    creditCard: false
                }]
            };

            const lytexId = subcontaData.lytexId!;
            const response = await subcontasService.updateBankAccount(lytexId, payload);

            if (response.success || response._id) { // Checking success or object return
                await fetchMyBankAccountsFromLocal();
                setSelectedBankForSub(null);
                setBankAgency('');
                setBankAgencyDv('');
                setBankAccount('');
                setBankAccountDv('');
                setBankAccountType('corrente');
            } else {
                setBankAccountError((response as any).message || 'Erro ao salvar dados bancários');
            }
        } catch (e: any) {
            console.error('❌ Erro ao salvar dados bancários:', e);
            setBankAccountError(e?.response?.data?.message || e?.message || 'Erro ao salvar dados bancários');
        } finally {
            setSavingBankAccount(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Card de Status da Conta */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden"
                >
                    <div className={`p-8 ${subcontaData ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-yellow-50 to-orange-50'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-16 h-16 ${subcontaData ? 'bg-green-500' : 'bg-yellow-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
                                {subcontaData ? (
                                    <Check className="text-white" size={32} />
                                ) : (
                                    <AlertCircle className="text-white" size={32} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    {subcontaData ? 'Conta Ativa' : 'Subconta Não Encontrada'}
                                </h3>
                                <p className="text-gray-700 mb-4">
                                    {subcontaData
                                        ? 'Sua conta está funcionando normalmente e pronta para transações'
                                        : 'Crie sua subconta para começar a receber pagamentos'}
                                </p>
                                {!hasSubAccount && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={createSubAccountAction}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                    >
                                        <Wallet size={20} />
                                        Criar Subconta Agora
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <User className="text-blue-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Nome Completo</p>
                                    <p className="text-lg font-bold text-gray-900">{subcontaData?.name || accountData.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <Hash className="text-purple-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">CPF/CNPJ</p>
                                    <p className="text-lg font-bold text-gray-900">{subcontaData?.cpfCnpj || accountData.cpf}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <Mail className="text-green-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">E-mail</p>
                                    <p className="text-lg font-bold text-gray-900">{subcontaData?.email || accountData.email}</p>
                                </div>
                            </div>

                            {subcontaData?.cellphone && (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                        <Phone className="text-orange-600" size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">Celular</p>
                                        <p className="text-lg font-bold text-gray-900">{subcontaData.cellphone}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                                    <FileText className="text-pink-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Tipo</p>
                                    <p className="text-lg font-bold text-gray-900">{subcontaData?.type?.toUpperCase() || 'PF'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Status</p>
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 mt-1 ${subcontaData ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} rounded-xl text-sm font-bold`}>
                                        {subcontaData ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        {subcontaData ? 'Ativa' : 'Pendente'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {subcontaData?.createdAt && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-2xl border-2 border-blue-100">
                                <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                                    <Calendar size={16} />
                                    Conta criada em {formatDate(subcontaData.createdAt)}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Card de Dados Lytex */}
                {subcontaData?.lytexId && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8"
                    >
                        <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <FileText className="text-white" size={24} />
                            </div>
                            Dados Lytex
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
                                <p className="text-sm text-blue-700 font-medium mb-1">ID Lytex</p>
                                <p className="font-mono text-sm bg-white px-3 py-2 rounded-lg text-gray-900 font-bold break-all">
                                    {subcontaData.lytexId}
                                </p>
                            </div>

                            {subcontaData._id && (
                                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
                                    <p className="text-sm text-purple-700 font-medium mb-1">ID Local</p>
                                    <p className="font-mono text-sm bg-white px-3 py-2 rounded-lg text-gray-900 font-bold break-all">
                                        {subcontaData._id}
                                    </p>
                                </div>
                            )}

                            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
                                <p className="text-sm text-green-700 font-medium mb-2">Credenciais API</p>
                                <span className={`inline-flex items-center gap-2 px-4 py-2 ${subcontaData.hasCredentials ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'} rounded-xl text-sm font-bold`}>
                                    {subcontaData.hasCredentials ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {subcontaData.hasCredentials ? 'Configuradas' : 'Não configuradas'}
                                </span>
                            </div>

                            {subcontaData.clientId && (
                                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border-2 border-indigo-200">
                                    <p className="text-sm text-indigo-700 font-medium mb-1">Client ID</p>
                                    <p className="font-mono text-xs bg-white px-3 py-2 rounded-lg text-gray-900 font-bold break-all">
                                        {subcontaData.clientId}
                                    </p>
                                </div>
                            )}

                            {subcontaData.nomeCaixa && (
                                <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl border-2 border-pink-200 md:col-span-2">
                                    <p className="text-sm text-pink-700 font-medium mb-1">Caixa Associado</p>
                                    <p className="text-lg font-bold text-gray-900">{subcontaData.nomeCaixa}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Card de Dados Bancários */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8"
                >
                    <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <CreditCard className="text-white" size={24} />
                        </div>
                        Dados da Conta e Endereço
                    </h4>

                    {loadingBankAccount ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                            <p className="text-gray-600 font-medium">Carregando dados bancários...</p>
                        </div>
                    ) : bankAccountError && !bankAccountData ? (
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                            <p className="text-sm text-red-800 font-medium">{bankAccountError}</p>
                        </div>
                    ) : bankAccountData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bankAccountData.bank && (
                                <>
                                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
                                        <p className="text-sm text-blue-700 font-medium mb-1 flex items-center gap-2">
                                            <Building2 size={16} />
                                            Banco
                                        </p>
                                        <p className="text-lg font-bold text-gray-900">{bankAccountData.bank.name}</p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
                                        <p className="text-sm text-purple-700 font-medium mb-1">Código do Banco</p>
                                        <p className="font-mono text-lg bg-white px-3 py-2 rounded-lg text-gray-900 font-bold">
                                            {bankAccountData.bank.code}
                                        </p>
                                    </div>
                                </>
                            )}

                            {bankAccountData.agency && (
                                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
                                    <p className="text-sm text-green-700 font-medium mb-1">Agência</p>
                                    <p className="font-mono text-lg bg-white px-3 py-2 rounded-lg text-gray-900 font-bold">
                                        {bankAccountData.agency.number}
                                        {bankAccountData.agency.dv && `-${bankAccountData.agency.dv}`}
                                    </p>
                                </div>
                            )}

                            {bankAccountData.account && (
                                <>
                                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200">
                                        <p className="text-sm text-orange-700 font-medium mb-1">Tipo de Conta</p>
                                        <p className="text-lg font-bold text-gray-900 capitalize">{bankAccountData.account.type}</p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl border-2 border-pink-200 md:col-span-2">
                                        <p className="text-sm text-pink-700 font-medium mb-1">Conta</p>
                                        <p className="font-mono text-lg bg-white px-3 py-2 rounded-lg text-gray-900 font-bold">
                                            {bankAccountData.account.number}
                                            {bankAccountData.account.dv && `-${bankAccountData.account.dv}`}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={24} />
                                    <div>
                                        <p className="font-bold text-amber-900 mb-1">Nenhum dado bancário cadastrado</p>
                                        <p className="text-sm text-amber-700">Preencha o formulário abaixo para configurar sua conta e receber pagamentos.</p>
                                    </div>
                                </div>
                            </div>

                            <BankAccountForm
                                bankCode={selectedBankForSub?.code}
                                bankName={selectedBankForSub?.name}
                                agency={bankAgency}
                                agencyDv={bankAgencyDv}
                                account={bankAccount}
                                accountDv={bankAccountDv}
                                accountType={bankAccountType}
                                onChange={(data: any) => {
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

                            <div className="mt-8 pt-8 border-t-2 border-gray-100">
                                <h5 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="text-blue-600" size={20} />
                                    Endereço de Correspondência
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ModernInput
                                        label="CEP"
                                        value={addressZip}
                                        onChange={(e: any) => {
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                                            setAddressZip(digits);
                                        }}
                                        onBlur={async () => {
                                            const cep = String(addressZip || '').replace(/\D/g, '');
                                            if (cep.length !== 8) return;
                                            try {
                                                const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                                const data = await resp.json();
                                                if (!data?.erro) {
                                                    setAddressStreet(data.logradouro || addressStreet);
                                                    setAddressZone(data.bairro || addressZone);
                                                    setAddressCity(data.localidade || addressCity);
                                                    setAddressState(data.uf || addressState);
                                                }
                                            } catch { }
                                        }}
                                        placeholder="00000-000"
                                        icon={Hash}
                                        required
                                    />
                                    <ModernInput
                                        label="Rua"
                                        value={addressStreet}
                                        onChange={(e: any) => setAddressStreet(e.target.value)}
                                        icon={MapPin}
                                        required
                                    />
                                    <ModernInput
                                        label="Número"
                                        value={addressNumber}
                                        onChange={(e: any) => setAddressNumber(e.target.value)}
                                        icon={Hash}
                                        required
                                    />
                                    <ModernInput
                                        label="Complemento"
                                        value={addressComplement}
                                        onChange={(e: any) => setAddressComplement(e.target.value)}
                                    />
                                    <ModernInput
                                        label="Bairro"
                                        value={addressZone}
                                        onChange={(e: any) => setAddressZone(e.target.value)}
                                        icon={MapPin}
                                        required
                                    />
                                    <ModernInput
                                        label="Cidade"
                                        value={addressCity}
                                        onChange={(e: any) => setAddressCity(e.target.value)}
                                        icon={MapPin}
                                        required
                                    />
                                    <ModernInput
                                        label="Estado"
                                        value={addressState}
                                        onChange={(e: any) => setAddressState(e.target.value)}
                                        placeholder="UF"
                                        icon={MapPin}
                                        required
                                    />
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={handleSaveBankAccount}
                                disabled={savingBankAccount || !selectedBankForSub || !bankAgency || !bankAccount || !bankAccountDv}
                                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-3 mt-8"
                            >
                                {savingBankAccount ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        Salvando dados...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={24} />
                                        Confirmar Dados
                                    </>
                                )}
                            </motion.button>
                        </div>
                    )}
                </motion.div>

                {/* Card de Caixas Gerenciados */}
                {caixasGerenciados.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8"
                    >
                        <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Wallet className="text-white" size={24} />
                            </div>
                            Caixas Gerenciados ({caixasGerenciados.length})
                        </h4>
                        <div className="space-y-3">
                            {caixasGerenciados.map((caixa: any) => (
                                <motion.div
                                    key={caixa._id}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all"
                                >
                                    <span className="font-bold text-gray-900">{caixa.nome}</span>
                                    <span className={`px-4 py-2 rounded-xl text-sm font-bold ${caixa.status === 'ativo' ? 'bg-green-500 text-white' :
                                        caixa.status === 'completo' ? 'bg-blue-500 text-white' :
                                            caixa.status === 'finalizado' ? 'bg-gray-500 text-white' :
                                                'bg-yellow-500 text-white'
                                        }`}>
                                        {caixa.status || 'Rascunho'}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Card de Faturamento e Limites */}
                {/* ... (existing cards) ... */}


                {/* Informações Importantes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-8"
                >
                    <h4 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Info size={24} />
                        Informações Importantes
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-white/70 rounded-2xl">
                            <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={20} />
                            <p className="text-sm text-blue-900 font-medium">Saques processados em até 1 dia útil</p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-white/70 rounded-2xl">
                            <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={20} />
                            <p className="text-sm text-blue-900 font-medium">Sem taxa para transferências acima de R$ 100</p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-white/70 rounded-2xl">
                            <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={20} />
                            <p className="text-sm text-blue-900 font-medium">Suporte de segunda a sexta, 9h às 18h</p>
                        </div>
                        {!subcontaData?.hasCredentials && (
                            <div className="flex items-start gap-3 p-4 bg-orange-100 rounded-2xl">
                                <AlertCircle className="text-orange-600 mt-1 flex-shrink-0" size={20} />
                                <p className="text-sm text-orange-900 font-medium">Credenciais API não configuradas - solicite ao master</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CarteiraDataAccounts;