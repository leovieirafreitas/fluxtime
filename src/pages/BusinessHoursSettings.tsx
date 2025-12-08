import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { Clock, Menu, Plus, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface BusinessHourSlot {
    id?: string;
    start_time: string;
    end_time: string;
}

interface DaySchedule {
    day_of_week: number;
    is_open: boolean;
    slots: BusinessHourSlot[];
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
];

export default function BusinessHoursSettings() {
    const { theme } = useTheme();
    const { profile } = useUserProfile();
    const [saving, setSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'funcionamento' | 'colaboradores'>('funcionamento');
    const [schedules, setSchedules] = useState<DaySchedule[]>(
        DAYS_OF_WEEK.map(day => ({
            day_of_week: day.value,
            is_open: day.value >= 1 && day.value <= 5, // Segunda a Sexta aberto
            slots: [{ start_time: '07:00', end_time: '16:00' }]
        }))
    );
    const [timezone, setTimezone] = useState('America/Manaus');
    const [timezoneLabel, setTimezoneLabel] = useState('GMT-04:00 Amazon Time - Manaus, Campo Grande, Cuiabá, Porto Velho');

    useEffect(() => {
        if (profile?.company_id) {
            fetchBusinessHours();
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
                setTimezone(data.timezone);
                setTimezoneLabel(getTimezoneLabel(data.timezone));
            }
        } catch (error) {
            console.error('Error fetching timezone:', error);
        }
    };

    const getTimezoneLabel = (tz: string): string => {
        const timezones: { [key: string]: string } = {
            'America/Noronha': 'GMT-02:00 Fernando de Noronha',
            'America/Belem': 'GMT-03:00 Belém, Fortaleza',
            'America/Sao_Paulo': 'GMT-03:00 São Paulo, Rio de Janeiro, Brasília',
            'America/Manaus': 'GMT-04:00 Amazon Time - Manaus, Campo Grande, Cuiabá, Porto Velho',
            'America/Rio_Branco': 'GMT-05:00 Rio Branco, Cruzeiro do Sul',
        };
        return timezones[tz] || tz;
    };

    const fetchBusinessHours = async () => {
        if (!profile?.company_id) return;

        try {
            const { data, error } = await supabase
                .from('business_hours')
                .select('*')
                .eq('company_id', profile.company_id)
                .order('day_of_week')
                .order('sort_order');

            if (error) throw error;

            if (data && data.length > 0) {
                // Agrupar por dia da semana
                const groupedByDay = DAYS_OF_WEEK.map(day => {
                    const daySlots = data.filter(h => h.day_of_week === day.value);

                    if (daySlots.length > 0) {
                        return {
                            day_of_week: day.value,
                            is_open: daySlots[0].is_open,
                            slots: daySlots.map(slot => ({
                                id: slot.id,
                                start_time: slot.start_time,
                                end_time: slot.end_time
                            }))
                        };
                    }

                    return {
                        day_of_week: day.value,
                        is_open: false,
                        slots: [{ start_time: '09:00', end_time: '18:00' }]
                    };
                });

                setSchedules(groupedByDay);
            }
        } catch (error) {
            console.error('Error fetching business hours:', error);
        }
    };

    const handleToggleDay = (dayIndex: number) => {
        setSchedules(prev => prev.map((schedule, idx) =>
            idx === dayIndex ? { ...schedule, is_open: !schedule.is_open } : schedule
        ));
    };

    const handleTimeChange = (dayIndex: number, slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
        setSchedules(prev => prev.map((schedule, idx) => {
            if (idx === dayIndex) {
                const newSlots = [...schedule.slots];
                newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
                return { ...schedule, slots: newSlots };
            }
            return schedule;
        }));
    };

    const handleAddSlot = (dayIndex: number) => {
        setSchedules(prev => prev.map((schedule, idx) => {
            if (idx === dayIndex) {
                const lastSlot = schedule.slots[schedule.slots.length - 1];
                return {
                    ...schedule,
                    slots: [...schedule.slots, { start_time: lastSlot.end_time, end_time: '18:00' }]
                };
            }
            return schedule;
        }));
    };

    const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
        setSchedules(prev => prev.map((schedule, idx) => {
            if (idx === dayIndex && schedule.slots.length > 1) {
                return {
                    ...schedule,
                    slots: schedule.slots.filter((_, sIdx) => sIdx !== slotIndex)
                };
            }
            return schedule;
        }));
    };

    const handleSave = async () => {
        if (!profile?.company_id) return;

        setSaving(true);
        try {
            // Deletar horários existentes
            await supabase
                .from('business_hours')
                .delete()
                .eq('company_id', profile.company_id);

            // Inserir novos horários
            const hoursToInsert = schedules.flatMap((schedule) =>
                schedule.slots.map((slot, slotIdx) => ({
                    company_id: profile.company_id,
                    day_of_week: schedule.day_of_week,
                    is_open: schedule.is_open,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    sort_order: slotIdx
                }))
            );

            const { error } = await supabase
                .from('business_hours')
                .insert(hoursToInsert);

            if (error) throw error;

            // Feedback de sucesso
            const successMsg = document.createElement('div');
            successMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'
                } animate-fade-in`;
            successMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Horários salvos com sucesso!</span>
            `;
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 3000);

        } catch (error) {
            console.error('Error saving business hours:', error);

            const errorMsg = document.createElement('div');
            errorMsg.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'
                } animate-fade-in`;
            errorMsg.innerHTML = `
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium">Erro ao salvar horários</span>
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

                    {/* Breadcrumb */}
                    <div className={`flex items-center gap-2 mb-6 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        <span>Negócio</span>
                        <span>/</span>
                        <span className="font-medium">Horários e turnos</span>
                    </div>

                    {/* Header com Tabs e Botão Salvar */}
                    <div className="flex items-center justify-between mb-8">
                        {/* Tabs */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('funcionamento')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'funcionamento'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <Clock className="w-4 h-4" />
                                Funcionamento
                            </button>
                            <button
                                onClick={() => setActiveTab('colaboradores')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'colaboradores'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                Colaboradores
                            </button>
                        </div>

                        {/* Botão Salvar */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>

                    {/* Content */}
                    {activeTab === 'funcionamento' && (
                        <div className="max-w-4xl mx-auto">
                            {/* Título e Descrição */}
                            <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Horário de funcionamento
                            </h2>
                            <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Limite os horários que seus clientes podem agendar online. Essa informação fica disponível no seu site.
                            </p>

                            {/* Timezone Info */}
                            <div className={`mb-8 p-4 rounded-lg flex items-start gap-3 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Os horários abaixo estão no fuso horário de <strong>{timezoneLabel}</strong>. Ao realizar o agendamento pelo seu site, o horário será convertido para o fuso horário onde o cliente se localiza.
                                    </p>
                                </div>
                            </div>

                            {/* Days Schedule - SEM CARD */}
                            <div className="space-y-4">
                                {schedules.map((schedule, dayIndex) => {
                                    const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
                                    if (!day) return null;

                                    return (
                                        <div key={schedule.day_of_week}>
                                            {schedule.slots.map((slot, slotIndex) => (
                                                <div
                                                    key={slotIndex}
                                                    className={`grid grid-cols-[200px_1fr_auto] gap-4 items-center ${slotIndex > 0 ? 'mt-3' : ''
                                                        }`}
                                                >
                                                    {/* Checkbox e Label - Apenas na primeira linha */}
                                                    {slotIndex === 0 ? (
                                                        <label className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={schedule.is_open}
                                                                onChange={() => handleToggleDay(dayIndex)}
                                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                            <span className={`font-normal ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                                {day.label}
                                                            </span>
                                                            {!schedule.is_open && (
                                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                                                    }`}>
                                                                    Fechado
                                                                </span>
                                                            )}
                                                        </label>
                                                    ) : (
                                                        <div></div>
                                                    )}

                                                    {/* Time Inputs */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex-1 max-w-[180px]">
                                                            <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${schedule.is_open && slotIndex === 0
                                                                ? theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                                                : slotIndex > 0
                                                                    ? theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                                                    : theme === 'dark' ? 'text-slate-700' : 'text-slate-300'
                                                                }`} />
                                                            <input
                                                                type="time"
                                                                value={slot.start_time}
                                                                onChange={(e) => handleTimeChange(dayIndex, slotIndex, 'start_time', e.target.value)}
                                                                disabled={!schedule.is_open && slotIndex === 0}
                                                                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm transition-colors ${schedule.is_open || slotIndex > 0
                                                                    ? theme === 'dark'
                                                                        ? 'bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                                    : theme === 'dark'
                                                                        ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                                                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                            />
                                                        </div>

                                                        <div className="relative flex-1 max-w-[180px]">
                                                            <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${schedule.is_open && slotIndex === 0
                                                                ? theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                                                : slotIndex > 0
                                                                    ? theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                                                                    : theme === 'dark' ? 'text-slate-700' : 'text-slate-300'
                                                                }`} />
                                                            <input
                                                                type="time"
                                                                value={slot.end_time}
                                                                onChange={(e) => handleTimeChange(dayIndex, slotIndex, 'end_time', e.target.value)}
                                                                disabled={!schedule.is_open && slotIndex === 0}
                                                                className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm transition-colors ${schedule.is_open || slotIndex > 0
                                                                    ? theme === 'dark'
                                                                        ? 'bg-slate-800 border-slate-700 text-white hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                                    : theme === 'dark'
                                                                        ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                                                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                                                    }`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Action Button */}
                                                    {slotIndex === 0 ? (
                                                        <button
                                                            onClick={() => handleAddSlot(dayIndex)}
                                                            disabled={!schedule.is_open}
                                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${schedule.is_open
                                                                ? theme === 'dark'
                                                                    ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                                                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                                                                : 'opacity-30 cursor-not-allowed text-slate-400'
                                                                }`}
                                                            title="Adicionar outro horário"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${theme === 'dark'
                                                                ? 'hover:bg-red-900/20 text-red-400 hover:text-red-300'
                                                                : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                                                                }`}
                                                            title="Remover horário"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'colaboradores' && (
                        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                            <p className={`text-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                Funcionalidade de colaboradores em desenvolvimento
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
