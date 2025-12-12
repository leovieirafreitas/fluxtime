
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, MoreHorizontal, X, User, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../contexts/ThemeContext';


interface Client {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    created_at: string;
}

export default function Clients() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('Usuário não autenticado');

            const { error } = await supabase.from('clients').insert([{
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                user_id: user.id
            }]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', phone: '', email: '' });
            fetchClients();

        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            alert('Erro ao criar cliente. Verifique se a tabela "clients" existe no Supabase.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
    );

    return (
        <div
            style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }}
            className="min-h-screen flex transition-colors duration-300"
        >
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-64'}`}>
                <div className="p-4 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className={`md:hidden p-2 -ml-2 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MoreHorizontal className="w-6 h-6" />
                            </button>
                            <h1 className={`text-2xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <User className="w-6 h-6" />
                                Clientes
                            </h1>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Criar cliente
                        </button>
                    </div>

                    {/* Filters */}
                    <div className={`rounded-xl p-4 shadow-sm border flex flex-col md:flex-row gap-4 justify-between items-center ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, email ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark'
                                    ? 'bg-black border-slate-800 text-white placeholder:text-slate-600'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                                    }`}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button className={`flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                                ? 'border-slate-800 text-slate-300 hover:bg-slate-800 bg-transparent'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                                }`}>
                                <Filter className="w-4 h-4" />
                                Visualização
                            </button>
                            <button className={`flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                                ? 'border-slate-800 text-slate-300 hover:bg-slate-800 bg-transparent'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                                }`}>
                                <Download className="w-4 h-4" />
                                Exportar
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`rounded-xl shadow-sm border overflow-hidden ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className={`border-b ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Celular</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Adicionado em</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-200'}`}>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Carregando clientes...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredClients.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                Nenhum cliente encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredClients.map((client) => (
                                            <tr key={client.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {client.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{client.name}</span>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {client.phone}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {client.email || '-'}
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button className={`text-slate-400 hover:text-slate-600 ${theme === 'dark' ? 'hover:text-slate-200' : ''}`}>
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className={`px-6 py-4 border-t flex items-center justify-between text-sm text-slate-500 ${theme === 'dark' ? 'border-slate-800 bg-black' : 'border-slate-200 bg-slate-50'
                            }`}>
                            <span>{filteredClients.length} clientes</span>
                            <div className="flex gap-2">
                                {/* Paginação simplificada por enquanto */}
                                <span>50 / página</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 ${theme === 'dark' ? 'bg-black border border-slate-800' : 'bg-white'
                        }`}>
                        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                            <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Novo <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>cliente</span>
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient} className="p-6 space-y-6">
                            {/* Alerta */}
                            <div className={`rounded-xl p-4 flex gap-3 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'
                                }`}>
                                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>O telefone é a chave única do cliente</h3>
                                    <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Se o telefone inserido já pertencer a um cliente seu, apenas atualizaremos os dados dele.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="name" className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Nome <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        id="name"
                                        placeholder="Escreva o nome do cliente..."
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${theme === 'dark'
                                            ? 'bg-black border-slate-800 text-white placeholder:text-slate-600'
                                            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                                            }`}
                                    />
                                    <p className="text-xs text-slate-500">Dica: preencha o nome completo para fácil identificação</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="phone" className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Telefone <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="tel"
                                            id="phone"
                                            placeholder="+55"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${theme === 'dark'
                                                ? 'bg-black border-slate-800 text-white placeholder:text-slate-600'
                                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                                                }`}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">Digite somente números</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="email" className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        E-mail
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            id="email"
                                            placeholder="Adicione o e-mail"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${theme === 'dark'
                                                ? 'bg-black border-slate-800 text-white placeholder:text-slate-600'
                                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar cliente'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
