
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Menu, Info, Clock, Calendar, CheckCircle, AlertCircle, Hourglass, ShieldCheck, UserX } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import CustomSelect from '../components/CustomSelect';

interface SchedulingRules {
    slot_interval_minutes: number;
    scheduling_window_days: number;
    min_notice_minutes: number;
    gap_before_minutes: number;
    gap_after_minutes: number;
    confirmation_required: boolean;
    cancellation_policy_enabled: boolean;
    cancellation_minutes_limit: number;
    no_show_policy_enabled: boolean;
    no_show_tolerance_minutes: number;
}

export default function SchedulingRules() {
    const { theme } = useTheme();
    const { profile } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [rules, setRules] = useState<SchedulingRules>({
        slot_interval_minutes: 30,
        scheduling_window_days: 90,
        min_notice_minutes: 0,
        gap_before_minutes: 0,
        gap_after_minutes: 0,
        confirmation_required: false,
        cancellation_policy_enabled: false,
        cancellation_minutes_limit: 0,
        no_show_policy_enabled: false,
        no_show_tolerance_minutes: 0
    });

    useEffect(() => {
        if (profile?.company_id) {
            fetchRules();
        }
    }, [profile]);

    const fetchRules = async () => {
        if (!profile?.company_id) return;


        try {
            const { data, error } = await supabase
                .from('company_scheduling_rules')
                .select('*')
                .eq('company_id', profile.company_id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Allow "no rows found"

            if (data) {
                setRules({
                    slot_interval_minutes: data.slot_interval_minutes,
                    scheduling_window_days: data.scheduling_window_days,
                    min_notice_minutes: data.min_notice_minutes,
                    gap_before_minutes: data.gap_before_minutes,
                    gap_after_minutes: data.gap_after_minutes,
                    confirmation_required: data.confirmation_required,
                    cancellation_policy_enabled: data.cancellation_policy_enabled,
                    cancellation_minutes_limit: data.cancellation_minutes_limit || 0,
                    no_show_policy_enabled: data.no_show_policy_enabled,
                    no_show_tolerance_minutes: data.no_show_tolerance_minutes
                });
            }
        } catch (error) {
            console.error('Error fetching rules:', error);

        }
    };

    const handleSave = async () => {
        if (!profile?.company_id) return;

        setSaving(true);
        try {
            // Check if exists updates or inserts
            const { data: existing } = await supabase
                .from('company_scheduling_rules')
                .select('id')
                .eq('company_id', profile.company_id)
                .single();

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('company_scheduling_rules')
                    .update({
                        ...rules,
                        updated_at: new Date().toISOString()
                    })
                    .eq('company_id', profile.company_id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('company_scheduling_rules')
                    .insert({
                        company_id: profile.company_id,
                        ...rules
                    });
                error = insertError;
            }

            if (error) throw error;

            // Success feedback
            const successMsg = document.createElement('div');
            successMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'} animate-fade-in`;
            successMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                <span class="font-medium">Regras salvas com sucesso!</span>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);

        } catch (error) {
            console.error('Error saving rules:', error);
            // Error feedback
            const errorMsg = document.createElement('div');
            errorMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'} animate-fade-in`;
            errorMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                <span class="font-medium">Erro ao salvar regras</span>
            `;
            document.body.appendChild(errorMsg);
            setTimeout(() => errorMsg.remove(), 3000);
        } finally {
            setSaving(false);
        }
    };

    const SectionTitle = ({ title, subtitle, icon: Icon }: any) => (
        <div className="mb-6">
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {Icon && <Icon className="w-5 h-5 text-primary-500" />}
                {title}
            </h3>
            {subtitle && <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
        </div>
    );


    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }} className="min-h-screen transition-colors duration-300">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header Mobile */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>

                            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Regras para agendar
                            </h1>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-8">
                        {/* Configurações Gerais */}
                        <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Configurações</h2>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">Essencial</span>
                                </div>
                                <p className={`text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Defina as regras de agendamento online do seu negócio. As regras serão refletidas no seu site para todos seus serviços.
                                </p>

                                <div className={`mt-4 p-4 rounded-lg flex gap-3 ${theme === 'dark' ? 'bg-black/50 border border-slate-800' : 'bg-slate-50'}`}>
                                    <Info className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Aqui são as regras globais, caso queira personalizar para serviços específicos, acesse a <a href="#" className="text-primary-500 hover:underline">aba de serviços</a>.
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <SectionTitle
                                        title="Incrementos das vagas de horário"
                                        subtitle="O incremento mínimo que seu cliente vê entre horários disponíveis na hora de agendar."
                                    />
                                    <CustomSelect
                                        value={rules.slot_interval_minutes}
                                        onChange={(val: number) => setRules({ ...rules, slot_interval_minutes: val })}
                                        options={[
                                            { value: 5, label: '5 min' },
                                            { value: 10, label: '10 min' },
                                            { value: 15, label: '15 min' },
                                            { value: 20, label: '20 min' },
                                            { value: 30, label: '30 min' },
                                            { value: 45, label: '45 min' },
                                            { value: 60, label: '1 hora' },
                                        ]}
                                    />
                                </div>
                                {/* Visualização Ilustrativa - Incrementos */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                    <div className="relative z-10 flex flex-col items-center gap-4 w-64">
                                        {/* Previous Slot */}
                                        <div className={`w-full p-3 rounded-xl border backdrop-blur-sm transform scale-95 opacity-50 transition-all ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-300'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700"><Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} /></div>
                                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>14:00</span>
                                                </div>
                                                <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                                            </div>
                                        </div>

                                        {/* Active Slot */}
                                        <div className={`w-full p-4 rounded-xl shadow-xl border transform scale-105 z-20 transition-all ring-1 ring-primary-500/20 relative ${theme === 'dark' ? 'bg-slate-800 border-primary-900/30' : 'bg-white border-primary-200'}`}>
                                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full"></div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20"><Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" /></div>
                                                    <div>
                                                        <span className={`block text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>14:{rules.slot_interval_minutes}</span>
                                                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${theme === 'dark' ? 'text-primary-400' : 'text-primary-600'}`}>Disponível</span>
                                                    </div>
                                                </div>
                                                <div className="w-5 h-5 rounded-full border-[5px] border-primary-500 shadow-lg shadow-primary-500/30"></div>
                                            </div>
                                        </div>

                                        {/* Next Slot */}
                                        <div className={`w-full p-3 rounded-xl border backdrop-blur-sm transform scale-95 opacity-50 transition-all ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-100 border-slate-300'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700"><Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} /></div>
                                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>14:{rules.slot_interval_minutes * 2}</span>
                                                </div>
                                                <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 mt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <SectionTitle
                                        title="Janela de agendamento"
                                        subtitle="O período relativo até quando seus clientes podem marcar um agendamento."
                                    />
                                    <CustomSelect
                                        value={rules.scheduling_window_days}
                                        onChange={(val: number) => setRules({ ...rules, scheduling_window_days: val })}
                                        options={[
                                            { value: 7, label: 'Até 7 dias corridos no futuro' },
                                            { value: 15, label: 'Até 15 dias corridos no futuro' },
                                            { value: 30, label: 'Até 30 dias corridos no futuro' },
                                            { value: 60, label: 'Até 60 dias corridos no futuro' },
                                            { value: 90, label: 'Até 90 dias corridos no futuro' },
                                            { value: 180, label: 'Até 6 meses no futuro' },
                                            { value: 365, label: 'Até 1 ano no futuro' },
                                        ]}
                                    />
                                </div>
                                {/* Visualização Ilustrativa - Janela */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                    <div className="w-full max-w-sm px-8 relative z-10">
                                        {/* Calendar Strip */}
                                        <div className={`rounded-2xl shadow-xl overflow-hidden border ring-1 ring-black/5 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>Calendário</span>
                                                <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold">Até {rules.scheduling_window_days} dias</span>
                                            </div>
                                            <div className="p-4 grid grid-cols-7 gap-2">
                                                {[...Array(7)].map((_, i) => (
                                                    <div key={i} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs border ${i < 4
                                                        ? `border text-slate-700 dark:text-slate-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`
                                                        : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-300 dark:text-slate-700 opacity-50'
                                                        }`}>
                                                        <span className="opacity-50 text-[8px] mb-0.5">DOM</span>
                                                        <span className="font-bold">{10 + i}</span>
                                                    </div>
                                                ))}
                                                <div className="col-span-7 mt-2">
                                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                                        <div className="h-full bg-green-500 w-3/4 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                                    </div>
                                                    <div className="flex justify-between mt-1.5">
                                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>Hoje</span>
                                                        <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Limite ({rules.scheduling_window_days}d)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 mt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <SectionTitle
                                        title="Antecedência para agendar"
                                        subtitle="É a antecedência mínima para agendar, ou seja, o tempo mínimo necessário entre seu cliente agendar e o início do atendimento."
                                    />
                                    <CustomSelect
                                        value={rules.min_notice_minutes}
                                        onChange={(val: number) => setRules({ ...rules, min_notice_minutes: val })}
                                        options={[
                                            { value: 0, label: 'Não exigir antecedência' },
                                            { value: 30, label: '30 min de antecedência' },
                                            { value: 60, label: '1 hora de antecedência' },
                                            { value: 120, label: '2 horas de antecedência' },
                                            { value: 240, label: '4 horas de antecedência' },
                                            { value: 1440, label: '24 horas de antecedência' },
                                        ]}
                                    />
                                </div>
                                {/* Visualização Ilustrativa - Antecedencia */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                                    <div className="w-full max-w-sm px-8">
                                        <div className="relative">
                                            {/* Timeline bar */}
                                            <div className={`h-14 w-full rounded-xl shadow-sm border flex overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}>
                                                {/* Blocked Zone */}
                                                <div className="h-full bg-slate-100 dark:bg-slate-700/50 relative flex items-center justify-center transition-all duration-500" style={{ width: rules.min_notice_minutes > 0 ? '40%' : '0%' }}>
                                                    {rules.min_notice_minutes > 0 && (
                                                        <div className="flex flex-col items-center opacity-70">
                                                            <div className={`text-[10px] uppercase font-bold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Bloqueado</div>
                                                            <div className="h-1 w-8 bg-slate-300 rounded-full"></div>
                                                        </div>
                                                    )}
                                                    {/* Divider */}
                                                    {rules.min_notice_minutes > 0 && (
                                                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-red-400 border-r border-red-400 border-dashed"></div>
                                                    )}
                                                </div>

                                                {/* Allowed Zone */}
                                                <div className="flex-1 bg-green-50/50 dark:bg-green-900/10 flex items-center justify-center relative">
                                                    <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Disponível para agendar
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Labels below */}
                                            <div className={`flex justify-between text-[10px] font-medium mt-2 px-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                <span>Agora</span>
                                                {rules.min_notice_minutes > 0 && <span style={{ left: '40%', position: 'absolute' }} className="text-slate-600 dark:text-slate-300 font-bold -translate-x-1/2">+ {rules.min_notice_minutes}min</span>}
                                                <span>Futuro</span>
                                            </div>

                                            {/* Floating Badge */}
                                            {rules.min_notice_minutes > 0 && (
                                                <div className="absolute -top-3 left-[40%] -translate-x-1/2">
                                                    <div className={`text-[10px] px-2 py-0.5 rounded shadow-lg flex items-center gap-1 ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white'}`}>
                                                        <Hourglass className="w-3 h-3 text-yellow-400" />
                                                        Carência
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 mt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <SectionTitle
                                        title="Intervalo antes e depois do atendimento"
                                        subtitle="Defina intervalos pré-atendimento e/ou pós-atendimento para preparo ou descanso. A duração do atendimento não é alterada."
                                    />

                                    <div className="space-y-4">
                                        <div>
                                            <label className={`text-sm font-medium mb-1 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Pré-atendimento</label>
                                            <CustomSelect
                                                value={rules.gap_before_minutes}
                                                onChange={(val: number) => setRules({ ...rules, gap_before_minutes: val })}
                                                options={[
                                                    { value: 0, label: 'Nenhum' },
                                                    { value: 5, label: '5 min' },
                                                    { value: 10, label: '10 min' },
                                                    { value: 15, label: '15 min' },
                                                    { value: 30, label: '30 min' },
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium mb-1 block ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Pós-atendimento</label>
                                            <CustomSelect
                                                value={rules.gap_after_minutes}
                                                onChange={(val: number) => setRules({ ...rules, gap_after_minutes: val })}
                                                options={[
                                                    { value: 0, label: 'Nenhum' },
                                                    { value: 5, label: '5 min' },
                                                    { value: 10, label: '10 min' },
                                                    { value: 15, label: '15 min' },
                                                    { value: 30, label: '30 min' },
                                                ]}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Visualização Ilustrativa - Gaps */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                    <div className="w-full max-w-sm px-6">
                                        <div className="relative flex items-center">
                                            {/* Pre Gap */}
                                            <div className={`h-16 rounded-l-2xl flex flex-col items-center justify-center border-y border-l transition-all duration-300 relative group
                                                ${rules.gap_before_minutes > 0
                                                    ? 'w-1/4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                                                    : 'w-0 border-transparent opacity-0 overflow-hidden'}`
                                            }>
                                                {rules.gap_before_minutes > 0 && (
                                                    <div className="animate-fade-in absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Pré</span>
                                                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">{rules.gap_before_minutes}m</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Service Block */}
                                            <div className={`flex-1 h-20 rounded-2xl shadow-xl flex items-center justify-between px-4 z-10 border relative mx-[-8px] ${theme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">JD</div>
                                                    <div>
                                                        <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-600 rounded mb-1.5"></div>
                                                        <div className="h-2 w-12 bg-slate-100 dark:bg-slate-700 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded">SERVIÇO</span>
                                                </div>
                                            </div>

                                            {/* Post Gap */}
                                            <div className={`h-16 rounded-r-2xl flex flex-col items-center justify-center border-y border-r transition-all duration-300 relative
                                                ${rules.gap_after_minutes > 0
                                                    ? 'w-1/4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                                                    : 'w-0 border-transparent opacity-0 overflow-hidden'}`
                                            }>
                                                {rules.gap_after_minutes > 0 && (
                                                    <div className="animate-fade-in absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Pós</span>
                                                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">{rules.gap_after_minutes}m</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center mt-6">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Tempo total ocupado na agenda: <strong className="text-slate-900 dark:text-white">{30 + rules.gap_before_minutes + rules.gap_after_minutes} min</strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Termo de Compromisso */}
                        <div className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-black border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Termo de Compromisso</h2>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">Essencial</span>
                                </div>
                                <p className={`text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Após ativar o Termo de Compromisso, seus clientes terão de aceitá-lo para agendar pelo seu site.
                                </p>

                                <div className={`mt-4 p-4 rounded-lg flex gap-3 ${theme === 'dark' ? 'bg-black/50 border border-slate-800' : 'bg-slate-50'}`}>
                                    <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                                        O Termo de Compromisso é um conjunto de regras (ou políticas) com objetivo de proteger seu negócio! São elas: a <b>regra de confirmação</b>, a <b>regra de cancelamento ou remarcação</b> e a <b>regra de atraso ou falta</b>.
                                    </p>
                                </div>
                            </div>

                            {/* Regra de Confirmação */}
                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Regra de confirmação de agendamentos</h3>
                                        <button
                                            onClick={() => setRules({ ...rules, confirmation_required: !rules.confirmation_required })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rules.confirmation_required ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rules.confirmation_required ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
                                        Solicite que seus clientes confirmem agendamentos. Agendamentos não confirmados ficarão visualmente destacados na sua agenda.
                                    </p>
                                </div>
                                {/* Visualização Ilustrativa - Confirmação */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                    <div className="w-full max-w-[280px] perspective-1000">
                                        {/* Notification Card */}
                                        <div className={`relative rounded-2xl p-5 shadow-2xl border transition-all duration-500 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}
                                             ${rules.confirmation_required ? 'border-primary-500 ring-4 ring-primary-500/10 rotate-y-0 scale-100' : 'border-slate-200 dark:border-slate-700 scale-95 opacity-50 grayscale'}`}>

                                            {rules.confirmation_required && (
                                                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                                    AÇÃO NECESSÁRIA
                                                </div>
                                            )}

                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                    B
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`h-2.5 w-24 rounded-full mb-2 opacity-80 ${theme === 'dark' ? 'bg-white' : 'bg-slate-800'}`}></div>
                                                    <div className={`h-2 w-16 rounded-full opacity-50 ${theme === 'dark' ? 'bg-slate-400' : 'bg-slate-600'}`}></div>
                                                </div>
                                                <div className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>14:00</div>
                                            </div>

                                            <div className="space-y-2.5 mb-5">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-primary-500" />
                                                    <div className="h-2 w-32 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <div className={`flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>Recusar</div>
                                                <div className={`flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-lg shadow-primary-500/30 transition-all ${rules.confirmation_required ? 'bg-blue-600 text-white' : 'bg-slate-400 text-white'}`}>
                                                    Confirmar
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Regra de Cancelamento */}
                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 mt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Regra de cancelamento ou reagendamento</h3>
                                        <button
                                            onClick={() => setRules({ ...rules, cancellation_policy_enabled: !rules.cancellation_policy_enabled })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rules.cancellation_policy_enabled ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rules.cancellation_policy_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
                                        Estabeleça um limite para que seus clientes possam remarcar agendamentos.
                                    </p>
                                    {rules.cancellation_policy_enabled && (
                                        <CustomSelect
                                            value={rules.cancellation_minutes_limit}
                                            onChange={(val: number) => setRules({ ...rules, cancellation_minutes_limit: val })}
                                            options={[
                                                { value: 0, label: 'Até o início do agendamento' },
                                                { value: 60, label: 'Até 1 hora antes' },
                                                { value: 120, label: 'Até 2 horas antes' },
                                                { value: 360, label: 'Até 6 horas antes' },
                                                { value: 1440, label: 'Até 24 horas antes' },
                                                { value: 2880, label: 'Até 48 horas antes' },
                                            ]}
                                        />
                                    )}
                                </div>
                                {/* Visualização Ilustrativa - Cancelamento */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                    {/* Timeline Illustration */}
                                    <div className="w-full max-w-[300px] relative">
                                        <div className="absolute left-[30px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                                        <div className="space-y-8 relative">
                                            {/* Step 1: Booking */}
                                            <div className="flex items-center gap-4 opacity-50">
                                                <div className={`w-[60px] text-right text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>09:00</div>
                                                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 relative z-10 border-2 border-slate-50 dark:border-slate-800"></div>
                                                <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>Agendamento criado</div>
                                            </div>

                                            {/* Step 2: Deadline */}
                                            <div className={`flex items-center gap-4 transition-all duration-300 ${rules.cancellation_policy_enabled ? 'opacity-100' : 'opacity-30 blur-[1px]'}`}>
                                                <div className="w-[60px] text-right text-xs font-bold text-red-500">LIMITE</div>
                                                <div className="w-4 h-4 rounded-full bg-red-500 relative z-10 border-2 border-white dark:border-slate-800 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]"></div>
                                                <div className={`border shadow-lg px-3 py-2 rounded-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 border-red-900/30 shadow-red-900/20' : 'bg-white border-red-200'}`}>
                                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        Taxa cobrada
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Step 3: Appointment */}
                                            <div className="flex items-center gap-4 opacity-50">
                                                <div className={`w-[60px] text-right text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>14:00</div>
                                                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 relative z-10 border-2 border-slate-50 dark:border-slate-800"></div>
                                                <div className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700'}`}>Início do serviço</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Regra de Atraso/Falta */}
                            <div className="grid md:grid-cols-2 gap-12 border-t pt-8 mt-8 border-slate-200 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Regra de atraso ou falta</h3>
                                        <button
                                            onClick={() => setRules({ ...rules, no_show_policy_enabled: !rules.no_show_policy_enabled })}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rules.no_show_policy_enabled ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rules.no_show_policy_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
                                        Determine a tolerância máxima para atrasos.
                                    </p>
                                    {rules.no_show_policy_enabled && (
                                        <CustomSelect
                                            value={rules.no_show_tolerance_minutes}
                                            onChange={(val: number) => setRules({ ...rules, no_show_tolerance_minutes: val })}
                                            options={[
                                                { value: 0, label: 'Sem tolerância (exigir pontualidade)' },
                                                { value: 5, label: '5 min de tolerância' },
                                                { value: 10, label: '10 min de tolerância' },
                                                { value: 15, label: '15 min de tolerância' },
                                                { value: 30, label: '30 min de tolerância' },
                                            ]}
                                        />
                                    )}
                                </div>
                                {/* Visualização Ilustrativa - Atraso */}
                                <div className={`relative overflow-hidden rounded-2xl border flex items-center justify-center min-h-[240px] ${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'}`}>
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, gray 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                    <div className="w-full max-w-[260px]">
                                        <div className={`flex flex-col gap-3 transition-opacity duration-300 ${!rules.no_show_policy_enabled && 'opacity-50 grayscale'}`}>
                                            {/* User Row */}
                                            <div className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <UserX className="w-full h-full p-2 text-slate-400" />
                                                    </div>
                                                    {rules.no_show_policy_enabled && (
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold">!</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-600 rounded mb-1.5"></div>
                                                    <div className="h-2 w-12 bg-slate-100 dark:bg-slate-700 rounded"></div>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-[10px] font-bold ${theme === 'dark' ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-700'}`}>
                                                    14:00
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {rules.no_show_policy_enabled && (
                                                <div className="mx-auto flex flex-col items-center animate-fade-in-up">
                                                    <div className="h-8 w-0.5 bg-red-300 dark:bg-red-900/50 mb-2"></div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
                                                        <UserX className="w-4 h-4" />
                                                        <div>
                                                            <span className="block text-xs font-bold uppercase">Não Compareceu</span>
                                                            {rules.no_show_tolerance_minutes > 0 && (
                                                                <span className="text-[10px] opacity-80 block">+ {rules.no_show_tolerance_minutes} min tolerância</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
