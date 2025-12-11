
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import {
    Menu,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    Settings,
    ChevronDown
} from 'lucide-react';

export default function Appointments() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme } = useTheme();
    const [zoomLevel, setZoomLevel] = useState(100);
    const [showBusinessHours, setShowBusinessHours] = useState(true);
    const [splitCollaborators, setSplitCollaborators] = useState(true);
    const [showSettings, setShowSettings] = useState(true);
    const [numDays, setNumDays] = useState(7);
    const [businessHours, setBusinessHours] = useState<any[]>([]);
    const [companyTimezone, setCompanyTimezone] = useState('America/Sao_Paulo'); // Default fallback
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
    const { profile } = useUserProfile();

    // New states for Rules and Appointments
    const [schedulingRules, setSchedulingRules] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    useEffect(() => {
        if (profile?.company_id) {
            fetchCompanySettings();
            fetchSchedulingRules();
            fetchAppointments();
        }
    }, [profile, currentDate, viewMode, numDays]); // Re-fetch appointments when date changes

    const fetchCompanySettings = async () => {
        try {
            // Fetch Timezone
            const { data: companyData } = await supabase
                .from('companies')
                .select('timezone')
                .eq('id', profile?.company_id)
                .single();

            if (companyData?.timezone) {
                setCompanyTimezone(companyData.timezone);
            }

            // Fetch Business Hours
            const { data: hoursData } = await supabase
                .from('business_hours')
                .select('*')
                .eq('company_id', profile?.company_id);

            if (hoursData) {
                setBusinessHours(hoursData);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const fetchSchedulingRules = async () => {
        try {
            const { data } = await supabase
                .from('company_scheduling_rules')
                .select('*')
                .eq('company_id', profile?.company_id)
                .single();

            if (data) {
                setSchedulingRules(data);
            }
        } catch (error) {
            console.error('Error fetching rules:', error);
        }
    };

    const fetchAppointments = async () => {
        try {
            // Determine date range based on view
            let startDate = new Date(currentDate);
            startDate.setHours(0, 0, 0, 0); // RESET TIME TO MIDNIGHT

            let endDate = new Date(startDate);

            if (viewMode === 'grid') {
                if (numDays === 7) {
                    const day = startDate.getDay();
                    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                    startDate.setDate(diff); // Set to Monday
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 7);
                } else {
                    endDate = new Date(startDate); // Clone correct start date
                    endDate.setDate(startDate.getDate() + numDays);
                }
            } else {
                // Month view - fetch whole month + padding
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0); // Ensure midnight
                // Go back a week for padding
                startDate.setDate(startDate.getDate() - 7);

                endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999); // End of last day
                // Go forward a week for padding
                endDate.setDate(endDate.getDate() + 7);
            }

            // Format for Supabase
            // Use just date part or ISO string
            // Assuming start_time is timestampz or timestamp

            const startStr = startDate.toISOString();
            const endStr = endDate.toISOString();

            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    end_time,
                    client_name,
                    status,
                    notes,
                    service:services(name, duration_minutes, price),
                    professional:profiles(full_name)
                `)
                .eq('company_id', profile?.company_id)
                .gte('start_time', startStr)
                .lte('start_time', endStr);

            if (error) {
                console.error('Error fetching appointments query:', error);
                throw error;
            }

            if (data) {
                // Process appointments to ensure duration/end_time
                const processed = data.map((apt: any) => {
                    let end = apt.end_time ? new Date(apt.end_time) : null;
                    const start = new Date(apt.start_time);
                    if (!end && apt.service?.duration_minutes) {
                        end = new Date(start.getTime() + apt.service.duration_minutes * 60000);
                    } else if (!end) {
                        end = new Date(start.getTime() + 30 * 60000); // 30min default if no duration
                    }
                    return { ...apt, start_date: start, end_date: end };
                });
                console.log('Fetched appointments:', processed.length, processed);
                setAppointments(processed);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    const isDateAllowed = (date: Date) => {
        if (!schedulingRules?.scheduling_window_days) return true;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        // Don't allow past dates
        if (target < today) return false;

        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + schedulingRules.scheduling_window_days);

        return target <= maxDate;
    };

    const isBusinessOpen = (date: Date, hour: number) => {
        if (!showBusinessHours) return true;

        const dayOfWeek = date.getDay();
        const dayConfig = businessHours.filter(h => h.day_of_week === dayOfWeek && h.is_open);

        if (!dayConfig.length) return false;

        return dayConfig.some(slot => {
            const startH = parseInt(slot.start_time.split(':')[0]);
            const endH = parseInt(slot.end_time.split(':')[0]);
            return hour >= startH && hour < endH;
        });
    };

    const getCompanyTimeParts = () => {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: companyTimezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        return { hour, minute };
    };

    const { hour: currentHour, minute: currentMinute } = getCompanyTimeParts();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentTimeTopPct = ((currentHour * 60 + currentMinute) / (24 * 60)) * 100;

    const getWeekDays = (baseDate: Date, numberOfDays: number) => {
        const today = new Date(); // still needed for 'isToday' check
        const days = [];
        const isSevenDays = numberOfDays === 7;

        let startDate = new Date(baseDate);

        if (isSevenDays) {
            // Se for 7 dias, começa da Segunda-feira da semana atual
            const day = startDate.getDay();
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diff);
        }
        // Se não for 7 dias, começa de hoje

        for (let i = 0; i < numberOfDays; i++) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + i);

            days.push({
                name: current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
                date: current.getDate(),
                fullDate: new Date(current), // Access full date
                isToday: current.toDateString() === today.toDateString()
            });
        }
        return days;
    };

    const getMonthDays = (baseDate: Date) => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        const days = [];

        // Pad start (Monday start = 1, Sunday = 0)
        // Adjust logic for Monday start:
        // getDay(): Sun=0, Mon=1, ..., Sat=6
        // We want Mon=0, ..., Sun=6
        let startPadding = firstDay.getDay() - 1;
        if (startPadding === -1) startPadding = 6; // Sunday becomes 6

        // Add padding days from prev month
        for (let i = 0; i < startPadding; i++) {
            const paddingDate = new Date(year, month, 1 - (startPadding - i));
            days.push({
                date: paddingDate,
                isCurrentMonth: false,
                isToday: paddingDate.toDateString() === new Date().toDateString()
            });
        }

        // Add current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({
                date: date,
                isCurrentMonth: true,
                isToday: date.toDateString() === new Date().toDateString()
            });
        }

        // Pad end to complete 42 (6 rows) or 35 (5 rows) grid?
        // Usually calendars show 6 rows to cover edge cases.
        // Or just pad until multiple of 7
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const paddingDate = new Date(year, month + 1, i);
            days.push({
                date: paddingDate,
                isCurrentMonth: false,
                isToday: paddingDate.toDateString() === new Date().toDateString()
            });
        }

        return days;
    };

    const weekDays = getWeekDays(currentDate, numDays);
    const monthDays = getMonthDays(currentDate);

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }} className="min-h-screen transition-colors duration-300 flex">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 md:ml-64 h-screen flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b flex items-center justify-between">
                    <button onClick={() => setIsSidebarOpen(true)}>
                        <Menu className={theme === 'dark' ? 'text-white' : 'text-slate-900'} />
                    </button>
                </div>

                {/* Top Toolbar */}
                <header className={`px-6 py-3 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800 bg-black' : 'border-slate-200 bg-white'
                    }`}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <h1 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Agenda / {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                <span className="ml-2 text-xs font-normal text-slate-500">({companyTimezone})</span>
                            </h1>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg ml-2">
                                <button
                                    onClick={() => {
                                        const newDate = new Date(currentDate);
                                        if (viewMode === 'calendar') {
                                            newDate.setMonth(currentDate.getMonth() - 1);
                                        } else {
                                            newDate.setDate(currentDate.getDate() - (numDays === 7 ? 7 : 1));
                                        }
                                        setCurrentDate(newDate);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-l-lg transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                                </button>
                                <button
                                    onClick={() => {
                                        const newDate = new Date(currentDate);
                                        if (viewMode === 'calendar') {
                                            newDate.setMonth(currentDate.getMonth() + 1);
                                        } else {
                                            newDate.setDate(currentDate.getDate() + (numDays === 7 ? 7 : 1));
                                        }
                                        setCurrentDate(newDate);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-r-lg transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Hoje
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" />
                            Novo evento
                        </button>
                    </div>
                </header>

                {/* Sub-Header & Controls */}
                <div className={`px-6 py-2 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800 bg-black' : 'border-slate-200 bg-white'
                    }`}>
                    <span className="text-xs font-medium text-slate-500">
                        {appointments.length} agendamento(s)
                    </span>

                    <div className="flex items-center gap-4 relative">
                        {/* User Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white dark:border-slate-900 shadow-sm"></div>

                        {/* Visualização Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`px-3 py-1.5 flex items-center gap-2 text-sm font-medium border rounded-lg transition-colors ${theme === 'dark'
                                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Visualização
                                <ChevronDown className="w-3 h-3" />
                            </button>

                            {/* Settings Dropdown/Panel */}
                            {showSettings && (
                                <div className={`absolute top-full right-0 mt-2 w-80 rounded-xl shadow-xl border z-50 p-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                    }`}>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors ${viewMode === 'grid'
                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            Grade
                                        </button>
                                        <button
                                            onClick={() => setViewMode('calendar')}
                                            className={`flex-1 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors ${viewMode === 'calendar'
                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            Calendário
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Número de dias</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{numDays}</span>
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => setNumDays(n => Math.min(n + 1, 7))}
                                                        className="w-4 h-4 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded text-xs hover:bg-slate-200"
                                                    >+</button>
                                                    <button
                                                        onClick={() => setNumDays(n => Math.max(n - 1, 1))}
                                                        className="w-4 h-4 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded text-xs hover:bg-slate-200"
                                                    >-</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Zoom</span>
                                            <div className="flex items-center gap-2 border rounded-lg px-2 py-1 dark:border-slate-700">
                                                <button className="text-slate-500 hover:text-slate-700" onClick={() => setZoomLevel(z => Math.max(z - 5, 50))}>
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs w-8 text-center">{zoomLevel}%</span>
                                                <button className="text-slate-500 hover:text-slate-700" onClick={() => setZoomLevel(z => Math.min(z + 5, 150))}>
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Mostrar horário de funcionamento</span>
                                            <button
                                                onClick={() => setShowBusinessHours(!showBusinessHours)}
                                                className={`w-9 h-5 rounded-full relative transition-colors ${showBusinessHours ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${showBusinessHours ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5'
                                                    }`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Separar colaboradores em colunas</span>
                                            <button
                                                onClick={() => setSplitCollaborators(!splitCollaborators)}
                                                className={`w-9 h-5 rounded-full relative transition-colors ${splitCollaborators ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${splitCollaborators ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Calendar Grid */}
                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-neutral-900 relative flex flex-col">
                    {viewMode === 'grid' ? (
                        <>
                            {/* Header Row (Days) */}
                            <div className="flex sticky top-0 z-10 bg-white dark:bg-black border-b border-slate-200 dark:border-slate-800">
                                <div className="w-16 border-r border-slate-200 dark:border-slate-800 p-3 text-xs font-medium text-slate-400 flex items-center justify-center">
                                    GMT
                                </div>
                                {weekDays.map((day, index) => (
                                    <div key={index} className="flex-1 p-3 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
                                        <span className={`text-xs font-medium uppercase ${day.isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                                            {day.name}
                                        </span>
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${day.isToday ? 'bg-blue-600 text-white' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                                            }`}>
                                            {day.date}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Time Grid */}
                            <div className="flex-1 relative">
                                <div
                                    className="absolute left-0 right-0 z-20 pointer-events-none transition-all duration-300"
                                    style={{ top: `${currentTimeTopPct}%` }}
                                >
                                    <div className="flex items-center">
                                        {/* Time Label in the gutter */}
                                        <div className="w-16 flex items-center justify-end pr-2">
                                            <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                                                }`}>
                                                {currentTimeString}
                                            </span>
                                        </div>

                                        {/* Line across the grid - starting from the grid edge */}
                                        <div className="flex-1 h-px bg-slate-400 dark:bg-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.1)] relative">
                                            {/* Optional dot at start if desired, user ref seems to imply clean line or small indicator */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 -ml-0.5"></div>
                                        </div>
                                    </div>
                                </div>

                                {hours.map((hour) => (
                                    <div
                                        key={hour}
                                        className="flex border-b border-slate-100 dark:border-slate-800/50 transition-[height] duration-200 ease-in-out"
                                        style={{ height: `${(zoomLevel / 100) * 80}px` }}
                                    >
                                        {/* Time Label */}
                                        <div className="w-16 flex-none border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-black/50 text-xs text-slate-400 p-2 text-center">
                                            {hour.toString().padStart(2, '0')}:00
                                        </div>

                                        {/* Columns for Days */}
                                        {weekDays.map((day) => {
                                            const isOpen = isBusinessOpen(day.fullDate, hour);
                                            const isAllowed = isDateAllowed(day.fullDate);

                                            // Find appointments starting in this hour/day
                                            const cellAppointments = appointments.filter(apt => {
                                                const aptDate = apt.start_date;
                                                return aptDate.getDate() === day.date &&
                                                    aptDate.getMonth() === day.fullDate.getMonth() && // basic check
                                                    aptDate.getFullYear() === day.fullDate.getFullYear() &&
                                                    aptDate.getHours() === hour;
                                            });

                                            return (
                                                <div
                                                    key={`${day.name}-${hour}`}
                                                    className={`flex-1 border-r border-slate-100 dark:border-slate-800/50 relative group transition-colors 
                                                        ${!isAllowed
                                                            ? 'bg-slate-100/50 dark:bg-neutral-900/80 cursor-not-allowed'
                                                            : !isOpen && showBusinessHours
                                                                ? 'bg-slate-50/80 dark:bg-white/[0.02] bg-[length:12px_12px] repeating-linear-gradient-45' // simplified pattern class name or style
                                                                : 'bg-white/50 dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                                                        }`}
                                                    style={!isOpen && showBusinessHours ? { backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.04) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.04) 75%, transparent 75%, transparent)', backgroundSize: '12px 12px' } : {}}
                                                >
                                                    {/* Render Appointments */}
                                                    {cellAppointments.map(apt => {
                                                        const startMinutes = apt.start_date.getMinutes();
                                                        const duration = (apt.end_date.getTime() - apt.start_date.getTime()) / 60000;
                                                        const topPct = (startMinutes / 60) * 100;
                                                        const heightPct = (duration / 60) * 100;

                                                        return (
                                                            <div
                                                                key={apt.id}
                                                                className="absolute left-0.5 right-0.5 rounded text-xs border bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100 z-10 shadow-sm group cursor-pointer"
                                                                style={{
                                                                    top: `${topPct}%`,
                                                                    height: `${heightPct}%`,
                                                                    minHeight: '26px'
                                                                }}
                                                            >
                                                                {/* Default View (Clipped) */}
                                                                <div className="relative w-full h-full px-2 py-1 overflow-hidden">
                                                                    <div className="font-semibold truncate leading-tight">{apt.client_name}</div>
                                                                    <div className="truncate opacity-75 text-[10px] leading-tight">{apt.service?.name}</div>
                                                                </div>

                                                                {/* Hover Details Card */}
                                                                <div className="hidden group-hover:block absolute left-0 top-0 w-[200px] z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 min-h-full">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div>
                                                                            <span className="font-bold text-slate-900 dark:text-white block">{apt.client_name}</span>
                                                                            <span className="text-xs text-slate-500 dark:text-slate-400 block">{apt.service?.name}</span>
                                                                        </div>

                                                                        {apt.professional?.full_name && (
                                                                            <div className="text-xs">
                                                                                <span className="text-slate-500 dark:text-slate-400">Prof: </span>
                                                                                <span className="font-medium text-slate-700 dark:text-slate-300">{apt.professional.full_name}</span>
                                                                            </div>
                                                                        )}

                                                                        {apt.service?.price !== undefined && (
                                                                            <div className="text-xs">
                                                                                <span className="text-slate-500 dark:text-slate-400">Valor: </span>
                                                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(apt.service.price)}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {apt.notes && (
                                                                            <div className="text-xs border-t border-slate-100 dark:border-slate-700 pt-2 mt-1">
                                                                                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Obs:</span>
                                                                                <span className="text-slate-700 dark:text-slate-300 italic">{apt.notes}</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="text-[10px] text-slate-400 pt-1">
                                                                            {apt.start_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {apt.end_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {isAllowed && (
                                                        <button className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                                                            <Plus className="w-4 h-4 text-blue-600" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        // Month View Calendar
                        <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
                            {/* Month View Header */}
                            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Month Grid */}
                            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                                {monthDays.map((day, index) => {
                                    const isAllowed = isDateAllowed(day.date);

                                    // Count appointments for this day
                                    const dayAppointments = appointments.filter(apt =>
                                        apt.start_date.getDate() === day.date.getDate() &&
                                        apt.start_date.getMonth() === day.date.getMonth() &&
                                        apt.start_date.getFullYear() === day.date.getFullYear()
                                    );

                                    return (
                                        <div
                                            key={index}
                                            className={`border-b border-r border-slate-100 dark:border-slate-800/50 p-2 relative group transition-colors 
                                            ${!isAllowed ? 'bg-slate-50 dark:bg-neutral-900 opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/5'}
                                            ${!day.isCurrentMonth ? 'bg-slate-50/50 dark:bg-neutral-900/50 text-slate-400' : 'dark:bg-transparent'}
                                            `}
                                        >
                                            <div className={`text-xs font-medium mb-1 ${day.isToday
                                                ? 'w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full mx-auto md:mx-0'
                                                : 'text-slate-700 dark:text-slate-300'
                                                }`}>
                                                {day.date.getDate()}
                                            </div>

                                            {/* Indicators for appointments */}
                                            <div className="flex flex-col gap-1 mt-1">
                                                {dayAppointments.slice(0, 3).map(apt => (
                                                    <div key={apt.id} className="text-[10px] truncate px-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                        {apt.start_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {apt.client_name}
                                                    </div>
                                                ))}
                                                {dayAppointments.length > 3 && (
                                                    <div className="text-[10px] text-slate-400 pl-1">
                                                        + {dayAppointments.length - 3} mais
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
