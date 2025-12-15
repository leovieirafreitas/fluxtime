import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Option {
    value: number | string;
    label: string;
}

interface CustomSelectProps {
    value: number | string;
    onChange: (value: number | string) => void;
    options: Option[];
    suffix?: string;
    searchable?: boolean;
    placeholder?: string;
}

export default function CustomSelect({ value, onChange, options, suffix = '', searchable = false, placeholder = 'Selecione...' }: CustomSelectProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all flex items-center justify-between text-left ${theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-700 text-white hover:bg-zinc-900'
                    : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                    }`}
            >
                <span className={`font-medium truncate ${!selectedOption ? 'opacity-50' : ''}`}>
                    {selectedOption ? `${selectedOption.label}${suffix ? ` ${suffix}` : ''}` : placeholder}
                </span>
                <ChevronDown
                    className={`w-5 h-5 transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                        }`}
                />
            </button>

            {isOpen && (
                <div
                    className={`absolute z-50 w-full mt-2 rounded-lg border shadow-xl overflow-hidden ${theme === 'dark'
                        ? 'bg-zinc-950 border-zinc-700'
                        : 'bg-white border-slate-200'
                        }`}
                >
                    {searchable && (
                        <div className={`p-2 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-100'}`}>
                            <div className={`flex items-center px-3 py-2 rounded-md ${theme === 'dark' ? 'bg-zinc-900' : 'bg-slate-100'} `}>
                                <Search className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar..."
                                    className={`w-full bg-transparent outline-none text-sm ${theme === 'dark' ? 'text-white placeholder-zinc-500' : 'text-slate-900 placeholder-slate-500'}`}
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${option.value === value
                                        ? theme === 'dark'
                                            ? 'bg-blue-900/40 text-blue-300'
                                            : 'bg-blue-50 text-blue-700'
                                        : theme === 'dark'
                                            ? 'text-zinc-200 hover:bg-zinc-900'
                                            : 'text-slate-900 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="font-medium truncate mr-2">
                                        {option.label}
                                        {suffix && ` ${suffix}`}
                                    </span>
                                    {option.value === value && (
                                        <Check className="w-4 h-4 text-blue-500 shrink-0" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className={`p-4 text-center text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'}`}>
                                Nenhuma opção encontrada
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
