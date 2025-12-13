import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Option {
    value: number | string;
    label: string;
}

interface CustomSelectProps {
    value: number | string;
    onChange: (value: number) => void;
    options: Option[];
    suffix?: string;
}

export default function CustomSelect({ value, onChange, options, suffix = '' }: CustomSelectProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all flex items-center justify-between ${theme === 'dark'
                        ? 'bg-black border-slate-700 text-white hover:bg-slate-900'
                        : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                    }`}
            >
                <span className="font-medium">
                    {selectedOption?.label}
                    {suffix && ` ${suffix}`}
                </span>
                <ChevronDown
                    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`absolute z-50 w-full mt-2 rounded-lg border shadow-xl max-h-64 overflow-y-auto ${theme === 'dark'
                            ? 'bg-slate-900 border-slate-700'
                            : 'bg-white border-slate-200'
                        }`}
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(Number(option.value));
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${option.value === value
                                    ? theme === 'dark'
                                        ? 'bg-blue-900/30 text-blue-400'
                                        : 'bg-blue-50 text-blue-600'
                                    : theme === 'dark'
                                        ? 'text-slate-300 hover:bg-slate-800'
                                        : 'text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <span className="font-medium">
                                {option.label}
                                {suffix && ` ${suffix}`}
                            </span>
                            {option.value === value && (
                                <Check className="w-5 h-5 text-blue-500" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
