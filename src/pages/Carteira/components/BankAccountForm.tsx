import { useState, useRef, useEffect } from 'react';
import { bancosService } from '../../../lib/api';

interface BankAccountFormProps {
    bankCode?: string;
    bankName?: string;
    agency: string;
    agencyDv: string;
    account: string;
    accountDv: string;
    accountType: 'corrente' | 'poupanca';
    onChange: (data: {
        bankCode?: string;
        bankName?: string;
        agency?: string;
        agencyDv?: string;
        account?: string;
        accountDv?: string;
        accountType?: 'corrente' | 'poupanca';
    }) => void;
    error?: string | null;
    loadingBankData?: boolean;
}

export const BankAccountForm = ({
    bankCode,
    bankName,
    agency,
    agencyDv,
    account,
    accountDv,
    accountType,
    onChange,
    error,
    loadingBankData
}: BankAccountFormProps) => {
    const [bankSearch, setBankSearch] = useState('');
    const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
    const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [localBanksError, setLocalBanksError] = useState<string | null>(null);

    const agencyRef = useRef<HTMLInputElement>(null);
    const agencyDvRef = useRef<HTMLInputElement>(null);
    const accountRef = useRef<HTMLInputElement>(null);
    const accountDvRef = useRef<HTMLInputElement>(null);

    // Sync internal search state with props when they change (e.g. loaded from API)
    useEffect(() => {
        if (bankCode && bankName) {
            // Avoid overwriting if user is typing search
            if (!bankDropdownOpen) {
                // Keep it simple, rely on parent for values mostly
            }
        }
    }, [bankCode, bankName, bankDropdownOpen]);


    const handleBankSearch = async (term: string) => {
        setBankSearch(term);
        if (term.length >= 2) {
            setBankDropdownOpen(true);
            setLoadingBanks(true);
            try {
                const resp = await bancosService.getAll(term);
                const list = Array.isArray(resp?.banks) ? resp.banks : (Array.isArray(resp) ? resp : []);
                setBanks(list.map((b: any) => ({ code: String(b.code || b.codigo || ''), name: String(b.name || b.nome || '') })));
            } catch (e: any) {
                setLocalBanksError('Erro ao buscar bancos');
            } finally {
                setLoadingBanks(false);
            }
        } else {
            setBankDropdownOpen(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Banco e Tipo de Conta na mesma linha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Banco (Dropdown) - 2 colunas */}
                <div className="md:col-span-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco *</label>
                    <input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={bankCode ? `${bankCode} - ${bankName}` : bankSearch}
                        onChange={(e) => {
                            // Clear selection if user types
                            onChange({ bankCode: undefined, bankName: undefined });
                            handleBankSearch(e.target.value);
                        }}
                        onFocus={() => bankSearch.length >= 2 && setBankDropdownOpen(true)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {bankDropdownOpen && banks.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {loadingBanks ? (
                                <div className="p-2 text-center text-sm text-gray-500">Carregando...</div>
                            ) : (
                                banks.map((bank) => (
                                    <button
                                        key={bank.code}
                                        type="button"
                                        onClick={() => {
                                            onChange({ bankCode: bank.code, bankName: bank.name });
                                            setBankSearch('');
                                            setBankDropdownOpen(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                    >
                                        {bank.code} - {bank.name}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Tipo de Conta - 1 coluna */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta *</label>
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            type="button"
                            onClick={() => onChange({ accountType: 'corrente' })}
                            className={`p-2 text-xs rounded-lg border ${accountType === 'corrente' ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200'}`}
                        >
                            Corrente
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ accountType: 'poupanca' })}
                            className={`p-2 text-xs rounded-lg border ${accountType === 'poupanca' ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200'}`}
                        >
                            Poupança
                        </button>
                    </div>
                </div>
            </div>

            {/* Agência e Conta na mesma linha */}
            <div className="grid grid-cols-12 gap-2">
                {/* Agência */}
                <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agência *</label>
                    <input
                        ref={agencyRef}
                        type="text"
                        placeholder="0000"
                        value={agency}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                            onChange({ agency: val });
                            if (val.length >= 4) { // Assumindo 4 como padrão comum, mas pode variar. UX: se 4 digitos, pula? Melhor não forçar se não for sempre 4.
                                // Mas o usuário pediu "experiencia melhor" e "perder foco impossibilitando digitar".
                                // O problema original era perder foco a cada digito. Isso era causado por key instability.
                                // Aqui vamos implementar auto-tab apenas no max length se for seguro.
                                // Deixando sem auto-tab agressivo para Agência por enquanto, focar no Dv.
                            }
                        }}
                        // Most banks have 4 digit agency without DV, sometimes 5.
                        maxLength={5}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {/* Dígito da Agência */}
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dígito</label>
                    <input
                        ref={agencyDvRef}
                        type="text"
                        placeholder="0"
                        value={agencyDv}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 1);
                            onChange({ agencyDv: val });
                            if (val.length === 1) {
                                accountRef.current?.focus();
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !agencyDv) {
                                agencyRef.current?.focus();
                            }
                        }}
                        maxLength={1}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {/* Conta */}
                <div className="col-span-5 md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conta *</label>
                    <input
                        ref={accountRef}
                        type="text"
                        placeholder="00000000"
                        value={account}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                            onChange({ account: val });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !account) {
                                agencyDvRef.current?.focus();
                            }
                        }}
                        maxLength={12}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {/* Dígito da Conta */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dígito *</label>
                    <input
                        ref={accountDvRef}
                        type="text"
                        placeholder="0"
                        value={accountDv}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                            onChange({ accountDv: val });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !accountDv) {
                                accountRef.current?.focus();
                            }
                        }}
                        maxLength={2}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
            {localBanksError && (
                <p className="text-xs text-red-500">{localBanksError}</p>
            )}
        </div>
    );
};
