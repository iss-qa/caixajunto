import { useState, useRef, useEffect } from 'react';
import { bancosService } from '../../../lib/api';
import { SearchableBankSelect } from '../../../components/ui/SearchableBankSelect';

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
    const agencyRef = useRef<HTMLInputElement>(null);
    const agencyDvRef = useRef<HTMLInputElement>(null);
    const accountRef = useRef<HTMLInputElement>(null);
    const accountDvRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-4">
            {/* Banco e Tipo de Conta na mesma linha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Banco (Using SearchableBankSelect) - 2 colunas */}
                <div className="md:col-span-2">
                    <SearchableBankSelect
                        value={bankCode}
                        onChange={(code, name) => onChange({ bankCode: code, bankName: name })}
                        disabled={loadingBankData}
                    />
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
        </div>
    );
};
