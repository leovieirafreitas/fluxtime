import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BookOpen, Wallet, CreditCard, Bolt, LogOut, User, Search, ChevronDown, ExternalLink } from 'lucide-react';
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
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            const session = localStorage.getItem('client_session');
            if (!session) {
                navigate('/client');
                return;
            }
            const parsed = JSON.parse(session);
            setClientName(parsed.name || 'Cliente');


            try {
                // Try to find appointments by phone (most robust currently) or email
                let query = supabase
                    .from('appointments')
                    .select(`
                        *,
                        company:companies(name),
                        service:services(name, price)
                    `)
                    .order('start_time', { ascending: true });

                if (parsed.phone) {
                    // Normalize phone - remove all non-digits
                    const cleanPhone = parsed.phone.replace(/\D/g, '');

                    // Create all possible phone formats to search
                    const phoneVariations = [
                        cleanPhone,                           // 11999999999
                        `+55${cleanPhone}`,                   // +5511999999999
                        `55${cleanPhone}`,                    // 5511999999999
                        `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`, // (11) 99999-9999
                        `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2)}`, // (11) 999999999
                    ];

                    // Build OR query for all variations
                    const orConditions = phoneVariations.map(v => `client_phone.eq.${v}`).join(',');
                    query = query.or(orConditions);
                } else if (parsed.email) {
                    query = query.eq('client_email', parsed.email);
                }

                const { data, error } = await query;

                if (error) throw error;
                setAppointments(data || []);

            } catch (error) {
                console.error('Error fetching appointments:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAppointments();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('client_session');
        navigate('/client');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50">
                <div className="text-blue-600 font-bold text-xl flex items-center gap-2">
                    <span className="text-2xl font-bold">FluxTime</span>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 hover:bg-slate-50 p-2 rounded-lg transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                            <User className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{clientName}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2" title="Sair">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-8 gap-8">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0 hidden md:flex flex-col gap-6">
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

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-medium text-sm transition-colors">
                            <Bolt className="w-4 h-4" />
                            Indique a FluxTime
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar negócios..."
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                        <p className="text-xs text-slate-500 px-1">Clique na foto de um negócio para filtrar</p>

                        <div
                            onClick={() => navigate('/laribrows')}
                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                                    LB
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-sm font-medium text-slate-900 truncate">Lari Brows</h4>
                                    <p className="text-xs text-slate-500">há 1 ano</p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/laribrows'); }}
                                className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 group-hover:bg-blue-100 transition-colors"
                            >
                                Acessar <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Agendamentos</h2>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button className="px-4 py-1.5 bg-white shadow-sm rounded-md text-sm font-medium text-slate-900">Futuros</button>
                                <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">Passados</button>
                                <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                    Por data <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : appointments.length > 0 ? (
                                <div className="space-y-4">
                                    {appointments.map((apt) => (
                                        <div key={apt.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{apt.company?.name || 'Empresa'}</h3>
                                                    <p className="text-slate-600 font-medium">{apt.service?.name}</p>
                                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                        <span>{formatDate(apt.start_time)}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <span>{formatCurrency(apt.service?.price || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 md:mt-0 flex items-center gap-3">
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
                                    <h3 className="text-lg font-medium text-slate-900 mb-1">Você ainda não possui agendamentos</h3>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                        Seus agendamentos futuros aparecerão aqui.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
