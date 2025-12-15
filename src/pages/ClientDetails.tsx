
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
    ListOrdered
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
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
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            fetchClientData();
        }
    }, [id]);

    // Auto-scroll to bottom on load
    useEffect(() => {
        if (!loading && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [loading, appointments]);

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
                .order('start_time', { ascending: false }); // Fetch descending first to get latest easily, but we will sort ASC for timeline

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

        // Future dates
        const futureDays = Math.ceil((past.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (futureDays === 0) return 'Hoje'; // Should be covered
        if (futureDays === 1) return 'Amanhã';
        return `Em ${futureDays} dias`;
    };

    // Calculate Indicators
    const totalAppointments = appointments.length;
    const completedApps = appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
    const futureApps = appointments.filter(a => new Date(a.start_time) > new Date() && a.status !== 'cancelled').length;
    const cancelledApps = appointments.filter(a => a.status === 'cancelled').length;
    const cancelRate = totalAppointments > 0 ? (cancelledApps / totalAppointments) * 100 : 0;

    const realizedRevenue = appointments
        .filter(a => (a.status === 'completed' || (a.status === 'confirmed' && new Date(a.start_time) < new Date())))
        .reduce((sum, a) => sum + (a.total_amount ?? a.service?.price ?? 0), 0);

    const projectedRevenue = appointments
        .filter(a => (a.status === 'confirmed' && new Date(a.start_time) > new Date()))
        .reduce((sum, a) => sum + (a.total_amount ?? a.service?.price ?? 0), 0);

    const unpaidAmount = appointments
        .filter(a => a.payment_status !== 'paid' && a.status !== 'cancelled')
        .reduce((sum, a) => sum + (a.total_amount ?? a.service?.price ?? 0), 0);


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

    // Combine appointments and creation event for timeline
    // SORT ASCENDING (Oldest First -> Newest Last) per reference
    const timelineEvents = [
        ...appointments.map(a => ({ type: 'appointment', date: a.start_time, data: a })),
        { type: 'created', date: client.created_at, data: client }
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }} className="min-h-screen flex transition-colors duration-300 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-64'} h-screen flex flex-col`}>
                <div className="p-4 md:p-8 pb-4 space-y-4 flex-none">
                    {/* Header */}
                    <div className="flex flex-col gap-4">
                        {/* BreadcrumbArea */}
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <User className="w-4 h-4" />
                            <span onClick={() => navigate('/clients')} className="cursor-pointer hover:underline">Clientes</span>
                            <span>/</span>
                            <span className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>{client.name}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                <button className={`pb-2 text-sm font-semibold border-b-2 ${theme === 'dark' ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600'}`}>
                                    Histórico
                                </button>
                                <button className={`pb-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300`}>
                                    Informações
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => navigate('/clients')} className={`px-3 py-1.5 border rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-white'}`}>
                                    Ações
                                    <ChevronLeft className="w-4 h-4 rotate-270" style={{ transform: 'rotate(-90deg)' }} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 md:px-8 pb-4 flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
                    {/* Main Content - Timeline */}
                    <div className={`flex-1 rounded-xl border flex flex-col min-h-0 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

                        {/* Filters Bar */}
                        <div className="p-6 pb-2 flex-none">
                            <button className={`px-4 py-2 border rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm active:scale-95 transition-all ${theme === 'dark' ? 'border-slate-700 text-slate-300 bg-slate-800/50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                                <Filter className="w-4 h-4" />
                                Filtros
                            </button>
                        </div>

                        {/* Timeline Content */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-0 relative pt-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                            {/* Vertical Line */}
                            <div className="absolute left-[88px] top-6 bottom-0 w-[1px] bg-slate-200 dark:bg-slate-800 pointer-events-none" />

                            {timelineEvents.map((event, index) => {
                                // Date grouping logic
                                const isToday = new Date(event.date).toDateString() === new Date().toDateString();
                                const dateLabel = isToday ? `Hoje, ${formatDateFull(event.date)}` : `${timeAgo(event.date)}, ${formatDateFull(event.date)}`;

                                const prevEvent = index > 0 ? timelineEvents[index - 1] : null;
                                const showDateLabel = !prevEvent || new Date(prevEvent.date).toDateString() !== new Date(event.date).toDateString();

                                return (
                                    <div key={`${event.type}-${index}`} className="relative mb-2">

                                        {/* Date Label Header */}
                                        {showDateLabel && (
                                            <div className="flex items-center gap-3 mb-6 mt-4">
                                                <div className="w-[88px] flex justify-end pr-8 relative">
                                                    <div className="absolute right-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 z-10 border-2 border-white dark:border-slate-900" />
                                                </div>
                                                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                                                    {dateLabel}
                                                </h3>
                                            </div>
                                        )}

                                        {event.type === 'appointment' ? (
                                            <div className="flex w-full group">
                                                {/* Left Column (Time) */}
                                                <div className="w-[88px] pt-1 pr-6 text-right relative flex-none">
                                                    <span className="text-xs font-mono text-slate-400">{formatTime(event.data.start_time)}</span>
                                                    {/* Icon on line */}
                                                    <div className={`absolute right-[-8px] top-1 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center z-10 ${event.data.status === 'confirmed' ? 'border-green-500' :
                                                        event.data.status === 'cancelled' ? 'border-red-500' :
                                                            'border-blue-500'
                                                        }`}>
                                                        {/* Small refresh icon or similar could go here, but reference has simple icon */}
                                                        <div className={`w-1.5 h-1.5 rounded-full ${event.data.status === 'confirmed' ? 'bg-green-500' :
                                                            event.data.status === 'cancelled' ? 'bg-red-500' :
                                                                'bg-blue-500'
                                                            }`} />
                                                    </div>
                                                </div>

                                                {/* Right Column (Content) */}
                                                <div className="flex-1 pb-8">
                                                    {/* Badges Row (Above Card) */}
                                                    <div className="flex items-center gap-2 mb-2 pl-4 text-sm w-full">
                                                        <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{event.data.status === 'confirmed' ? 'Atendimento' : 'Agendamento'}</span>

                                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${event.data.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                            event.data.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {event.data.status === 'confirmed' ? 'Finalizado' : event.data.status}
                                                        </span>

                                                        {event.data.payment_status === 'paid' ? (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-green-100 text-green-700">Pago</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-red-100 text-red-700">Não pago</span>
                                                        )}

                                                        <div className="ml-auto">
                                                            <button className={`px-2 py-1 text-xs font-medium border rounded-md flex items-center gap-1 shadow-sm bg-white dark:bg-black hover:bg-slate-50 ${theme === 'dark' ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                                                                Ações <ChevronLeft className="w-3 h-3 rotate-270 text-slate-400" style={{ transform: 'rotate(-90deg)' }} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Card with Branch Line */}
                                                    <div className="relative pl-4">
                                                        {/* Curved Branch Line */}
                                                        <div className="absolute left-[-16px] top-[-14px] w-5 h-8 border-b border-l rounded-bl-xl border-slate-200 dark:border-slate-700 pointer-events-none" />

                                                        <div className={`rounded-xl border p-2 hover:shadow-sm transition-all bg-opacity-50 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    {/* Date Box Compact */}
                                                                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                                                        <span className="text-[9px] uppercase font-bold text-blue-500">{getMonthAbbr(event.data.start_time)}</span>
                                                                        <span className="text-xl font-bold leading-none">{getDay(event.data.start_time)}</span>
                                                                    </div>

                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{event.data.service?.name}</h4>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(event.data.start_time)} &rarr; {formatTime(event.data.end_time)}</span>
                                                                            <span className="flex items-center gap-1 opacity-70"><MapPin className="w-3 h-3" /> Em meu estabelecimento</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Professional Avatar */}
                                                                {event.data.professional && (
                                                                    <div className={`flex items-center gap-2 pr-2`}>
                                                                        <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                                                            {event.data.professional.avatar_url ? (
                                                                                <img src={event.data.professional.avatar_url} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full bg-slate-200 dark:bg-slate-700" />
                                                                            )}
                                                                        </div>
                                                                        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{event.data.professional.full_name}</span>
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
                                                <div className="w-[88px] pr-6 text-right text-xs text-slate-400 font-mono relative">
                                                    {formatTime(event.date)}
                                                </div>

                                                <div className="relative flex-1 flex items-center pl-4">
                                                    {/* Simple Creation Dot */}
                                                    <div className={`absolute left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 z-10`} />

                                                    <div className="text-sm flex items-center gap-2">
                                                        {/* Small Inline Avatar */}
                                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 border border-slate-200 dark:border-slate-700">
                                                            {profile?.companies?.logo_url ? (
                                                                <img src={profile.companies.logo_url} className="w-full h-full object-cover" alt="Company Logo" />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                                    {profile?.companies?.name?.[0] || 'E'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            <span className="font-bold text-slate-900 dark:text-white">Você</span> criou o cliente
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* "AGORA" SECTION AT THE END (BOTTOM) */}
                            <div className="relative pb-8 mt-2">
                                {/* Connection Line */}
                                {/* "Agora" Label */}
                                <div className="flex w-full items-start">
                                    <div className="w-[88px] pr-6 text-right text-xs text-slate-400 font-mono pt-3">
                                        Agora
                                    </div>
                                    <div className="flex-1 relative pl-4">
                                        {/* Plus Icon on Line */}
                                        <div className="absolute left-[-8px] top-3 w-4 h-4 rounded-full border-2 border-slate-300 bg-white dark:bg-slate-900 flex items-center justify-center z-10">
                                            <Plus className="w-2.5 h-2.5 text-slate-500" />
                                        </div>

                                        <div className="flex items-center gap-2 mb-4 mt-2">
                                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Comece aqui</span>
                                        </div>

                                        <div className="flex gap-4">
                                            <button className={`w-24 h-24 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center gap-2 transition-all hover:border-blue-500 hover:shadow-md group`}>
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Agendar</span>
                                            </button>

                                            <button className={`w-24 h-24 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center gap-2 transition-all hover:border-blue-500 hover:shadow-md group`}>
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform dark:bg-blue-900/30 dark:text-blue-400">
                                                    <Edit className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Editar</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Notes Section at bottom */}
                        <div className={`p-4 border-t flex-none ${theme === 'dark' ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'}`}>
                                <div className={`p-2 border-b flex gap-1 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                    <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Bold className="w-4 h-4" /></button>
                                    <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Italic className="w-4 h-4" /></button>
                                    <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><Underline className="w-4 h-4" /></button>
                                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
                                    <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><List className="w-4 h-4" /></button>
                                    <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><ListOrdered className="w-4 h-4" /></button>
                                </div>
                                <div className="p-2 min-h-[60px]">
                                    <textarea
                                        placeholder="Digite suas anotações aqui..."
                                        className={`w-full h-full bg-transparent resize-none outline-none text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                                <div className={`px-4 py-2 border-t flex justify-between items-center ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                                    <span className="text-xs text-slate-500">Salvo em {client.updated_at ? formatTime(client.updated_at) : '...'}</span>
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={savingNotes}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${savingNotes
                                            ? 'bg-slate-200 text-slate-500 cursor-wait'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                            }`}
                                    >
                                        {savingNotes ? 'Salvando...' : 'Anotar ↵'}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Sidebar Information */}
                    <div className="w-full lg:w-80 space-y-4 flex-none overflow-y-auto">
                        {/* Profile Card */}
                        <div className={`rounded-xl p-4 border ${theme === 'dark' ? 'bg-white border-slate-200 text-slate-900' : 'bg-white border-slate-200 text-slate-900'}`}>
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-slate-100 text-slate-600`}>
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className={`font-bold text-lg text-slate-900`}>{client.name}</h2>
                                    <p className="text-xs text-slate-500">Última atividade há {appointments.length > 0 ? 'algumas horas' : '...'} </p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500 w-24">Adicionado em</span>
                                    <span className="font-medium">{formatDateFull(client.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 flex items-center justify-center"><div className="w-3 h-3 border-2 border-slate-300 rounded-full border-dashed" /></div>
                                    <span className="text-slate-500 w-24">Status</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Ativo</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4" /> {/* Spacer */}
                                    <span className="text-slate-500 w-24">Celular</span>
                                    <span className="font-medium truncate">{client.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4" /> {/* Spacer */}
                                    <span className="text-slate-500 w-24">E-mail</span>
                                    <span className="font-medium truncate text-xs">{client.email || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Indicators */}
                        <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-white border-slate-200' : 'bg-white border-slate-200'}`}>
                            <div className={`px-4 py-3 font-semibold flex items-center justify-between cursor-pointer hover:bg-slate-50 border-b border-transparent`}>
                                <div className="flex items-center gap-2 text-blue-600">
                                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                                        <History className="w-4 h-4" />
                                    </div>
                                    Indicadores
                                </div>
                                <ChevronLeft className="w-4 h-4 rotate-270 text-slate-400" style={{ transform: 'rotate(-90deg)' }} />
                            </div>

                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium"># Atendimentos rea...</span>
                                    <span className={`font-bold text-slate-900`}>{completedApps}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium"># Agendamentos fu...</span>
                                    <span className={`font-bold text-slate-900`}>{futureApps}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium"># Compras</span>
                                    <span className={`font-bold text-slate-900`}>0</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">% Faltas</span>
                                    <span className={`font-bold text-slate-900`}>0%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">% Cancelamentos</span>
                                    <span className={`font-bold text-slate-900`}>{cancelRate.toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">$ Faturamento reali...</span>
                                    <span className={`font-bold text-slate-900`}>{formatCurrency(realizedRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">$ Faturamento prev...</span>
                                    <span className={`font-bold text-slate-900`}>{formatCurrency(projectedRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">$ Valor devido</span>
                                    <span className={`font-bold text-slate-900`}>{formatCurrency(unpaidAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
