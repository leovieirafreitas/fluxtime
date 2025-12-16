
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Calendar,
    Clock,
    MapPin,
    User,
    History,
    Filter,
    Edit,
    Plus,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    ChevronDown,
    MoreHorizontal,
    LayoutList,
    RefreshCw,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Mail,
    Phone,
    Info,
    Smartphone,
    Save,
    Trash2,
    Copy,
    ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import AppointmentDetailsSlideOver from '../components/AppointmentDetailsSlideOver';
import DefaultClientAvatar from '../components/DefaultClientAvatar';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [client, setClient] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'info'>('history'); // State for Tab Switching
    const [openMenuId, setOpenMenuId] = useState<string | null>(null); // State for Dropdown Menu
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null); // State for SlideOver
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false); // State for SlideOver visibility
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuId && !(event.target as Element).closest('.actions-menu-container')) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);

    useEffect(() => {
        if (id) {
            fetchClientData();
        }
    }, [id]);

    // Auto-scroll to bottom on load when in history tab
    useEffect(() => {
        if (!loading && scrollRef.current && activeTab === 'history') {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [loading, appointments, activeTab]);

    const fetchClientData = async () => {
        try {
            setLoading(true);

            // Fetch Client
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (clientError) throw clientError;
            setClient(clientData);
            setNotes(clientData.notes || '');

            let query = supabase
                .from('appointments')
                .select(`
                    *,
                    service:services(name, price, duration_minutes),
                    professional:profiles(full_name, avatar_url)
                `)
                .order('start_time', { ascending: false });

            if (clientData.phone) {
                const cleanPhone = clientData.phone.replace(/\D/g, '');
                query = query.or(`client_id.eq.${id},client_phone.ilike.%${cleanPhone}`);
            } else {
                query = query.eq('client_id', id);
            }

            const { data: aptData, error: aptError } = await query;

            if (aptError) console.error("Error fetching appointments:", aptError);
            setAppointments(aptData || []);

        } catch (error) {
            console.error('Error fetching client details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!client) return;
        try {
            setSavingNotes(true);
            const { error } = await supabase
                .from('clients')
                .update({ notes })
                .eq('id', client.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Erro ao salvar anotações');
        } finally {
            setSavingNotes(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDateFull = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getMonthAbbr = (dateString: string) => {
        const month = new Date(dateString).toLocaleDateString('pt-BR', { month: 'short' });
        return month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
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

    // Calculate Indicators
    const totalAppointments = appointments.length;
    const completedApps = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
    const futureApps = appointments.filter(a => new Date(a.start_time) > new Date() && a.status !== 'cancelled').length;
    const cancelledApps = appointments.filter(a => a.status === 'cancelled').length;
    const cancelRate = totalAppointments > 0 ? (cancelledApps / totalAppointments) * 100 : 0;

    // Revenue Calculations
    const realizedRevenue = appointments
        .filter(a => a.payment_status === 'paid' && a.status !== 'cancelled')
        .reduce((sum, a) => sum + (a.total_amount || a.service?.price || 0), 0);

    const unpaidAmount = appointments
        .filter(a =>
            a.status !== 'cancelled' &&
            a.payment_status !== 'paid' &&
            (a.status === 'completed' || a.status === 'finished' || new Date(a.start_time) <= new Date())
        )
        .reduce((sum, a) => sum + (a.total_amount || a.service?.price || 0), 0);

    const projectedRevenue = appointments
        .filter(a =>
            a.status !== 'cancelled' &&
            a.payment_status !== 'paid' &&
            new Date(a.start_time) > new Date()
        )
        .reduce((sum, a) => sum + (a.total_amount || a.service?.price || 0), 0);


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Cliente não encontrado.</p>
            </div>
        );
    }

    const timelineEvents = [
        ...appointments.map(a => ({ type: 'appointment', date: a.start_time, data: a })),
        { type: 'created', date: client.created_at, data: client }
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }} className="min-h-screen flex transition-colors duration-300 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-64'} h-screen flex flex-col p-4 md:p-6 overflow-hidden`}>

                <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                    {/* Left Column: Main Timeline/Info Card */}
                    <div className={`flex-1 rounded-xl border flex flex-col min-h-0 shadow-sm ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>

                        {/* Header Section */}
                        <div className={`p-4 border-b flex flex-col gap-4 ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                            {/* Breadcrumbs & Actions Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <User className="w-4 h-4" />
                                    <span onClick={() => navigate('/clients')} className="cursor-pointer hover:underline font-medium">Clientes</span>
                                    <span>/</span>
                                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{client.name}</span>
                                </div>
                                <button className={`px-3 py-1.5 border rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${theme === 'dark' ? 'border-neutral-800 text-slate-300 hover:bg-neutral-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    Ações
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Tabs Row - MATCHING REFERENCE IMAGE */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'history'
                                        ? (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 text-blue-400' : 'bg-white border border-slate-200 text-blue-600 shadow-sm')
                                        : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                        }`}
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Histórico
                                </button>

                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'info'
                                        ? (theme === 'dark' ? 'bg-neutral-900 border border-neutral-800 text-blue-400' : 'bg-white border border-slate-200 text-blue-600 shadow-sm')
                                        : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                        }`}
                                >
                                    <List className="w-4 h-4" />
                                    Informações
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        {activeTab === 'history' ? (
                            <>
                                {/* Filters Bar (Only for History) */}
                                <div className="px-6 py-4 flex-none">
                                    <button className={`px-3 py-1.5 border rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-all ${theme === 'dark' ? 'border-neutral-800 text-slate-300 bg-neutral-900/50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}>
                                        <Filter className="w-3.5 h-3.5" />
                                        Filtros
                                    </button>
                                </div>

                                {/* Timeline Scroll Area */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 relative pt-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-neutral-800">
                                    {/* Vertical Line */}
                                    <div className={`absolute left-[70px] top-6 bottom-0 w-[1px] ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'} pointer-events-none`} />

                                    {timelineEvents.map((event, index) => {
                                        const isToday = new Date(event.date).toDateString() === new Date().toDateString();
                                        const dateLabel = isToday ? `Hoje, ${formatDateFull(event.date)}` : `${timeAgo(event.date)}, ${formatDateFull(event.date)}`;

                                        const prevEvent = index > 0 ? timelineEvents[index - 1] : null;
                                        const showDateLabel = !prevEvent || new Date(prevEvent.date).toDateString() !== new Date(event.date).toDateString();

                                        return (
                                            <div key={`${event.type}-${index}`} className="relative mb-2">

                                                {/* Date Label Header */}
                                                {showDateLabel && (
                                                    <div className="flex items-center gap-3 mb-6 mt-4">
                                                        <div className="w-[70px] flex justify-end pr-6 relative">
                                                            <div className={`absolute right-[-4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 z-10 border-2 ${theme === 'dark' ? 'border-black' : 'border-white'}`} />
                                                        </div>
                                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-neutral-500' : 'text-slate-500'}`}>
                                                            <span className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} mr-2`}>•</span>
                                                            {dateLabel}
                                                        </h3>
                                                    </div>
                                                )}

                                                {event.type === 'appointment' ? (
                                                    <div className="flex w-full group">
                                                        {/* Left Column (Time) */}
                                                        <div className="w-[70px] pt-1 pr-6 text-right relative flex-none">
                                                            <span className="text-xs font-mono text-slate-400 font-medium">{formatTime(event.data.start_time)}</span>
                                                            {/* Icon on line */}
                                                            <div className={`absolute right-[-8px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 
                                                                ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-100'} 
                                                            `}>
                                                                {event.data.status === 'confirmed' ? (
                                                                    <RefreshCw className="w-2.5 h-2.5 text-blue-500" />
                                                                ) : event.data.status === 'completed' ? (
                                                                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="w-2.5 h-2.5 text-red-500" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right Column (Content) */}
                                                        <div className="flex-1 pb-8">
                                                            {/* Branch Line */}
                                                            <div className="relative pl-6">
                                                                <div className={`absolute left-[-17px] top-[-11px] w-6 h-8 border-b border-l rounded-bl-2xl pointer-events-none ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-200'}`} />

                                                                {/* Badge Header Row */}
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                                        {event.data.status === 'confirmed' ? 'Atendimento' : 'Agendamento'}
                                                                    </span>

                                                                    {event.data.status === 'completed' ? (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-green-100 text-green-700">Finalizado</span>
                                                                    ) : event.data.status === 'confirmed' ? (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-green-100 text-green-700">Confirmado</span>
                                                                    ) : event.data.status === 'cancelled' ? (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-red-100 text-red-700">Cancelado</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-blue-100 text-blue-700">Agendado</span>
                                                                    )}

                                                                    {event.data.payment_status === 'paid' ? (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-green-100 text-green-700">Pago</span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-red-100 text-red-700">Não pago</span>
                                                                    )}

                                                                    <div className="ml-auto relative actions-menu-container">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOpenMenuId(openMenuId === event.data.id ? null : event.data.id);
                                                                            }}
                                                                            className={`px-2 py-1 text-xs font-medium border rounded-md flex items-center gap-1 shadow-sm transition-colors 
                                                                        ${theme === 'dark' ? 'bg-black border-neutral-800 text-slate-300 hover:bg-neutral-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                                                                    `}
                                                                        >
                                                                            Ações <ChevronDown className="w-3 h-3 text-slate-400" />
                                                                        </button>

                                                                        {/* Dropdown Menu */}
                                                                        {openMenuId === event.data.id && (
                                                                            <div className={`absolute right-0 top-full mt-1 w-56 z-50 rounded-lg shadow-lg border overflow-hidden ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                                                <div className="py-1">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            navigator.clipboard.writeText(`${window.location.origin}/agendamentos/${event.data.id}`);
                                                                                            setOpenMenuId(null);
                                                                                            // Ideally show a toast here
                                                                                        }}
                                                                                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                                                                                    >
                                                                                        <Copy className="w-4 h-4 text-slate-400" />
                                                                                        Copiar link para cliente
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            navigate(`/agendamentos/${event.data.id}`);
                                                                                            setOpenMenuId(null);
                                                                                        }}
                                                                                        className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                                                                                    >
                                                                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                                                                        Ir para agendamento
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Main Content Card */}
                                                                <div className={`rounded-2xl border p-3 hover:shadow-sm transition-all ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            {/* Date Box */}
                                                                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                                                                <span className="text-[10px] uppercase font-bold text-blue-500">{getMonthAbbr(event.data.start_time)}</span>
                                                                                <span className="text-xl font-bold leading-none">{getDay(event.data.start_time)}</span>
                                                                            </div>

                                                                            <div>
                                                                                <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{event.data.service?.name}</h4>
                                                                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(event.data.start_time)} &rarr; {formatTime(event.data.end_time)}</span>
                                                                                    <span className="flex items-center gap-1 opacity-70"><MapPin className="w-3 h-3" /> Em meu estabelecimento</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Professional Avatar */}
                                                                        {event.data.professional && (
                                                                            <div className={`flex items-center gap-2 pr-2`}>
                                                                                <div className={`w-8 h-8 rounded-full overflow-hidden border ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-200'}`}>
                                                                                    {event.data.professional.avatar_url ? (
                                                                                        <img src={event.data.professional.avatar_url} className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <div className={`w-full h-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-slate-200'} flex items-center justify-center text-xs font-bold`}>
                                                                                            {event.data.professional.full_name.charAt(0)}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <span className={`text-xs font-medium hidden sm:block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{event.data.professional.full_name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* CREATION EVENT */
                                                    <div className="flex w-full mt-2 mb-6 items-center">
                                                        <div className="w-[70px] pr-6 text-right text-xs text-slate-400 font-mono relative">
                                                            {formatTime(event.date)}
                                                        </div>

                                                        <div className="relative flex-1 flex items-center pl-6">
                                                            {/* Simple Creation Dot */}
                                                            <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full z-10 ${theme === 'dark' ? 'bg-neutral-600' : 'bg-slate-300'}`} />

                                                            <div className="text-sm flex items-center gap-2">
                                                                <div className={`w-6 h-6 rounded-full overflow-hidden border flex items-center justify-center ${theme === 'dark' ? 'border-neutral-800 bg-neutral-800' : 'border-slate-200 bg-slate-200'}`}>
                                                                    {profile?.companies?.logo_url ? (
                                                                        <img src={profile.companies.logo_url} className="w-full h-full object-cover" alt="Company Logo" />
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-slate-500">{profile?.companies?.name?.[0] || 'E'}</span>
                                                                    )}
                                                                </div>
                                                                <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                    <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Você</span> criou o cliente
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* "AGORA" SECTION */}
                                    <div className="relative pb-8 mt-2">
                                        <div className="flex w-full items-start">
                                            <div className="w-[70px] pr-6 text-right text-xs text-slate-400 font-mono pt-3">
                                                Agora
                                            </div>
                                            <div className="relative pl-6">
                                                <div className={`absolute left-[-8.5px] top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 ${theme === 'dark' ? 'bg-black border-neutral-700' : 'bg-white border-slate-300'}`}>
                                                    <Plus className="w-2.5 h-2.5 text-slate-500" />
                                                </div>

                                                <div className="flex items-center gap-2 mb-6 mt-2 ml-4">
                                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Comece aqui</span>
                                                </div>

                                                <div className="flex gap-4 ml-4">
                                                    <button className={`w-32 h-24 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-3 transition-all hover:border-blue-500 hover:shadow-md group ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                            <Calendar className="w-5 h-5" />
                                                        </div>
                                                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Agendar</span>
                                                    </button>

                                                    <button className={`w-32 h-24 rounded-2xl border shadow-sm flex flex-col items-center justify-center gap-3 transition-all hover:border-blue-500 hover:shadow-md group ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                            <Edit className="w-5 h-5" />
                                                        </div>
                                                        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Editar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Notes Section at bottom */}
                                <div className={`p-6 border-t flex-none ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                                    <div className={`rounded-xl border overflow-hidden transition-all shadow-sm ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>

                                        {/* Toolbar */}
                                        <div className={`px-4 py-3 border-b flex items-center justify-between ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                                            <div className="flex items-center gap-1">
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><Bold className="w-3.5 h-3.5" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><Italic className="w-3.5 h-3.5" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><Underline className="w-3.5 h-3.5" /></button>
                                                <span className="w-px h-4 bg-slate-200 mx-2" />
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><span className="text-xs font-bold">H1</span></button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><span className="text-xs font-bold">H2</span></button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><span className="text-xs font-bold">H3</span></button>
                                                <span className="w-px h-4 bg-slate-200 mx-2" />
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><List className="w-3.5 h-3.5" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><ListOrdered className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>

                                        {/* Text Area */}
                                        <div className="p-4 relative">
                                            <textarea
                                                placeholder="Anotações é uma funcionalidade do plano Avançado"
                                                className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300 placeholder:text-neutral-600' : 'text-slate-700 placeholder:text-slate-400'}`}
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={4}
                                            />
                                            {/* Optional: Add the "Avançado" badge if strictly following the visual of the lock, but user might want editable. Keeping it editable but with placeholder like image. */}
                                            {notes === '' && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-sm text-slate-500">Anotações é uma funcionalidade do plano</span>
                                                        <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                                                            Avançado
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Actions */}
                                        <div className={`px-4 py-2 border-t flex justify-between items-center ${theme === 'dark' ? 'border-neutral-800 bg-neutral-900/30' : 'border-slate-50 bg-slate-50/50'}`}>
                                            <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-slate-400">
                                                <Plus className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={handleSaveNotes}
                                                disabled={savingNotes}
                                                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all
                                                    ${theme === 'dark'
                                                        ? 'bg-neutral-800 text-slate-300 hover:bg-neutral-700'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }
                                                `}
                                            >
                                                {savingNotes ? 'Salvando...' : 'Anotar'}
                                                <ChevronLeft className="w-3 h-3 rotate-180" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* INFO TAB CONTENT */
                            <div className={`p-8 flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                                <div className="max-w-3xl mx-auto">
                                    {/* Top Bar: Edit Status & Save Button */}
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-sm text-slate-500">Editado há 2 dias</span>
                                        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm">
                                            Salvar
                                        </button>
                                    </div>

                                    {/* Centered Avatar */}
                                    <div className="flex justify-center mb-10">
                                        <div className="w-24 h-24">
                                            <DefaultClientAvatar size={96} />
                                        </div>
                                    </div>

                                    {/* Basic Info Section */}
                                    <h3 className={`text-lg font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Informações básicas</h3>

                                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-200'}`}>

                                        {/* Name Field */}
                                        <div className={`p-6 border-b grid grid-cols-1 md:grid-cols-12 gap-6 ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                                            <div className="md:col-span-4 flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <label className={`font-medium text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Nome *</label>
                                            </div>
                                            <div className="md:col-span-8">
                                                <input
                                                    type="text"
                                                    defaultValue={client.name}
                                                    className={`w-full px-4 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${theme === 'dark' ? 'bg-black border-neutral-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                                                />
                                                <p className="text-xs text-slate-500 mt-2">Dica: preencha o nome completo para fácil identificação</p>
                                            </div>
                                        </div>

                                        {/* Phone Field */}
                                        <div className={`p-6 border-b grid grid-cols-1 md:grid-cols-12 gap-6 ${theme === 'dark' ? 'border-neutral-800' : 'border-slate-100'}`}>
                                            <div className="md:col-span-4 flex items-center gap-2">
                                                <Smartphone className="w-4 h-4 text-slate-400" />
                                                <label className={`font-medium text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Celular *</label>
                                            </div>
                                            <div className="md:col-span-8">
                                                <input
                                                    type="text"
                                                    defaultValue={client.phone}
                                                    disabled
                                                    className={`w-full px-4 py-2 rounded-lg border text-sm bg-slate-100 text-slate-500 cursor-not-allowed ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'border-slate-200'}`}
                                                />
                                                <p className="text-xs text-slate-500 mt-2">O número do celular é uma chave única, pois o seu cliente utilizará para entrar para agendar</p>
                                            </div>
                                        </div>

                                        {/* Email Field */}
                                        <div className={`p-6 grid grid-cols-1 md:grid-cols-12 gap-6`}>
                                            <div className="md:col-span-4 flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                <label className={`font-medium text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>E-mail</label>
                                            </div>
                                            <div className="md:col-span-8">
                                                <input
                                                    type="email"
                                                    defaultValue={client.email}
                                                    className={`w-full px-4 py-2 rounded-lg border text-sm transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${theme === 'dark' ? 'bg-black border-neutral-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}
                                                />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right Sidebar - Consistently on screen */}
                    <div className="w-full lg:w-80 space-y-4 flex-none overflow-y-auto">
                        {/* Profile Card */}
                        <div className={`rounded-xl p-6 border shadow-sm ${theme === 'dark' ? 'bg-black border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-14 h-14">
                                    {client.avatar_url ? (
                                        <img src={client.avatar_url} className="w-full h-full rounded-full object-cover" alt={client.name} />
                                    ) : (
                                        <DefaultClientAvatar size={56} />
                                    )}
                                </div>
                                <div>
                                    <h2 className={`font-bold text-xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{client.name}</h2>
                                    <p className="text-xs text-slate-500 mt-1">Última atividade há {appointments.length > 0 ? '11 horas' : '...'} </p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-500 w-24">Adicionado em</span>
                                    </div>
                                    <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`}>{formatDateFull(client.created_at)}</span>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 flex items-center justify-center"><div className="w-3 h-3 border-2 border-slate-300 rounded-full border-dashed" /></div>
                                        <span className="text-slate-500 w-24">Status</span>
                                    </div>
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Ativo</span>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-500 w-24">Celular</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`}>{client.phone}</span>
                                        <MoreHorizontal className="w-4 h-4 text-slate-300 cursor-pointer hover:text-slate-500" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-500 w-24">E-mail</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium truncate max-w-[120px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-900'}`}>{client.email || '-'}</span>
                                        <MoreHorizontal className="w-4 h-4 text-slate-300 cursor-pointer hover:text-slate-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Indicators */}
                        <div className={`rounded-xl border shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-black border-neutral-800' : 'bg-white border-slate-200'}`}>
                            <div className={`px-6 py-4 font-bold text-base flex items-center justify-between cursor-pointer hover:bg-slate-50 border-b border-transparent ${theme === 'dark' ? 'hover:bg-neutral-900 text-white' : 'text-slate-900'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </div>
                                    Indicadores
                                </div>
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="p-6 space-y-4">
                                {[
                                    { label: '# Atendimentos realizados', value: completedApps, title: 'ATENDIMENTOS REALIZADOS', desc: 'Total de atendimentos concluídos com sucesso.' },
                                    { label: '# Agendamentos futuros', value: futureApps, title: 'AGENDAMENTOS FUTUROS', desc: 'Total de agendamentos confirmados para datas futuras.' },
                                    { label: '# Compras', value: '0', title: 'COMPRAS', desc: 'Total de produtos comprados pelo cliente.' },
                                    { label: '% Faltas', value: '0%', title: 'FALTAS', desc: 'Percentual de agendamentos onde o cliente não compareceu.' },
                                    { label: '% Cancelamentos', value: `${cancelRate.toFixed(0)}%`, title: 'CANCELAMENTOS', desc: 'Percentual de agendamentos cancelados pelo cliente.' },
                                    { label: '$ Faturamento realizado', value: formatCurrency(realizedRevenue), title: 'FATURAMENTO REALIZADO', desc: 'Soma total dos valores já recebidos deste cliente.' },
                                    { label: '$ Faturamento previsto', value: formatCurrency(projectedRevenue), title: 'FATURAMENTO PREVISTO', desc: 'Soma total dos valores dos agendamentos futuros que esse cliente irá realizar.' },
                                    { label: '$ Valor devido', value: formatCurrency(unpaidAmount), title: 'VALOR DEVIDO', desc: 'Total em aberto referente a serviços realizados e não pagos.' },
                                ].map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm relative group cursor-help">
                                        <span className={`font-medium truncate max-w-[150px] border-b border-dashed border-transparent group-hover:border-slate-300 transition-colors ${theme === 'dark' ? 'text-slate-400 group-hover:border-neutral-700' : 'text-slate-500'}`}>
                                            {item.label}
                                        </span>
                                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>

                                        {/* Tooltip */}
                                        <div className={`hidden group-hover:block absolute right-0 bottom-full mb-2 w-64 p-3 rounded-lg shadow-2xl z-50 pointer-events-none border ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-[#0F172A] border-slate-800'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{item.title}</div>
                                            <div className="text-xs text-slate-200 leading-relaxed font-normal">{item.desc}</div>
                                            {/* Arrow */}
                                            <div className={`absolute top-full right-4 -mt-[1px] border-4 border-transparent ${theme === 'dark' ? 'border-t-neutral-900' : 'border-t-[#0F172A]'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div >
            </main >

            {/* Slide Over for Appointment Details */}
            {
                selectedAppointment && (
                    <AppointmentDetailsSlideOver
                        isOpen={isSlideOverOpen}
                        onClose={() => {
                            setIsSlideOverOpen(false);
                            setSelectedAppointment(null);
                        }}
                        appointment={selectedAppointment}
                        onUpdate={fetchClientData}
                    />
                )
            }
        </div >
    );
}
