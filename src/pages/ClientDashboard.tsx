import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, ChevronRight, X, ChevronLeft, ChevronDown, LogOut, Menu, ExternalLink, Archive, Coins, Zap, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
// import { useTheme } from '../contexts/ThemeContext';

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
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const getStatusStyle = (status: string) => {
    switch (status) {
        case 'confirmed':
            return 'bg-green-100 text-green-700';
        case 'pending':
            return 'bg-blue-100 text-blue-700'; // Using blue for 'Agendado' look in screenshot, though technically pending
        case 'cancelled':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-slate-100 text-slate-600';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'confirmed': return 'Confirmado';
        case 'pending': return 'Agendado';
        case 'cancelled': return 'Desmarcado'; // "Cancelado" / "Desmarcado"
        default: return status;
    }
};

export default function ClientDashboard() {
    const navigate = useNavigate();
    const [clientName, setClientName] = useState('Cliente');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [appointments, setAppointments] = useState<AppointmentType[]>([]);
    const [myCompanies, setMyCompanies] = useState<any[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filter, setFilter] = useState<'future' | 'past'>('future');

    // Modals
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentType | null>(null);
    const [isRescheduling, setIsRescheduling] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const session = localStorage.getItem('client_session');
            if (!session) {
                navigate('/client');
                return;
            }
            const parsed = JSON.parse(session);
            setClientName(parsed.name || 'Cliente');
            setClientEmail(parsed.email);

            let cleanPhone = null;
            if (parsed.phone) {
                let phoneToClean = parsed.phone.replace(/^\+55/, '').replace(/^55/, '');
                cleanPhone = phoneToClean.replace(/\D/g, '');
                setClientPhone(cleanPhone);
            }

            try {
                const { data: aptData, error: aptError } = await supabase.rpc('get_client_appointments', {
                    p_phone: cleanPhone,
                    p_email: parsed.email
                });

                if (aptError) throw aptError;

                const { data: companiesData } = await supabase.rpc('get_client_companies', {
                    p_phone: cleanPhone
                });

                setAppointments(aptData || []);
                setMyCompanies(companiesData || []);
                setFilteredCompanies(companiesData || []);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    // Instant filter for companies
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredCompanies(myCompanies);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredCompanies(myCompanies.filter(c =>
                c.name.toLowerCase().includes(lower)
            ));
        }
    }, [searchTerm, myCompanies]);

    const handleLogout = () => {
        localStorage.removeItem('client_session');
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
            alert(`Erro ao cancelar agendamento: ${err.message || JSON.stringify(err)}`);
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
            alert(`Erro ao confirmar agendamento: ${err.message || JSON.stringify(err)}`);
        }
    };

    // Grouping Logic
    const filteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filter === 'future' ? aptDate >= today : aptDate < today;
    });

    // Sort by date equivalent to filter
    filteredAppointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (filter === 'past') filteredAppointments.reverse();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <img src="/img/MarcaSite.png" alt="FluxTime" className="h-8 w-auto object-contain" />
                    <span className="text-xl md:text-2xl font-bold text-slate-900">FluxTime</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6 text-slate-600" />
                </button>
            </header>

            <div className="max-w-5xl mx-auto p-4 md:p-8 flex gap-8">
                {/* Sidebar (simplified for this view) */}
                <aside className={`w-64 flex-shrink-0 flex-col gap-6 bg-slate-50 md:bg-transparent
                    ${isSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex p-4 pt-20 bg-white shadow-2xl' : 'hidden md:flex'}
                    transition-transform duration-300`}>
                    {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 p-2"><X /></button>}

                    <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random&color=fff&bold=true`}
                                alt={clientName}
                                className="w-10 h-10 rounded-full"
                            />
                            <div className="overflow-hidden">
                                <p className="font-semibold text-sm truncate">{clientName}</p>
                                <p className="text-xs text-slate-500">Cliente</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="text-red-600 text-xs font-medium hover:underline flex items-center gap-1">
                            <LogOut className="w-3 h-3" /> Sair da conta
                        </button>
                    </div>

                    <nav className="space-y-1">
                        <button className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-900 font-medium text-sm">
                            <Calendar className="w-4 h-4 text-slate-500" /> Agendamentos
                        </button>
                        <button className="flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors text-left">
                            <Archive className="w-4 h-4 text-slate-500" /> Conteúdos
                        </button>
                        <button className="flex items-center gap-3 w-full p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium text-sm transition-colors text-left">
                            <Coins className="w-4 h-4 text-slate-500" /> Créditos
                        </button>
                        <button className="flex items-center justify-between w-full p-2.5 rounded-lg bg-slate-100 text-slate-900 font-bold text-sm transition-colors text-left group">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 flex items-center justify-center rounded-full border border-slate-900 text-slate-900">
                                    <span className="text-[10px] font-bold">$</span>
                                </div>
                                Pagamentos
                            </div>
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">1</span>
                        </button>
                    </nav>

                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-indigo-100 hover:border-indigo-200 hover:shadow-md text-blue-600 font-bold text-sm rounded-xl shadow-sm transition-all">
                        <Zap className="w-4 h-4 fill-current" /> Indique a FluxTime
                    </button>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar negócios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <p className="text-xs text-slate-500 px-1">Clique na foto de um negócio para filtrar</p>

                        <div className="space-y-2">
                            {filteredCompanies.map(comp => (
                                <button key={comp.id} onClick={() => navigate(`/${comp.slug}`)} className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all text-left group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {comp.logo_url ? <img src={comp.logo_url} className="w-8 h-8 rounded-lg object-cover bg-white" /> : <div className="w-8 h-8 rounded-lg bg-slate-200" />}
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-medium text-slate-900 text-sm">{comp.name}</span>
                                            <span className="text-[10px] text-slate-500 truncate">há 46 minutos</span>
                                        </div>
                                    </div>
                                    <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Acessar ↗
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </aside>

                {/* Main List */}
                <main className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold">Agendamentos</h1>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setFilter('future')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'future' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                            >
                                Futuros
                            </button>
                            <button
                                onClick={() => setFilter('past')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'past' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                            >
                                Passados
                            </button>
                            <button className="px-4 py-1.5 text-sm font-medium text-slate-500 flex items-center gap-1">
                                Por data <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                Nenhum agendamento encontrado.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredAppointments.map((apt) => {
                                    const date = new Date(apt.start_time);
                                    const day = date.getDate();
                                    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                                    const timeStart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    const timeEnd = new Date(apt.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div key={apt.id} className="flex items-start gap-4 group" onClick={() => setSelectedAppointment(apt)}>
                                            {/* Date Badge */}
                                            <div className="flex-shrink-0 w-16 h-16 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center shadow-sm cursor-pointer group-hover:border-blue-200 transition-colors">
                                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{month}</span>
                                                <span className="text-2xl font-bold text-slate-900">{day}</span>
                                            </div>

                                            {/* Main Card */}
                                            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer relative">
                                                {/* Company Header */}
                                                <div className="flex items-center gap-2 mb-4">
                                                    {apt.company_logo_url ? (
                                                        <img src={apt.company_logo_url} className="w-6 h-6 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-700">
                                                            {apt.company_name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-slate-900 text-sm">{apt.company_name}</span>
                                                </div>

                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900 mb-1">{apt.service_name}</h3>
                                                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                                            <Clock className="w-4 h-4" />
                                                            <span>{timeStart} <span className="text-slate-300 mx-1">→</span> {timeEnd}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(apt.status)}`}>
                                                                {getStatusLabel(apt.status)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm">
                                                            <span className="text-slate-600 font-medium">{formatCurrency(apt.service_price)}</span>
                                                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded">Não pago</span>
                                                        </div>
                                                    </div>

                                                    {apt.professional_name && (
                                                        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                                            {apt.professional_avatar_url ? (
                                                                <img src={apt.professional_avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-slate-200" />
                                                            )}
                                                            <span className="text-xs font-medium text-slate-700">{apt.professional_name.split(' ')[0]} {apt.professional_name.split(' ')[1]?.substring(0, 3)}...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-500 text-xs md:text-sm">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <span className="truncate">{apt.company_address}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Details Modal */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">{selectedAppointment.service_name}</h2>
                            <button onClick={() => setSelectedAppointment(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Date & Status */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-slate-500 text-sm">Data e horário</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(selectedAppointment.status)}`}>
                                        {getStatusLabel(selectedAppointment.status)}
                                    </span>
                                </div>
                                <p className="text-lg font-medium text-slate-900">
                                    {new Date(selectedAppointment.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    <span className="mx-2 text-slate-300">-</span>
                                    {new Date(selectedAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    <span className="text-slate-500 text-sm font-normal ml-2">{getDurationExample(selectedAppointment.start_time, selectedAppointment.end_time)}</span>
                                </p>
                            </div>

                            {/* Price */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-slate-500 text-sm">Valor</span>
                                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded">Não pago</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-medium text-slate-900">{formatCurrency(selectedAppointment.service_price)}</span>
                                    <button className="text-blue-600 text-sm font-medium border border-blue-200 px-3 py-0.5 rounded hover:bg-blue-50 transition-colors">
                                        Pagar
                                    </button>
                                </div>
                            </div>

                            {/* Business */}
                            <div>
                                <span className="text-slate-500 text-sm block mb-1">Negócio</span>
                                <p className="text-base font-medium text-slate-900">{selectedAppointment.company_name}</p>
                            </div>

                            {/* Professional */}
                            {selectedAppointment.professional_name && (
                                <div>
                                    <span className="text-slate-500 text-sm block mb-1">Profissional</span>
                                    <div className="flex items-center gap-2">
                                        {selectedAppointment.professional_avatar_url ? (
                                            <img src={selectedAppointment.professional_avatar_url} className="w-6 h-6 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-slate-200" />
                                        )}
                                        <p className="text-base font-medium text-slate-900">{selectedAppointment.professional_name}</p>
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            <div>
                                <span className="text-slate-500 text-sm block mb-1">No estabelecimento</span>
                                <p className="text-sm text-slate-900 flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <span>
                                        {selectedAppointment.company_address}
                                        <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedAppointment.company_address)}`} target="_blank" className="ml-1 text-blue-600 hover:underline inline-flex items-center">
                                            Como chegar <ExternalLink className="w-3 h-3 ml-0.5" />
                                        </a>
                                    </span>
                                </p>
                            </div>
                        </div>

                        {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                                {selectedAppointment.status === 'pending' ? (
                                    <>
                                        <button
                                            onClick={handleCancelAppointment}
                                            className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Recusar
                                        </button>
                                        <button
                                            onClick={handleConfirmAppointment}
                                            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Confirmar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleCancelAppointment}
                                            className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Desmarcar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsRescheduling(true);
                                                // Don't close details yet
                                            }}
                                            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-white bg-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                                        >
                                            Remarcar
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        {(selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'completed') && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-slate-500 text-sm font-medium">
                                {selectedAppointment.status === 'cancelled' ? 'Agendamento cancelado' : 'Agendamento concluído'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            {isRescheduling && selectedAppointment && (
                <RescheduleModal
                    appointment={selectedAppointment}
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
            )}
        </div>
    );
}

// Reschedule Modal Component
function RescheduleModal({ appointment, onClose, onSuccess, clientPhone, clientEmail }: any) {
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
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-slate-900">Remarcar {appointment.service_name}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Month Selector */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-slate-900 capitalize">{monthName}</h3>
                        <div className="flex gap-1">
                            <button
                                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={(() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() - 7);
                                    // Check if last day of prev week is past today
                                    // Actually we just want to prevent going too far back into the past
                                    // Simplest: prevent if prev week start is earlier than today?
                                    // Let's just check if current selectedDate is close to today
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    // If selectedDate is strictly greater than today, we can probably go back
                                    // But let's prevent going back if we are already at "today" week
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
                                className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={(() => {
                                    if (!schedulingRules?.scheduling_window_days) return false;
                                    const maxDate = new Date();
                                    maxDate.setDate(maxDate.getDate() + schedulingRules.scheduling_window_days);

                                    // If next week start is beyond maxDate
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
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {weekDates.map(date => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();

                            // Calculate limits
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

                            return (
                                <button
                                    key={date.toISOString()}
                                    disabled={isDisabled}
                                    onClick={() => setSelectedDate(date)}
                                    className={`flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-xl border transition-all 
                                        ${isDisabled ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400' :
                                            isSelected ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' :
                                                'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="text-xs font-medium uppercase opacity-80">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                    <span className="text-lg font-bold">{date.getDate()}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Time Slots */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-3 block text-left">Escolha um horário</h4>
                        {loadingSlots ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : availableSlots.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Nenhum horário disponível nesta data.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {availableSlots.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all w-full text-center ${selectedTime === time
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white z-10">
                    <button
                        onClick={handleConfirmReschedule}
                        disabled={!selectedTime || isSaving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Confirmando...' : 'Confirmar remarcação'}
                    </button>
                </div>
            </div>
        </div>
    );
}
