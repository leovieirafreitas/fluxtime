import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomDatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    minDate?: Date;
    maxDate?: Date;
    isDateDisabled?: (date: Date) => boolean;
}

export default function CustomDatePicker({
    value,
    onChange,
    label,
    minDate,
    maxDate,
    isDateDisabled
}: CustomDatePickerProps) {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
    const [currentMonth, setCurrentMonth] = useState(initialDate);

    const formattedDate = value ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR') : '';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const selectDate = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dia = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${dia}`);
        setIsOpen(false);
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
        const yyyymmdd = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const isSelected = value === yyyymmdd;
        const isToday = new Date().toDateString() === currentDate.toDateString();

        // Check constraints
        let isDisabled = false;

        // Reset time for comparison
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);

        if (minDate && checkDate < new Date(minDate.setHours(0, 0, 0, 0))) isDisabled = true;
        if (maxDate && checkDate > new Date(maxDate.setHours(0, 0, 0, 0))) isDisabled = true;
        if (isDateDisabled && isDateDisabled(checkDate)) isDisabled = true;

        days.push(
            <button
                type="button"
                key={i}
                onClick={() => !isDisabled && selectDate(i)}
                disabled={isDisabled}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors 
                    ${isDisabled
                        ? 'opacity-25 cursor-not-allowed bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600'
                        : isSelected
                            ? 'bg-blue-600 text-white'
                            : isToday
                                ? theme === 'dark' ? 'bg-zinc-800 text-blue-400 border border-blue-900' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                : theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-900' : 'text-slate-700 hover:bg-slate-100'
                    }`}
            >
                {i}
            </button>
        );
    }

    const monthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

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
                    {formattedDate || 'Selecione a data'}
                </span>
                <CalendarIcon className={`w-5 h-5 transition-colors ${theme === 'dark' ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-50 mt-2 p-4 rounded-xl shadow-xl border w-[320px] left-0 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <button type="button" onClick={prevMonth} className={`p-1 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-white' : 'hover:bg-slate-100 text-slate-900'}`}>
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-sm">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button type="button" onClick={nextMonth} className={`p-1 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-white' : 'hover:bg-slate-100 text-slate-900'}`}>
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                            <span key={i} className="text-xs font-bold opacity-50">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 justify-items-center">
                        {days}
                    </div>
                </div>
            )}
        </div>
    );
}
