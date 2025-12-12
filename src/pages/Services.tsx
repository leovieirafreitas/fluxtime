import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Plus, MoreVertical, Eye, Download, Grid, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';

interface Service {
    id: string;
    title: string;
    name?: string; // fallback
    description: string;
    price: number;
    duration_minutes: number;
    duration: number; // fallback
    visibility: string;
    active?: boolean; // fallback
    sort_order: number;
    created_at: string;
    reservation_fee: number | null;
    is_reservation_fee_enabled: boolean;
    location_type: string;
}

export default function Services() {
    const { profile } = useUserProfileContext();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    useEffect(() => {
        if (profile?.company_id) {
            fetchServices();
        }
    }, [profile]);

    const fetchServices = async () => {
        if (!profile?.company_id) return;

        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('company_id', profile.company_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(price || 0);
    };

    const formatDuration = (minutes: number) => {
        if (!minutes) return '-';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins} min` : `${hours}h`;
    };

    const formatLocation = (type: string) => {
        switch (type) {
            case 'business_address': return 'Em meu estabelecimento';
            case 'client_address': return 'No endereço do cliente';
            case 'online': return 'Online';
            default: return 'Em meu estabelecimento';
        }
    };

    const formatVisibility = (visibility: string, active?: boolean) => {
        // Fallback for old data
        if (!visibility && active !== undefined) {
            return active ? 'Público' : 'Privado';
        }

        switch (visibility) {
            case 'public': return 'Público';
            case 'private': return 'Privado';
            case 'link_only': return 'Apenas Link';
            default: return 'Público'; // Default
        }
    };

    const filteredServices = services.filter(service => {
        const name = service.title || service.name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }} className="min-h-screen transition-colors duration-300">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Botão de Menu Mobile */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'
                            }`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Breadcrumb e Botão Criar */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-sm">
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Catálogo</span>
                            <span className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}>/</span>
                            <span className={theme === 'dark' ? 'text-white font-medium' : 'text-slate-900 font-medium'}>
                                Serviços
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/catalog/services/new')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Criar serviço</span>
                        </button>
                    </div>

                    {/* Barra de Busca e Ações */}
                    <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-white border-slate-200'
                        }`}>
                        <div className="flex-1 relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                }`} />
                            <input
                                type="text"
                                placeholder="Buscar serviços..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${theme === 'dark'
                                    ? 'bg-black border-slate-700 text-white placeholder-slate-500'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                    }`}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                                    }`}
                                title="Visualização"
                            >
                                <Eye className="w-5 h-5" />
                            </button>
                            <button
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                                    }`}
                                title="Exportar"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1 ml-2">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                        ? 'bg-blue-600 text-white'
                                        : theme === 'dark'
                                            ? 'hover:bg-slate-700 text-slate-400'
                                            : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    <List className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                        ? 'bg-blue-600 text-white'
                                        : theme === 'dark'
                                            ? 'hover:bg-slate-700 text-slate-400'
                                            : 'hover:bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    <Grid className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Serviços */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className={`text-center py-12 rounded-xl border ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-white border-slate-200'
                            }`}>
                            <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                                {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
                            </p>
                        </div>
                    ) : (
                        <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-black border-slate-700' : 'bg-white border-slate-200'
                            }`}>
                            <table className="w-full">
                                <thead>
                                    <tr className={`border-b ${theme === 'dark' ? 'border-slate-700 bg-black' : 'border-slate-200 bg-slate-50'
                                        }`}>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Nome
                                        </th>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Preço
                                        </th>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Taxa de reserva
                                        </th>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Duração
                                        </th>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Local
                                        </th>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Colaborador(es)
                                        </th>
                                        <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                            }`}>
                                            Visibilidade
                                        </th>
                                        <th className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
                                    {filteredServices.map((service) => (
                                        <tr
                                            key={service.id}
                                            onClick={() => navigate(`/catalog/services/${service.id}`)}
                                            className={`transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                    {service.title || service.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                                    {formatPrice(service.price)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                                                    {service.is_reservation_fee_enabled
                                                        ? formatPrice(service.reservation_fee || 0)
                                                        : '0%'
                                                    }
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                                    {formatDuration(service.duration_minutes || service.duration)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {formatLocation(service.location_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                                                        {profile?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(service.visibility === 'public' || (service.active && !service.visibility))
                                                    ? 'bg-green-10 text-green-900 dark:bg-green-400/10 dark:text-green-400'
                                                    : 'bg-slate-50 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                                                    }`}>
                                                    {formatVisibility(service.visibility, service.active)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-600' : 'hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer com contador */}
                    {filteredServices.length > 0 && (
                        <div className={`mt-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            <span className="font-medium">{filteredServices.length}</span> serviço{filteredServices.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
