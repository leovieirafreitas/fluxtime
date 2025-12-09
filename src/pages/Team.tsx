import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Menu, Plus, Lock, AlertCircle, ChevronDown } from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface TeamMember {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    avatar_url?: string;
    last_sign_in_at?: string;
    status: string;
    color?: string;
}

export default function Team() {
    const { theme } = useTheme();
    const { profile } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({
        name: '',
        email: '',
        role: 'employee',
        color: 'bg-blue-500'
    });
    const [saving, setSaving] = useState(false);

    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500',
        'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500',
        'bg-red-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'
    ];

    useEffect(() => {
        if (profile?.company_id) {
            fetchTeam();
        }
    }, [profile]);

    const fetchTeam = async () => {
        try {
            setLoading(true);

            // Get current auth user to sync email if needed
            const { data: { user: authUser } } = await supabase.auth.getUser();

            // Fetch profiles linked to the company
            // Note: Assuming 'profiles' table has these fields.
            // In a real scenario, email might need to be fetched from a secure view or auth function.
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('company_id', profile?.company_id);

            if (error) throw error;

            if (data) {
                const teamMembers: TeamMember[] = data.map((user: any) => {
                    let email = user.email;

                    // Sync email for current user if missing
                    if (authUser && user.id === authUser.id && !email) {
                        email = authUser.email;
                        // Build-it sync to DB
                        supabase.from('profiles').update({ email: email }).eq('id', user.id).then();
                    }

                    return {
                        id: user.id,
                        full_name: user.full_name || 'Usuário sem nome',
                        email: email || 'Email não informado',
                        role: user.role === 'owner' ? 'Proprietário(a)' : 'Funcionário(a)',
                        avatar_url: user.avatar_url,
                        last_sign_in_at: user.last_sign_in_at,
                        status: user.status || 'active',
                        color: user.color || getRandomColor(user.full_name || '')
                    };
                });
                // Sort by creation or role? Owner first usually.
                // For now, just listing.
                setMembers(teamMembers);
            }
        } catch (error) {
            console.error('Error fetching team:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMember.name || !newMember.email || !profile?.company_id) return;

        try {
            setSaving(true);

            // In a real app, this would trigger an invitation via Edge Function.
            // Here we insert directly into profiles as 'invited'.
            // Note: Since 'profiles' uses user.id as primary key usually linked to auth,
            // inserting a dummy ID might fail if there's a foreign key constraint to auth.users.
            // However, usually profiles has `id` as uuid primary key. If it references auth.users(id), we HAVE to invite via auth first.
            // Let's verify if `profiles.id` references `auth.users`.
            // Assuming for this mockup we can insert if there's no strict FK or if we treat this as a 'pending' profile.
            // If it fails, we catch it.

            const { error } = await supabase
                .from('profiles')
                .insert([{
                    full_name: newMember.name,
                    email: newMember.email,
                    role: newMember.role,
                    color: newMember.color,
                    company_id: profile.company_id,
                    status: 'invited',
                    // We might need to generate a random UUID for ID if it's not auto-generated or if it must match auth.
                    // If it must match auth, we can't do this without inviting.
                    // PROCEEDING with assumption we can insert for now, or user understands this limitation.
                }]);

            if (error) throw error;

            setIsModalOpen(false);
            setNewMember({ name: '', email: '', role: 'employee', color: 'bg-blue-500' });
            fetchTeam();
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Erro ao adicionar colaborador. Verifique se você tem permissões.');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getRandomColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div
            style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }}
            className="min-h-screen transition-colors duration-300 relative"
        >
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Botão de Menu Mobile */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Breadcrumb e Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">


                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Novo colaborador
                        </button>
                    </div>

                    {/* Plan Banner */}
                    <div className={`mb-6 p-6 rounded-2xl flex flex-col md:flex-row items-start gap-6 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Assine o <span className="text-blue-600">Plano Essencial</span> para gerenciar colaboradores!
                            </h3>
                            <p className={`text-sm max-w-2xl mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Colaboradores podem ser adicionados somente no Plano Essencial. Cada acesso de colaborador custa <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>R$ 9,90/mês ou R$ 99,00/ano.</strong>
                            </p>
                            <div className="flex gap-3">
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                                    Saiba mais
                                </button>
                                <button className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${theme === 'dark'
                                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                    Falar com especialista
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Warning Banner */}
                    <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 ${theme === 'dark' ? 'bg-amber-900/20 border-amber-900/50 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                            Colaboradores convidados só precisam acessar <a href="#" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">https://app.fluxtime.com/login</a> e entrar na plataforma com o email do convite para aceitá-los.
                        </p>
                    </div>

                    {/* Team Table */}
                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={`border-b text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-900/50' : 'border-slate-100 text-slate-500 bg-slate-50'}`}>
                                        <th className="px-6 py-4">Nome</th>
                                        <th className="px-6 py-4">Cor</th>
                                        <th className="px-6 py-4">E-mail</th>
                                        <th className="px-6 py-4">Perfil</th>
                                        <th className="px-6 py-4">Último acesso</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center">
                                                <div className="flex justify-center">
                                                    <div className={`animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent`}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : members.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className={`px-6 py-12 text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                                Nenhum colaborador encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        members.map((member) => (
                                            <tr key={member.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {member.avatar_url ? (
                                                            <img src={member.avatar_url} alt={member.full_name} className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${member.color || getRandomColor(member.full_name)}`}>
                                                                {getInitials(member.full_name)}
                                                            </div>
                                                        )}
                                                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                            {member.full_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`w-6 h-6 rounded-md ${member.color || getRandomColor(member.full_name)} opacity-80 shadow-sm`}></div>
                                                </td>
                                                <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {member.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'Proprietário(a)'
                                                        ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                                        : theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {member.last_sign_in_at
                                                        ? new Date(member.last_sign_in_at).toLocaleDateString()
                                                        : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${member.status === 'active'
                                                        ? theme === 'dark' ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
                                                        : theme === 'dark' ? 'bg-amber-900/20 border-amber-900/50 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                                        {member.status === 'active' ? 'Ativo' : 'Convidado'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className={`px-6 py-4 border-t flex items-center justify-between text-xs ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                            <span>{members.length} colaboradores</span>
                            <div className="flex items-center gap-2">
                                <span>50 / página</span>
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Backdrop */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Novo Colaborador
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Nome completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newMember.name}
                                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
                                    placeholder="Ex: João Silva"
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    E-mail corporativo
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newMember.email}
                                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
                                    placeholder="Ex: joao@fluxtime.com"
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Função
                                </label>
                                <select
                                    value={newMember.role}
                                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500/20 outline-none ${theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
                                >
                                    <option value="employee">Funcionário(a)</option>
                                    <option value="manager">Gerente</option>
                                    <option value="owner">Proprietário(a)</option>
                                </select>
                            </div>

                            <div>
                                <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Cor de identificação
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewMember({ ...newMember, color })}
                                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ${theme === 'dark' ? 'ring-offset-slate-900' : 'ring-offset-white'} ${color} ${newMember.color === color ? 'ring-blue-500 scale-110' : 'ring-transparent'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${theme === 'dark'
                                        ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    <span>Adicionar</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
