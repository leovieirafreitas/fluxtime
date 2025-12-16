
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    MapPin,
    Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock,
    LogOut, Menu,
    Plus, Search, X, Zap, Coins, ExternalLink,
    Sun,
    Moon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import DefaultClientAvatar from '../components/DefaultClientAvatar';
import { getClientSession, clearClientSession } from '../lib/clientSession';

interface AppointmentType {
    id: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    service_name: string;
    service_price: number;
    service_duration: number;
    company_name: string;
    company_slug: string;
    company_logo_url: string;
    company_address: string;
    company_id: string;
    professional_name: string;
    professional_avatar_url: string;
    client_phone: string;
    client_email: string;
    payment_status?: 'paid' | 'unpaid' | string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const getStatusStyle = (status: string, theme: string) => {
    switch (status) {
        case 'confirmed':
            return theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
        case 'pending':
            return theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
        case 'cancelled':
            return theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
        case 'completed':
            return theme === 'dark' ? 'bg-neutral-800 text-gray-300' : 'bg-gray-100 text-gray-700';
        default:
            return theme === 'dark' ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-600';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'confirmed': return 'Confirmado';
        case 'pending': return 'Agendado';
        case 'cancelled': return 'Cancelado';
        case 'completed': return 'Finalizado';
        default: return status;
    }
};

import { useRef } from 'react';

export default function ClientDashboard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { theme, toggleTheme } = useTheme();
    const [clientName, setClientName] = useState('Cliente');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientJoinDate, setClientJoinDate] = useState<string>('');
    const [appointments, setAppointments] = useState<AppointmentType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filter, setFilter] = useState<'future' | 'past'>('future');
    const [paymentFilter, setPaymentFilter] = useState<'unpaid' | 'paid'>('unpaid');
    const [companySearch, setCompanySearch] = useState('');
    const [activeView, setActiveView] = useState<'appointments' | 'payments'>('appointments');


    const [dateFilter, setDateFilter] = useState<Date | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());

    const [isCompanySelectorOpen, setIsCompanySelectorOpen] = useState(false);
    const [companySelectorSearch, setCompanySelectorSearch] = useState('');

    // Modals
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentType | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const lastAppointmentRef = useRef<HTMLDivElement>(null);

    // Scroll effect to go to the last appointment on load
    useEffect(() => {
        if (!isLoading) {
            // Small timeout to ensure DOM is ready
            setTimeout(() => {
                lastAppointmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [isLoading]);


    useEffect(() => {
        const fetchDashboardData = async () => {
            const session = getClientSession();

            if (!session) {
                navigate('/client');
                return;
            }

            setClientName(session.name || 'Cliente');
            setClientEmail(session.email);

            let cleanPhone = null;
            if (session.phone) {
                let phoneToClean = session.phone.replace(/^\+55/, '').replace(/^55/, '');
                cleanPhone = phoneToClean.replace(/\D/g, '');
                setClientPhone(cleanPhone);
            }

            try {
                const { data: aptData, error: aptError } = await supabase.rpc('get_client_appointments', {
                    p_phone: cleanPhone,
                    p_email: session.email
                });

                if (aptError) throw aptError;

                setAppointments(aptData || []);

                if (cleanPhone) {
                    const { data: clientData } = await supabase.from('clients').select('created_at').eq('phone', session.phone).single();
                    if (clientData) setClientJoinDate(clientData.created_at);
                }

                // Check for appointment deep link
                const deepLinkAppointmentId = searchParams.get('appointmentId');
                if (deepLinkAppointmentId && aptData) {
                    const foundApp = aptData.find((a: any) => a.id === deepLinkAppointmentId);
                    if (foundApp) {
                        setSelectedAppointment(foundApp);
                    }
                }

            } catch (error) {

                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    const handleLogout = () => {
        clearClientSession();
        navigate('/client');
    };

    // Calculate duration for display
    const getDurationExample = (start: string, end: string) => {
        if (!start || !end) return '';
        const s = new Date(start);
        const e = new Date(end);
        const diff = (e.getTime() - s.getTime()) / 60000;
        return `(${diff} min)`;
    };

    const handleCancelAppointment = async () => {
        if (!selectedAppointment) return;
        if (!confirm('Tem certeza que deseja desmarcar este agendamento?')) return;

        try {
            const { error } = await supabase.rpc('client_cancel_appointment', {
                p_appointment_id: selectedAppointment.id,
                p_phone: clientPhone,
                p_email: clientEmail
            });

            if (error) throw error;

            // Update local state
            setAppointments(prev => prev.map(a =>
                a.id === selectedAppointment.id ? { ...a, status: 'cancelled' } : a
            ));
            setSelectedAppointment(null); // Close modal
            alert('Agendamento desmarcado com sucesso.');
        } catch (err: any) {
            console.error('Error canceling:', err);
            alert(`Erro ao cancelar agendamento: ${err.message || JSON.stringify(err)} `);
        }
    };

    const handleConfirmAppointment = async () => {
        if (!selectedAppointment) return;

        try {
            const { error } = await supabase.rpc('client_confirm_appointment', {
                p_appointment_id: selectedAppointment.id,
                p_phone: clientPhone,
                p_email: clientEmail
            });

            if (error) throw error;

            // Update local state
            setAppointments(prev => prev.map(a =>
                a.id === selectedAppointment.id ? { ...a, status: 'confirmed' } : a
            ));

            // Close modal or update selected appointment
            setSelectedAppointment(prev => prev ? { ...prev, status: 'confirmed' } : null);
            alert('Agendamento confirmado com sucesso!');
        } catch (err: any) {
            console.error('Error confirming:', err);
            alert(`Erro ao confirmar agendamento: ${err.message || JSON.stringify(err)} `);
        }
    };

    // Grouping Logic
    // Timeline Helpers
    const formatDateFull = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getMonthAbbr = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    };

    const getDay = (dateString: string) => {
        return new Date(dateString).getDate();
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const timeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Ontem';
        if (diffDays > 0) return `Há ${diffDays} dias`;

        const futureDays = Math.ceil((past.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (futureDays === 0) return 'Hoje';
        if (futureDays === 1) return 'Amanhã';
        return `Em ${futureDays} dias`;
    };

    const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start_time);

        if (dateFilter) {
            const d = new Date(dateFilter);
            d.setHours(0, 0, 0, 0);
            const check = new Date(aptDate);
            check.setHours(0, 0, 0, 0);
            return d.getTime() === check.getTime();
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filter === 'future' ? aptDate >= today : aptDate < today;
    });

    filteredAppointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (filter === 'past') filteredAppointments.reverse();

    // Timeline Events
    const timelineEvents = [
        ...filteredAppointments.map(a => ({ type: 'appointment', date: a.start_time, data: a })),
        ...(clientJoinDate ? [{ type: 'created', date: clientJoinDate, data: { name: clientName } }] : [])
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by company and find the latest appointment for each to use as 'lastInteraction'
    const companiesMap = new Map();
    appointments.forEach(app => {
        const existing = companiesMap.get(app.company_id);
        if (!existing || new Date(app.start_time) > new Date(existing.start_time)) {
            companiesMap.set(app.company_id, { ...app, lastInteraction: app.start_time });
        }
    });
    const uniqueCompanies = Array.from(companiesMap.values());

    return (
        <div className={`min-h-screen font-sans ${theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header */}
            <header className={`border-b h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <img src="/img/MarcaSite.png" alt="FluxTime" className="h-8 w-auto object-contain" />
                    <span className={`text-xl md:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>FluxTime</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-yellow-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className={`md:hidden p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-8 flex gap-8 h-[calc(100vh-64px)] overflow-hidden">
                {/* Sidebar (simplified for this view) */}
                <aside className={`w-64 flex-shrink-0 flex-col gap-6 md:bg-transparent
                    ${isSidebarOpen
                        ? (theme === 'dark' ? 'fixed inset-y-0 left-0 z-50 flex p-4 bg-black border-r border-neutral-800 shadow-2xl' : 'fixed inset-y-0 left-0 z-50 flex p-4 bg-slate-50 shadow-2xl')
                        : 'hidden md:flex'
                    }
                    transition-transform duration-300 overflow-y-auto`}>

                    {isSidebarOpen && (
                        <div className="flex items-center justify-between mb-2 md:hidden">
                            <div className="flex items-center gap-2">
                                <img src="/img/MarcaSite.png" alt="FluxTime" className="h-8 w-auto object-contain" />
                                <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>FluxTime</span>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className={`p-2 rounded-lg ${theme === 'dark' ? 'text-white hover:bg-neutral-800' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    )}



                    <nav className="space-y-1">
                        <button
                            onClick={() => setActiveView('appointments')}
                            className={`flex items-center gap-3 w-full p-2.5 rounded-lg border font-medium text-sm transition-all ${activeView === 'appointments'
                                ? (theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-900 shadow-sm')
                                : (theme === 'dark' ? 'border-transparent text-neutral-400 hover:bg-neutral-900' : 'border-transparent text-slate-600 hover:bg-slate-100')
                                }`}
                        >
                            <Calendar className={`w-4 h-4 ${activeView === 'appointments' ? 'text-blue-500' : 'text-slate-500'}`} /> Agendamentos
                        </button>
                        <button
                            onClick={() => setActiveView('payments')}
                            className={`flex items-center gap-3 w-full p-2.5 rounded-lg border font-medium text-sm transition-all ${activeView === 'payments'
                                ? (theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-900 shadow-sm')
                                : (theme === 'dark' ? 'border-transparent text-neutral-400 hover:bg-neutral-900' : 'border-transparent text-slate-600 hover:bg-slate-100')
                                }`}
                        >
                            <Coins className={`w-4 h-4 ${activeView === 'payments' ? 'text-blue-500' : 'text-slate-500'}`} /> Pagamentos
                        </button>
                    </nav>

                    <button className={`w-full flex items-center justify-center gap-2 py-3 border font-bold text-sm rounded-xl shadow-sm transition-all ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-blue-400 hover:bg-neutral-800' : 'bg-white border-indigo-100 hover:border-indigo-200 hover:shadow-md text-blue-600'}`}>
                        <Zap className="w-4 h-4 fill-current" /> Indique a FluxTime
                    </button>

                    {uniqueCompanies.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-neutral-800">
                            <div className="mb-4 space-y-2">
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                                    <Search className="w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar negócios..."
                                        value={companySearch}
                                        onChange={(e) => setCompanySearch(e.target.value)}
                                        className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400"
                                    />
                                </div>
                                <p className="text-xs text-slate-400 dark:text-neutral-500 px-1">
                                    Clique na foto de um negócio para filtrar
                                </p>
                            </div>

                            <div className="space-y-4">
                                {uniqueCompanies
                                    .filter(c => c.company_name.toLowerCase().includes(companySearch.toLowerCase()))
                                    .map(company => (
                                        <div key={company.company_id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {company.company_logo_url ? (
                                                    <img src={company.company_logo_url} className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-neutral-800" />
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border ${theme === 'dark' ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-slate-200 text-slate-600 border-slate-100'}`}>
                                                        {company.company_name?.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                        {company.company_name}
                                                    </p>
                                                    <p className={`text-xs ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-500'}`}>
                                                        {timeAgo(company.lastInteraction)}
                                                    </p>
                                                </div>
                                            </div>

                                            <a
                                                href={`/${company.company_slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${theme === 'dark' ? 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                            >
                                                Acessar <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className={`mt-auto px-4 py-3 border rounded-xl shadow-sm ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <DefaultClientAvatar size={40} className="flex-shrink-0" />
                            <div className="overflow-hidden">
                                <p className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{clientName}</p>
                                <p className="text-xs text-slate-500">Cliente</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="text-red-600 text-xs font-medium hover:underline flex items-center gap-1">
                            <LogOut className="w-3 h-3" /> Sair da conta
                        </button>
                    </div>


                </aside>

                {/* Main Content - Two Columns (Timeline + Right Sidebar) */}
                <main className="flex-1 min-w-0 flex flex-col md:flex-row gap-6 overflow-hidden">
                    {/* Left Column: Timeline */}
                    <div className={`flex-1 rounded-xl border flex flex-col min-h-0 ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>
                        {/* Header Tabs within the Card */}
                        <div className={`p-4 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                            <h2 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{activeView === 'appointments' ? 'Agendamentos' : 'Pagamentos'}</h2>
                            <div className={`p-1 rounded-lg flex items-center gap-1 w-full md:w-auto overflow-x-auto md:overflow-visible ${theme === 'dark' ? 'bg-neutral-900' : 'bg-slate-100'}`}>
                                {activeView === 'appointments' ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setFilter('future');
                                                setDateFilter(null);
                                            }}
                                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${filter === 'future' && !dateFilter
                                                ? (theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                                                : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                                        >
                                            Futuros
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFilter('past');
                                                setDateFilter(null);
                                            }}
                                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${filter === 'past' && !dateFilter
                                                ? (theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                                                : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                                        >
                                            Passados
                                        </button>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-all flex items-center gap-1 ${dateFilter
                                                    ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400 ring-1 ring-blue-500' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-500')
                                                    : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                                            >
                                                {dateFilter ? dateFilter.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Por data'}
                                                <ChevronDown className="w-3 h-3" />
                                            </button>

                                            {isCalendarOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[60] bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsCalendarOpen(false)} />
                                                    <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-xs md:absolute md:inset-auto md:top-full md:right-0 md:left-auto md:translate-x-0 md:translate-y-0 md:mt-2 p-4 rounded-xl shadow-2xl border z-[70] md:w-72 animate-scale-in ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                        {/* Calendar Header */}
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className={`font-bold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                                {calendarViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                                            </h4>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const d = new Date(calendarViewDate);
                                                                        d.setMonth(d.getMonth() - 1);
                                                                        setCalendarViewDate(d);
                                                                    }}
                                                                    className={`p-1 rounded hover:bg-opacity-80 ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                                                >
                                                                    <ChevronLeft className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const d = new Date(calendarViewDate);
                                                                        d.setMonth(d.getMonth() + 1);
                                                                        setCalendarViewDate(d);
                                                                    }}
                                                                    className={`p-1 rounded hover:bg-opacity-80 ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Calendar Grid */}
                                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
                                                                <div key={day} className={`text-center text-[10px] font-bold ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'}`}>
                                                                    {day}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="grid grid-cols-7 gap-1">
                                                            {(() => {
                                                                const days = [];
                                                                const year = calendarViewDate.getFullYear();
                                                                const month = calendarViewDate.getMonth();
                                                                const firstDay = new Date(year, month, 1).getDay();
                                                                const daysInMonth = new Date(year, month + 1, 0).getDate();

                                                                // Empty slots
                                                                for (let i = 0; i < firstDay; i++) {
                                                                    days.push(<div key={`empty-${i}`} className="h-8" />);
                                                                }

                                                                // Days
                                                                for (let i = 1; i <= daysInMonth; i++) {
                                                                    const dayDate = new Date(year, month, i);
                                                                    const isSelected = dateFilter &&
                                                                        dayDate.getDate() === dateFilter.getDate() &&
                                                                        dayDate.getMonth() === dateFilter.getMonth() &&
                                                                        dayDate.getFullYear() === dateFilter.getFullYear();

                                                                    const isToday = dayDate.toDateString() === new Date().toDateString();

                                                                    let btnClass = theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-800' : 'text-slate-700 hover:bg-slate-100';
                                                                    if (isSelected) btnClass = 'bg-blue-600 text-white shadow-md hover:bg-blue-700';
                                                                    else if (isToday) btnClass = theme === 'dark' ? 'text-blue-400 border border-blue-900' : 'text-blue-600 border border-blue-200';

                                                                    days.push(
                                                                        <button
                                                                            key={i}
                                                                            onClick={() => {
                                                                                setDateFilter(dayDate);
                                                                                setIsCalendarOpen(false);
                                                                            }}
                                                                            className={`h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${btnClass}`}
                                                                        >
                                                                            {i}
                                                                        </button>
                                                                    );
                                                                }
                                                                return days;
                                                            })()}
                                                        </div>

                                                        {dateFilter && (
                                                            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-neutral-800">
                                                                <button
                                                                    onClick={() => {
                                                                        setDateFilter(null);
                                                                        setIsCalendarOpen(false);
                                                                    }}
                                                                    className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                                >
                                                                    Limpar filtro
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setPaymentFilter('unpaid')}
                                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${paymentFilter === 'unpaid'
                                                ? (theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                                                : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                                        >
                                            Não pagos
                                        </button>
                                        <button
                                            onClick={() => setPaymentFilter('paid')}
                                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-all ${paymentFilter === 'paid'
                                                ? (theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                                                : (theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
                                        >
                                            Pagos
                                        </button>
                                    </>
                                )}
                            </div>
                        </div >

                        <div className="flex-1 overflow-y-auto px-6 space-y-0 relative pt-4">
                            {/* Vertical Line Removed */}

                            {activeView === 'appointments' ? (
                                <>
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12 pl-[60px] md:pl-[88px]">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : timelineEvents.length === 0 ? (
                                        <div className="py-12 pl-[60px] md:pl-[88px] text-slate-500 text-sm">
                                            Nenhum agendamento encontrado.
                                        </div>
                                    ) : (
                                        timelineEvents.map((event: any, index) => {
                                            const isToday = new Date(event.date).toDateString() === new Date().toDateString();
                                            const prevEvent = index > 0 ? timelineEvents[index - 1] : null;
                                            const showDateLabel = !prevEvent || new Date(prevEvent.date).toDateString() !== new Date(event.date).toDateString();

                                            if (event.type === 'created') {
                                                return (
                                                    <div key="created" className="flex w-full items-start relative mb-8">
                                                        <div className="w-[60px] pr-2 md:w-[88px] md:pr-6 text-right text-xs text-slate-400 font-mono pt-3">
                                                            {/* Year removed */}
                                                        </div>
                                                        <div className="flex-1 relative pl-4 pb-4">
                                                            {/* Star removed */}
                                                            <div className={`absolute left-[-5px] top-6 w-2.5 h-2.5 rounded-full z-10 ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-300'}`} />
                                                            <div className={`p-4 rounded-xl border border-dashed text-center ${theme === 'dark' ? 'bg-neutral-900/50 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                                                                <span className={`text-xs ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-500'}`}>Cliente desde {formatDateFull(event.date)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={event.data.id} className="relative mb-2" ref={index === timelineEvents.length - 1 ? lastAppointmentRef : null}>
                                                    {showDateLabel && (
                                                        <div className="flex w-full items-center mb-6 mt-4">
                                                            <div className="w-[60px] pr-2 md:w-[88px] md:pr-6 text-right text-xs text-slate-400 font-mono">
                                                                {isToday ? <span className="text-blue-500 font-bold">Hoje</span> : timeAgo(event.date)}
                                                            </div>
                                                            <div className={`flex-1 h-[1px] relative ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                                                                <span className={`absolute left-4 -top-2.5 px-2 text-xs ${theme === 'dark' ? 'text-neutral-600 bg-black' : 'text-slate-400 bg-white'}`}>
                                                                    {formatDateFull(event.date)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex w-full items-start group">
                                                        <div className="w-[60px] pr-2 md:w-[88px] md:pr-6 text-right flex flex-col items-end pt-1">
                                                            <span className={`text-xs md:text-sm font-bold font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatTime(event.data.start_time)}</span>
                                                            <span className="text-[9px] md:text-[10px] text-slate-400">{formatTime(event.data.end_time)}</span>
                                                        </div>

                                                        <div className="flex-1 pb-8">
                                                            <div className="flex items-center gap-2 mb-2 pl-4 text-sm w-full">
                                                                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{event.data.status === 'confirmed' ? 'Atendimento' : 'Agendamento'}</span>
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${getStatusStyle(event.data.status, theme)}`}>
                                                                    <span className="md:hidden">
                                                                        {event.data.status === 'confirmed' ? 'Conf.' :
                                                                            event.data.status === 'pending' ? 'Agend.' :
                                                                                event.data.status === 'cancelled' ? 'Canc.' :
                                                                                    event.data.status === 'completed' ? 'Fin.' : event.data.status}
                                                                    </span>
                                                                    <span className="hidden md:inline">
                                                                        {getStatusLabel(event.data.status)}
                                                                    </span>
                                                                </span>
                                                                <span className={`whitespace-nowrap px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${event.data.payment_status === 'paid'
                                                                    ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')
                                                                    : (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')
                                                                    }`}>
                                                                    {event.data.payment_status === 'paid' ? 'Pago' : 'Não pago'}
                                                                </span>

                                                                <div className="ml-auto">
                                                                    <button
                                                                        onClick={() => setSelectedAppointment(event.data)}
                                                                        className={`px-2 py-1 text-xs font-medium border rounded-md flex items-center gap-1 shadow-sm transition-colors ${theme === 'dark' ? 'bg-black border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                                        Ações <ChevronDown className="w-3 h-3 text-slate-400" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="relative pl-4">
                                                                <div className="absolute left-[-16px] top-[-14px] w-5 h-8 border-b border-l rounded-bl-xl border-slate-200 dark:border-neutral-800 pointer-events-none" />
                                                                <div
                                                                    onClick={() => setSelectedAppointment(event.data)}
                                                                    className={`rounded-xl border p-2 hover:shadow-sm transition-all bg-opacity-50 cursor-pointer ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3 md:gap-4">
                                                                            <div className={`flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg border flex-shrink-0 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                                                                <span className="text-[8px] md:text-[9px] uppercase font-bold text-blue-500">{getMonthAbbr(event.date)}</span>
                                                                                <span className="text-lg md:text-xl font-bold leading-none">{getDay(event.date)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{event.data.service_name}</h4>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(event.data.start_time)} &rarr; {formatTime(event.data.end_time)}</span>
                                                                                    <span className="flex items-center gap-1 opacity-70"><MapPin className="w-3 h-3" /> {event.data.company_address}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 pr-2">
                                                                            <span className={`text-xs font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                                                {event.data.company_name}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* "Agora" Section */}
                                    <div className="relative pb-8 mt-2">
                                        <div className="flex w-full items-start">
                                            <div className="w-[60px] pr-2 md:w-[88px] md:pr-6 text-right text-xs text-slate-400 font-mono pt-3">
                                                Agora
                                            </div>
                                            <div className="flex-1 relative pl-4">
                                                <div className={`absolute left-[-8px] top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 ${theme === 'dark' ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-300'}`}>
                                                    <Plus className="w-2.5 h-2.5 text-slate-500" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-4 mt-2">
                                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Comece aqui</span>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setIsCompanySelectorOpen(true)} className={`w-24 h-24 rounded-xl border shadow-sm flex flex-col items-center justify-center gap-2 transition-all hover:border-blue-500 hover:shadow-md group ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-neutral-300' : 'text-slate-700'}`}>Agendar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-6 space-y-8 animate-fade-in">
                                    {/* Unpaid Section */}
                                    {paymentFilter === 'unpaid' && (
                                        <div>
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Em Aberto / Não Pago
                                                <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full">
                                                    {appointments.filter(a => (a.status === 'confirmed' || a.status === 'pending') && (a.payment_status !== 'paid')).length}
                                                </span>
                                            </h3>
                                            <div className="space-y-3">
                                                {appointments.filter(a => (a.status === 'confirmed' || a.status === 'pending') && (a.payment_status !== 'paid')).length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic">Nenhum pagamento pendente.</p>
                                                ) : (
                                                    appointments.filter(a => (a.status === 'confirmed' || a.status === 'pending') && (a.payment_status !== 'paid')).map(app => (
                                                        <div key={app.id} onClick={() => setSelectedAppointment(app)} className={`p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all flex items-center justify-between ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                                                                    <Coins className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{app.service_name}</h4>
                                                                    <p className="text-xs text-slate-500">{new Date(app.start_time).toLocaleDateString('pt-BR')} • {app.company_name}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(app.service_price)}</p>
                                                                <span className="text-[10px] font-bold text-red-500 uppercase">Não pago</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Paid Section */}
                                    {paymentFilter === 'paid' && (
                                        <div>
                                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Pagos / Realizados
                                                <span className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full">
                                                    {appointments.filter(a => a.payment_status === 'paid' || a.status === 'completed').length}
                                                </span>
                                            </h3>
                                            <div className="space-y-3">
                                                {appointments.filter(a => a.payment_status === 'paid' || a.status === 'completed').length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic">Nenhum pagamento realizado.</p>
                                                ) : (
                                                    appointments.filter(a => a.payment_status === 'paid' || a.status === 'completed').map(app => (
                                                        <div key={app.id} onClick={() => setSelectedAppointment(app)} className={`p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all flex items-center justify-between opacity-70 hover:opacity-100 ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                                                    <Check className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{app.service_name}</h4>
                                                                    <p className="text-xs text-slate-500">{new Date(app.start_time).toLocaleDateString('pt-BR')} • {app.company_name}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(app.service_price)}</p>
                                                                <span className="text-[10px] font-bold text-green-500 uppercase">Pago</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Company Selector Modal */}
            {isCompanySelectorOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className={`rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[80vh] ${theme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}>
                        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                            <h2 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Novo Agendamento</h2>
                            <button onClick={() => setIsCompanySelectorOpen(false)} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'}`}>
                                <X className={`w-5 h-5 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`} />
                            </button>
                        </div>
                        <div className="p-4 border-b sticky top-[60px] z-10 bg-inherit">
                            <div className={`flex items-center px-3 py-2 rounded-lg border focus-within:ring-2 focus-within:ring-blue-500 transition-all ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                <Search className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'}`} />
                                <input
                                    type="text"
                                    placeholder="Buscar empresa..."
                                    className="bg-transparent border-none outline-none w-full text-sm placeholder:text-slate-400"
                                    value={companySelectorSearch}
                                    onChange={(e) => setCompanySelectorSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {uniqueCompanies.filter(c => !companySelectorSearch || c.company_name?.toLowerCase().includes(companySelectorSearch.toLowerCase())).length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">Nenhuma empresa encontrada.</div>
                            ) : (
                                <div className="space-y-2">
                                    {uniqueCompanies
                                        .filter(c => !companySelectorSearch || c.company_name?.toLowerCase().includes(companySelectorSearch.toLowerCase()))
                                        .map(company => (
                                            <button
                                                key={company.company_id}
                                                onClick={() => window.open(`/${company.company_slug}`, '_blank')}
                                                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                                            >
                                                <div className="flex items-center justify-center flex-shrink-0">
                                                    {company.company_logo_url ? (
                                                        <img src={company.company_logo_url} className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold ${theme === 'dark' ? 'bg-neutral-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                            {company.company_name?.substring(0, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{company.company_name}</h4>
                                                    <p className="text-xs text-slate-500">Toque para agendar</p>
                                                </div>
                                                <ChevronRight className={`w-4 h-4 ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-400'}`} />
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {
                selectedAppointment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in ${theme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}>
                            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedAppointment.service_name}</h2>
                                <button onClick={() => setSelectedAppointment(null)} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Date & Status */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Data e horário</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(selectedAppointment.status, theme)}`}>
                                            {getStatusLabel(selectedAppointment.status)}
                                        </span>
                                    </div>
                                    <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        {new Date(selectedAppointment.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        <span className={`mx-2 ${theme === 'dark' ? 'text-neutral-600' : 'text-slate-300'}`}>-</span>
                                        {new Date(selectedAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        <span className={`text-sm font-normal ml-2 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>{getDurationExample(selectedAppointment.start_time, selectedAppointment.end_time)}</span>
                                    </p>
                                </div>

                                {/* Price */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Valor</span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${selectedAppointment.payment_status === 'paid' ? (theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')}`}>
                                            {selectedAppointment.payment_status === 'paid' ? 'Pago' : 'Não pago'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xl font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(selectedAppointment.service_price)}</span>
                                        <button
                                            disabled={selectedAppointment.payment_status === 'paid'}
                                            className={`text-sm font-medium border px-3 py-0.5 rounded transition-colors ${selectedAppointment.payment_status === 'paid'
                                                ? (theme === 'dark' ? 'text-green-500 border-green-900/30 bg-green-900/10 cursor-not-allowed' : 'text-green-600 border-green-200 bg-green-50 cursor-not-allowed')
                                                : (theme === 'dark' ? 'text-blue-400 border-blue-800 hover:bg-neutral-800' : 'text-blue-600 border-blue-200 hover:bg-blue-50')
                                                }`}
                                        >
                                            {selectedAppointment.payment_status === 'paid' ? 'Pago' : 'Pagar'}
                                        </button>
                                    </div>
                                </div>

                                {/* Business */}
                                <div>
                                    <span className={`text-sm block mb-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Negócio</span>
                                    <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedAppointment.company_name}</p>
                                </div>

                                {/* Professional */}
                                {selectedAppointment.professional_name && (
                                    <div>
                                        <span className={`text-sm block mb-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Profissional</span>
                                        <div className="flex items-center gap-2">
                                            {selectedAppointment.professional_avatar_url ? (
                                                <img src={selectedAppointment.professional_avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className={`w-6 h-6 rounded-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'}`} />
                                            )}
                                            <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedAppointment.professional_name}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Location */}
                                <div>
                                    <span className={`text-sm block mb-1 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>No estabelecimento</span>
                                    <p className="text-sm flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                        <span className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                            {selectedAppointment.company_address}
                                            <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedAppointment.company_address)}`} target="_blank" className="ml-1 text-blue-600 hover:underline inline-flex items-center">
                                                Como chegar <ExternalLink className="w-3 h-3 ml-0.5" />
                                            </a>
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                                <div className={`p-4 border-t flex items-center justify-end gap-3 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-slate-50 border-slate-100'}`}>
                                    {selectedAppointment.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={handleCancelAppointment}
                                                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                Recusar
                                            </button>
                                            <button
                                                onClick={handleConfirmAppointment}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                                            >
                                                Confirmar
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleCancelAppointment}
                                                className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'}`}
                                            >
                                                Cancelar Agendamento
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsRescheduling(true);
                                                }}
                                                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${theme === 'dark' ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                Remarcar
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {(selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'completed') && (
                                <div className={`p-4 border-t text-center text-sm font-medium ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    {selectedAppointment.status === 'cancelled' ? 'Agendamento cancelado' : 'Agendamento concluído'}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Reschedule Modal */}
            {
                isRescheduling && selectedAppointment && (
                    <RescheduleModal
                        appointment={selectedAppointment}
                        theme={theme}
                        onClose={() => setIsRescheduling(false)}
                        onSuccess={() => {
                            setIsRescheduling(false);
                            setSelectedAppointment(null);
                            // Refresh state
                            const parsed = JSON.parse(localStorage.getItem('client_session') || '{}');
                            let cleanPhone = null;
                            if (parsed.phone) {
                                cleanPhone = parsed.phone.replace(/^\+55/, '').replace(/^55/, '').replace(/\D/g, '');
                            }
                            supabase.rpc('get_client_appointments', {
                                p_phone: cleanPhone,
                                p_email: parsed.email
                            }).then(({ data }: any) => {
                                if (data) setAppointments(data);
                            });
                        }}
                        clientPhone={clientPhone}
                        clientEmail={clientEmail}
                    />
                )
            }
        </div >
    );
}

// Reschedule Modal Component
function RescheduleModal({ appointment, onClose, onSuccess, clientPhone, clientEmail, theme }: any) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekDates, setWeekDates] = useState<Date[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [schedulingRules, setSchedulingRules] = useState<any>(null);

    // Fetch rules on mount
    useEffect(() => {
        const fetchRules = async () => {
            const { data } = await supabase
                .from('company_scheduling_rules')
                .select('*')
                .eq('company_id', appointment.company_id)
                .single();
            if (data) setSchedulingRules(data);
        };
        fetchRules();
    }, [appointment.company_id]);

    // Update week dates when selectedDate changes
    useEffect(() => {
        const dates = [];
        const start = new Date(selectedDate);
        // Start from the selected date
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        setWeekDates(dates);
    }, [selectedDate]);

    // Fetch slots when date changes
    useEffect(() => {
        const fetchSlots = async () => {
            setLoadingSlots(true);
            setAvailableSlots([]);
            setSelectedTime(null);

            try {
                // Fetch business hours
                const { data: hours } = await supabase
                    .from('business_hours')
                    .select('*')
                    .eq('company_id', appointment.company_id);

                // Use rules from state or fetch if missing (though state should have it)
                const rules = schedulingRules || {};
                const gapBefore = rules.gap_before_minutes || 0;
                const gapAfter = rules.gap_after_minutes || 0;
                const minNotice = rules.min_notice_minutes || 0;
                const slotInterval = rules.slot_interval_minutes || 30;

                // Fetch existing appointments
                const startDay = new Date(selectedDate);
                startDay.setHours(0, 0, 0, 0);
                const endDay = new Date(selectedDate);
                endDay.setHours(23, 59, 59, 999);

                const { data: existingApts } = await supabase
                    .from('appointments')
                    .select('start_time, end_time')
                    .eq('company_id', appointment.company_id)
                    .neq('status', 'cancelled')
                    .neq('id', appointment.id) // Exclude current
                    .gte('start_time', startDay.toISOString())
                    .lte('start_time', endDay.toISOString());

                // Get open range for today
                const dayOfWeek = selectedDate.getDay();
                // business_hours day_of_week: Sun=0, Mon=1...
                const todayHours = hours?.filter((h: any) => h.day_of_week === dayOfWeek && h.is_open);

                if (!todayHours || todayHours.length === 0) {
                    setAvailableSlots([]);
                    setLoadingSlots(false);
                    return;
                }

                // Generate all possible slots
                const slots: string[] = [];
                const now = new Date();
                const minTime = new Date(now.getTime() + minNotice * 60000);

                todayHours.forEach((shift: any) => {
                    let current = new Date(selectedDate);
                    const [sh, sm] = shift.start_time.split(':').map(Number);
                    const [eh, em] = shift.end_time.split(':').map(Number);

                    current.setHours(sh, sm, 0, 0);
                    const endShift = new Date(selectedDate);
                    endShift.setHours(eh, em, 0, 0);

                    while (current < endShift) {
                        // Check if slot starts after min notice
                        if (current < minTime) {
                            current = new Date(current.getTime() + slotInterval * 60000);
                            continue;
                        }

                        // Calculate slot end
                        const duration = appointment.service_duration || 30;
                        const slotEnd = new Date(current.getTime() + duration * 60000);

                        if (slotEnd > endShift) break;

                        // Check overlap with gaps
                        // Proposed appointment with gaps: [start - gapBefore, end + gapAfter]
                        const proposedStart = new Date(current.getTime() - gapBefore * 60000);
                        const proposedEnd = new Date(slotEnd.getTime() + gapAfter * 60000);

                        const isBlocked = existingApts?.some((apt: any) => {
                            const aptStart = new Date(apt.start_time);
                            const aptEnd = new Date(apt.end_time);

                            // Existing apt effective range (assuming existing apts also have gaps, usually we just check if our buffered slot touches their raw time)
                            // Ideally we should check if our P (proposed) overlaps with E (existing).
                            // Overlap condition: P_start < E_end && P_end > E_start

                            return (proposedStart < aptEnd && proposedEnd > aptStart);
                        });

                        // Check if in past (already covered by minTime, but safe to keep)
                        if (current > now) {
                            if (!isBlocked) {
                                slots.push(current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                            }
                        }

                        // Increment
                        current = new Date(current.getTime() + slotInterval * 60000);
                    }
                });

                setAvailableSlots(slots);
            } catch (error) {
                console.error("Error fetching slots", error);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [selectedDate, appointment, schedulingRules]);

    const handleConfirmReschedule = async () => {
        if (!selectedTime) return;
        setIsSaving(true);
        try {
            const [h, m] = selectedTime.split(':').map(Number);
            const newStart = new Date(selectedDate);
            newStart.setHours(h, m, 0, 0);
            const newEnd = new Date(newStart.getTime() + (appointment.service_duration || 30) * 60000);

            const { error } = await supabase.rpc('client_reschedule_appointment', {
                p_appointment_id: appointment.id,
                p_new_start: newStart.toISOString(),
                p_new_end: newEnd.toISOString(),
                p_phone: clientPhone,
                p_email: clientEmail
            });

            if (error) throw error;
            alert('Reagendamento confirmado!');
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Erro ao reagendar.');
        } finally {
            setIsSaving(false);
        }
    };

    const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}>
                <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-100'}`}>
                    <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Remarcar {appointment.service_name}</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-neutral-800' : 'hover:bg-slate-100'}`}>
                        <X className={`w-5 h-5 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Month Selector */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-base font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{monthName}</h3>
                        <div className="flex gap-1">
                            <button
                                className={`p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                disabled={(() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 7);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return selectedDate <= today;
                                })()}
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 7);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    if (d < today) d.setTime(today.getTime());
                                    setSelectedDate(d);
                                }}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                className={`p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed ${theme === 'dark' ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                disabled={(() => {
                                    if (!schedulingRules?.scheduling_window_days) return false;
                                    const maxDate = new Date();
                                    maxDate.setDate(maxDate.getDate() + schedulingRules.scheduling_window_days);
                                    const nextWeek = new Date(selectedDate);
                                    nextWeek.setDate(nextWeek.getDate() + 7);
                                    return nextWeek >= maxDate;
                                })()}
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() + 7);
                                    setSelectedDate(d);
                                }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Horizontal Days */}
                    <div className="flex gap-3 mb-8 overflow-x-auto p-4 scrollbar-hide">
                        {weekDates.map(date => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            let maxDate = null;
                            if (schedulingRules?.scheduling_window_days) {
                                maxDate = new Date();
                                maxDate.setHours(0, 0, 0, 0);
                                maxDate.setDate(maxDate.getDate() + schedulingRules.scheduling_window_days);
                            }
                            const isPast = date < today;
                            const isTooFar = maxDate ? date >= maxDate : false;
                            const isDisabled = isPast || isTooFar;

                            let buttonClass = 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'; // Default Light
                            if (theme === 'dark') {
                                buttonClass = 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600'; // Default Dark
                            }

                            if (isDisabled) {
                                buttonClass = theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed';
                            } else if (isSelected) {
                                buttonClass = theme === 'dark' ? 'bg-blue-900/30 border-blue-500 text-blue-400 ring-1 ring-blue-500' : 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500';
                            }

                            return (
                                <button
                                    key={date.toISOString()}
                                    disabled={isDisabled}
                                    onClick={() => setSelectedDate(date)}
                                    className={`flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-xl border transition-all ${buttonClass}`}
                                >
                                    <span className="text-xs font-medium uppercase opacity-80">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                    <span className="text-lg font-bold">{date.getDate()}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Time Slots */}
                    <div>
                        <h4 className={`text-sm font-medium mb-3 block text-left ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>Escolha um horário</h4>
                        {loadingSlots ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className={`text-center py-8 rounded-xl border border-dashed ${theme === 'dark' ? 'text-neutral-500 bg-neutral-900 border-neutral-800' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                Nenhum horário disponível nesta data.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {availableSlots.map(time => {
                                    let slotClass = '';
                                    if (selectedTime === time) {
                                        slotClass = theme === 'dark' ? 'bg-blue-900/30 border-blue-500 text-blue-400 ring-1 ring-blue-500' : 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500';
                                    } else {
                                        slotClass = theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-blue-700 hover:bg-neutral-700' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50';
                                    }
                                    return (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all w-full text-center ${slotClass}`}
                                        >
                                            {time}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`p-4 border-t z-10 ${theme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-slate-100 bg-white'}`}>
                    <button
                        onClick={handleConfirmReschedule}
                        disabled={!selectedTime || isSaving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Confirmando...' : 'Confirmar remarcação'}
                    </button>
                </div>
            </div>
        </div >
    );
}
