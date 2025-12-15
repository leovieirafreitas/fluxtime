import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomTimePickerProps {
    value: string; // HH:mm
    onChange: (time: string) => void;
    label?: string;
    step?: number; // minutos
}

export default function CustomTimePicker({ value, onChange, label, step = 30 }: CustomTimePickerProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const generateTimes = () => {
        const times = [];
        for (let i = 0; i < 24 * 60; i += step) {
            const h = Math.floor(i / 60);
            const m = i % 60;
            const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            times.push(timeString);
        }
        return times;
    };

    const timeOptions = generateTimes();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const selectedEl = document.getElementById(`time-option-${value}`);
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'center' });
            }
        }
    }, [isOpen, value]);

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium mb-1.5 opacity-90">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all flex items-center justify-between group ${theme === 'dark'
                    ? 'bg-zinc-950 border-zinc-700 text-white hover:bg-zinc-900'
                    : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'
                    }`}
            >
                <span className={`font-medium ${!value ? 'opacity-50' : ''}`}>
                    {value || '00:00'}
                </span>
                <Clock className={`w-5 h-5 transition-colors ${theme === 'dark' ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-50 mt-2 rounded-xl shadow-xl border w-full max-h-60 overflow-y-auto ${theme === 'dark' ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-slate-200'}`}>
                    {timeOptions.map((time) => (
                        <button
                            key={time}
                            id={`time-option-${time}`}
                            type="button"
                            onClick={() => {
                                onChange(time);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left transition-colors font-medium border-l-4 ${time === value
                                ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-400'
                                : 'border-transparent text-slate-900 hover:bg-slate-100'
                                }`}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
