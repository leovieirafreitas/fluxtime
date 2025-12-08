import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Clock, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const BRAZIL_TIMEZONES = [
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)', offset: '-02:00' },
    { value: 'America/Belem', label: 'Belém, Fortaleza (UTC-3)', offset: '-03:00' },
    { value: 'America/Sao_Paulo', label: 'São Paulo, Rio de Janeiro, Brasília (UTC-3)', offset: '-03:00' },
    { value: 'America/Manaus', label: 'Manaus, Porto Velho, Boa Vista (UTC-4)', offset: '-04:00' },
    { value: 'America/Rio_Branco', label: 'Rio Branco, Cruzeiro do Sul (UTC-5)', offset: '-05:00' },
];

export default function TimezoneSettings() {
    const { theme } = useTheme();
    const { profile } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedTimezone, setSelectedTimezone] = useState('America/Manaus');

    useEffect(() => {
        if (profile?.company_id) {
            fetchTimezone();
        }
    }, [profile]);

    const fetchTimezone = async () => {
        if (!profile?.company_id) return;

        try {
            const { data, error } = await supabase
                .from('companies')
                .select('timezone')
                .eq('id', profile.company_id)
                .single();

            if (error) throw error;

            if (data?.timezone) {
                setSelectedTimezone(data.timezone);
            }
        } catch (error) {
            console.error('Error fetching timezone:', error);
        }
    };

    const handleSave = async () => {
        if (!profile?.company_id) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('companies')
                .update({ timezone: selectedTimezone })
                .eq('id', profile.company_id);

            if (error) throw error;

            // Mostrar feedback de sucesso
            const successMsg = document.createElement('div');
            successMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
                } animate-fade-in`;
            successMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Fuso horário salvo com sucesso!</span>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);

        } catch (error) {
            console.error('Error saving timezone:', error);

            const errorMsg = document.createElement('div');
            errorMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'
                } animate-fade-in`;
            errorMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Erro ao salvar fuso horário</span>
            `;
            document.body.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 3000);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }}
            className="min-h-screen transition-colors duration-300"
        >
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

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Fuso horário
                            </h1>
                            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Defina o fuso horário da sua empresa para agendamentos precisos
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Timezone Selection */}
                    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Selecione o fuso horário
                            </h2>
                        </div>

                        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Os horários de agendamento serão convertidos automaticamente para o fuso horário selecionado.
                        </p>

                        <div className="space-y-3">
                            {BRAZIL_TIMEZONES.map((tz) => (
                                <label
                                    key={tz.value}
                                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTimezone === tz.value
                                            ? theme === 'dark'
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-purple-500 bg-purple-50'
                                            : theme === 'dark'
                                                ? 'border-slate-700 hover:border-slate-600'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="timezone"
                                        value={tz.value}
                                        checked={selectedTimezone === tz.value}
                                        onChange={(e) => setSelectedTimezone(e.target.value)}
                                        className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                                    />
                                    <div className="ml-4 flex-1">
                                        <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                            {tz.label}
                                        </div>
                                        <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {tz.offset}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className={`mt-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                            <div className="flex gap-2">
                                <svg className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                                        Importante
                                    </p>
                                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                                        Ao alterar o fuso horário, todos os novos agendamentos serão criados usando o novo fuso. Agendamentos existentes não serão afetados.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
