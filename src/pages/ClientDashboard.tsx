import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Wallet, CreditCard, LogOut, Search, ChevronDown, ExternalLink, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Helper to format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

// Helper for date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function ClientDashboard() {
    const navigate = useNavigate();
    const [clientName, setClientName] = useState('Cliente');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [myCompanies, setMyCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [appointmentFilter, setAppointmentFilter] = useState<'future' | 'past'>('future');

    useEffect(() => {
        const fetchDashboardData = async () => {
            const session = localStorage.getItem('client_session');
            if (!session) {
                navigate('/client');
                return;
            }
            const parsed = JSON.parse(session);
            setClientName(parsed.name || 'Cliente');

            let cleanPhone = null;
            if (parsed.phone) {
                let phoneToClean = parsed.phone.replace(/^\+55/, '').replace(/^55/, '');
                cleanPhone = phoneToClean.replace(/\D/g, '');
            }

            // 1. Try to load from cache immediately for "instant" feel
            const cacheKey = `dashboard_cache_${cleanPhone}`;
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData) {
                try {
                    const { appointments: cachedApts, companies: cachedComps } = JSON.parse(cachedData);
                    if (cachedApts) setAppointments(cachedApts);
                    if (cachedComps) setMyCompanies(cachedComps);
                    // If we have cache, stop loading immediately
                    if (cachedApts || cachedComps) setIsLoading(false);
                } catch (e) {
                    console.error("Error parsing cache", e);
                }
            }

            try {
                // 2. Fetch fresh data in background
                const { data: aptData, error: aptError } = await supabase.rpc('get_client_appointments', {
                    p_phone: cleanPhone,
                    p_email: parsed.email
                });

                if (aptError) throw aptError;

                const { data: companiesData, error: compError } = await supabase.rpc('get_client_companies', {
                    p_phone: cleanPhone
                });

                if (compError) console.error("Error fetching companies:", compError);

                // Fetch latest client info to ensure name is correct (for Avatar/Initials)
                const { data: clientInfoData, error: clientInfoError } = await supabase
                    .rpc('public_get_global_client_info', { p_phone: cleanPhone });

                if (clientInfoError) {
                    console.error("Error fetching client info:", clientInfoError);
                }

                // RPC returns an array, take the first item
                const freshClientInfo = (clientInfoData && Array.isArray(clientInfoData) && clientInfoData.length > 0) ? clientInfoData[0] : null;

                if (freshClientInfo && freshClientInfo.name) {
                    setClientName(freshClientInfo.name);
                    // Update session in localStorage to keep it fresh
                    const updatedSession = { ...parsed, name: freshClientInfo.name, email: freshClientInfo.email };
                    localStorage.setItem('client_session', JSON.stringify(updatedSession));
                }

                const mappedApts = (aptData || []).map((item: any) => ({
                    id: item.id,
                    status: item.status,
                    start_time: item.start_time,
                    company: { name: item.company_name },
                    service: { name: item.service_name, price: item.service_price }
                }));

                // 3. Update state and cache
                setAppointments(mappedApts);
                setMyCompanies(companiesData || []);

                localStorage.setItem(cacheKey, JSON.stringify({
                    appointments: mappedApts,
                    companies: companiesData || [],
                    clientInfo: freshClientInfo, // Cache client info too
                    timestamp: Date.now()
                }));

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('client_session');
        navigate('/client');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <img src="/img/MarcaSite.png" alt="FluxTime" className="h-8 w-auto object-contain" />
                    <span className="text-xl md:text-2xl font-bold text-slate-900">FluxTime</span>
                </div>

                {/* Mobile Menu Button - Right Side */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6 text-slate-600" />
                </button>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-4 md:py-8 gap-8">
                {/* Sidebar - Desktop & Mobile */}
                <aside className={`w-64 flex-shrink-0 flex-col gap-6 bg-slate-50 md:bg-transparent
                    ${isSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex p-4 pt-20' : 'hidden md:flex'}
                    transition-transform duration-300`}>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden absolute top-4 right-4 p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-600" />
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-medium text-sm transition-colors">
                            <img src="/img/MarcaSite.png" alt="FluxTime" className="h-7 w-auto object-contain" />
                            Indique a FluxTime
                        </button>
                    </div>

                    <nav className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 space-y-1">
                        <button className="flex items-center gap-3 w-full p-3 rounded-lg bg-slate-100 text-slate-900 font-medium text-sm">
                            <Calendar className="w-4 h-4" />
                            Agendamentos
                        </button>
                        <button className="flex items-center gap-3 w-full p-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">
                            <BookOpen className="w-4 h-4" />
                            Conteúdos
                        </button>
                        <button className="flex items-center gap-3 w-full p-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">
                            <Wallet className="w-4 h-4" />
                            Créditos
                        </button>
                        <button className="flex items-center gap-3 w-full p-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">
                            <CreditCard className="w-4 h-4" />
                            Pagamentos
                        </button>
                    </nav>

                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar negócios..."
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                        <p className="text-xs text-slate-500 px-1">Clique na foto de um negócio para filtrar ou acessar</p>

                        {myCompanies.length > 0 ? (
                            myCompanies.map((comp) => (
                                <div
                                    key={comp.slug}
                                    onClick={() => navigate(`/${comp.slug}`)}
                                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        {comp.logo_url ? (
                                            <img
                                                src={comp.logo_url}
                                                alt={comp.name}
                                                className="w-8 h-8 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                                {comp.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="overflow-hidden">
                                            <h4 className="text-sm font-medium text-slate-900 truncate">{comp.name}</h4>
                                            <p className="text-xs text-slate-500">
                                                membro desde {new Date(comp.member_since).getFullYear()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/${comp.slug}`); }}
                                        className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 group-hover:bg-blue-100 transition-colors"
                                    >
                                        Acessar <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-slate-400 text-sm">
                                Nenhuma empresa encontrada.
                            </div>
                        )}
                    </div>

                    {/* User Profile Card - At Bottom */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random&color=fff&bold=true`}
                                alt={clientName}
                                className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{clientName}</p>
                                <p className="text-xs text-slate-500">Cliente</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1">
                    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
                        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <h2 className="text-lg md:text-xl font-bold text-slate-900">Agendamentos</h2>
                            <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                                <button
                                    onClick={() => setAppointmentFilter('future')}
                                    className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap rounded-md transition-all ${appointmentFilter === 'future'
                                        ? 'bg-white shadow-sm text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Futuros
                                </button>
                                <button
                                    onClick={() => setAppointmentFilter('past')}
                                    className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap rounded-md transition-all ${appointmentFilter === 'past'
                                        ? 'bg-white shadow-sm text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Passados
                                </button>
                                <button className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1 whitespace-nowrap">
                                    Por data <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-4 md:p-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (() => {
                                // Filter appointments based on selected filter
                                const filteredAppointments = appointments.filter(apt => {
                                    const aptDate = new Date(apt.start_time);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);

                                    if (appointmentFilter === 'future') {
                                        return aptDate >= today;
                                    } else {
                                        return aptDate < today;
                                    }
                                });

                                return filteredAppointments.length > 0 ? (
                                    <div className="space-y-3 md:space-y-4">
                                        {filteredAppointments.map((apt) => (
                                            <div key={apt.id} className="flex flex-col p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                                                <div className="flex items-start gap-3 md:gap-4 mb-3">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-slate-900 text-sm md:text-base truncate">{apt.company?.name || 'Empresa'}</h3>
                                                        <p className="text-slate-600 font-medium text-sm md:text-base truncate">{apt.service?.name}</p>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm text-slate-500 mt-1">
                                                            <span>{formatDate(apt.start_time)}</span>
                                                            <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                                                            <span>{formatCurrency(apt.service?.price || 0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium 
                                                        ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                            apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'pending' ? 'Pendente' : apt.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 relative">
                                            <Calendar className="w-8 h-8 text-slate-300" />
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 mb-1">
                                            {appointmentFilter === 'future'
                                                ? 'Você ainda não possui agendamentos futuros'
                                                : 'Você não possui agendamentos passados'}
                                        </h3>
                                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                            {appointmentFilter === 'future'
                                                ? 'Seus próximos agendamentos aparecerão aqui.'
                                                : 'Seus agendamentos anteriores aparecerão aqui.'}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
