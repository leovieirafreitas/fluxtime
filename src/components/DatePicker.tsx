import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    accentColor?: string;
    minDate?: Date;
    maxDate?: Date;
}

export default function DatePicker({ selectedDate, onDateChange, accentColor = '#6366f1', minDate, maxDate }: DatePickerProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    const days = getDaysInMonth(currentMonth);

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        onDateChange(today);
    };

    const isToday = (day: number | null) => {
        if (!day) return false;
        const today = new Date();
        return (
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (day: number | null) => {
        if (!day) return false;
        return (
            day === selectedDate.getDate() &&
            currentMonth.getMonth() === selectedDate.getMonth() &&
            currentMonth.getFullYear() === selectedDate.getFullYear()
        );
    };

    const isPastDate = (day: number | null) => {
        if (!day || !minDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date < minDate;
    };

    const isFutureDate = (day: number | null) => {
        if (!day || !maxDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Set time to end of day for maxDate comparison
        const maxDateEndOfDay = new Date(maxDate);
        maxDateEndOfDay.setHours(23, 59, 59, 999);
        return date > maxDateEndOfDay;
    };

    const handleDayClick = (day: number | null) => {
        if (!day) return;
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        // Check if date is in the past
        if (minDate && newDate < minDate) return;

        // Check if date is beyond max date
        if (maxDate) {
            const maxDateEndOfDay = new Date(maxDate);
            maxDateEndOfDay.setHours(23, 59, 59, 999);
            if (newDate > maxDateEndOfDay) return;
        }

        onDateChange(newDate);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>

                <h3 className="text-lg font-bold text-slate-900">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((name) => (
                    <div
                        key={name}
                        className="text-center text-xs font-semibold text-slate-500 py-2"
                    >
                        {name}
                    </div>
                ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                    const selected = isSelected(day);
                    const today = isToday(day);
                    const past = isPastDate(day);

                    return (
                        <button
                            key={index}
                            onClick={() => handleDayClick(day)}
                            disabled={!day || past || isFutureDate(day)}
                            className={`
                                aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                                ${!day ? 'invisible' : ''}
                                ${past || isFutureDate(day) ? 'text-slate-300 cursor-not-allowed' : ''}
                                ${selected
                                    ? 'text-white shadow-lg scale-105'
                                    : today
                                        ? 'bg-slate-100 text-slate-900 font-bold'
                                        : 'text-slate-700 hover:bg-slate-50'
                                }
                                ${!selected && !past && day ? 'hover:scale-105' : ''}
                            `}
                            style={selected ? { backgroundColor: accentColor } : {}}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <button
                    onClick={() => onDateChange(selectedDate)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                    Limpar
                </button>
                <button
                    onClick={goToToday}
                    className="text-sm font-medium hover:underline transition-colors"
                    style={{ color: accentColor }}
                >
                    Hoje
                </button>
            </div>
        </div>
    );
}
