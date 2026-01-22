import { useState, useEffect, useRef } from 'react';
import { bancosService } from '../../lib/api';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Bank {
    code: string;
    name: string;
}

interface SearchableBankSelectProps {
    value?: string; // Bank code
    onChange: (code: string, name: string) => void;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export function SearchableBankSelect({
    value,
    onChange,
    disabled = false,
    className,
    error
}: SearchableBankSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [banks, setBanks] = useState<Bank[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch initial banks or search
    const fetchBanks = async (search: string = '') => {
        setLoading(true);
        try {
            const response = await bancosService.getAll(search);
            const list = Array.isArray(response?.banks) ? response.banks : (Array.isArray(response) ? response : []);
            const mapped = list.map((b: any) => ({
                code: String(b.code || b.codigo || ''),
                name: String(b.name || b.nome || '')
            })).filter((b: Bank) => b.code && b.name);
            setBanks(mapped);
        } catch (err) {
            console.error('Error fetching banks:', err);
            // Keep existing banks if error
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchBanks('');
    }, []);

    // Sync internal state with prop value
    useEffect(() => {
        if (value) {
            const found = banks.find(b => b.code === value);
            if (found) {
                setSelectedBank(found);
            } else if (banks.length > 0) {
                // If value exists but not in current list (maybe search filtered it out), we might want to fetch it specifically or just keep the code.
                // For now, if we have a value but no bank object, we try to find it in the full list if we hadn't searched yet.
            }
        } else {
            setSelectedBank(null);
        }
    }, [value, banks]);


    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setIsOpen(true);

        // Debounce inside the effect or just simple timeout here
        const timeoutId = setTimeout(() => {
            fetchBanks(term);
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    const handleSelect = (bank: Bank) => {
        setSelectedBank(bank);
        onChange(bank.code, bank.name);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco <span className="text-red-500">*</span>
            </label>

            <div
                className={cn(
                    "relative w-full border rounded-lg bg-white transition-all cursor-pointer",
                    error ? "border-red-300 focus-within:ring-red-200" : "border-gray-300 focus-within:ring-blue-100 focus-within:border-blue-500",
                    disabled && "bg-gray-50 cursor-not-allowed opacity-75"
                )}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between px-3 py-2.5">
                    {selectedBank ? (
                        <span className="text-gray-900 text-sm">{selectedBank.code} - {selectedBank.name}</span>
                    ) : (
                        <span className="text-gray-400 text-sm">Selecione o banco</span>
                    )}
                    <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                autoFocus
                                placeholder="Buscar por código ou nome..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm">Buscando bancos...</span>
                            </div>
                        ) : banks.length > 0 ? (
                            <ul className="py-1">
                                {banks.map((bank) => (
                                    <li
                                        key={bank.code}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(bank);
                                        }}
                                        className={cn(
                                            "px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between",
                                            selectedBank?.code === bank.code && "bg-blue-50 text-blue-700 font-medium"
                                        )}
                                    >
                                        <span>{bank.name}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-mono",
                                            selectedBank?.code === bank.code ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                                        )}>{bank.code}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-sm">
                                Nenhum banco encontrado com "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
