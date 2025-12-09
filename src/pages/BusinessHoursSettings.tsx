import { useState, useEffect, useRef } from 'react';
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

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    theme: string;
}

const CustomTimePicker = ({ value, onChange, disabled, theme }: TimePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const [selectedHour, selectedMinute] = value ? value.split(':') : ['00', '00'];

    // Scroll to selected time when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const hourEl = containerRef.current.querySelector(`[data-hour="${selectedHour}"]`);
            const minuteEl = containerRef.current.querySelector(`[data-minute="${selectedMinute}"]`);
            hourEl?.scrollIntoView({ block: 'center' });
            minuteEl?.scrollIntoView({ block: 'center' });
        }
    }, [isOpen]);

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full h-full bg-transparent border-none text-base font-medium focus:ring-0 text-center cursor-pointer flex items-center justify-center outline-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                disabled={disabled}
            >
                {value?.substring(0, 5)}
            </button>
            <Clock className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />

            {/* Dropdown */}
            {isOpen && (
                <div className={`absolute top-[calc(100%+1rem)] left-1/2 -translate-x-1/2 w-48 p-2 rounded-xl shadow-xl border z-50 flex gap-2 animate-in fade-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    {/* Hours */}
                    <div className="flex-1 h-56 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 px-1">
                        <div className={`px-2 py-1 mb-1 text-xs font-bold text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Hora</div>
                        {hours.map(hour => (
                            <div
                                key={hour}
                                data-hour={hour}
                                onClick={() => onChange(`${hour}:${selectedMinute}`)}
                                className={`px-2 py-2 text-center text-sm rounded-lg cursor-pointer transition-all mb-1 ${hour === selectedHour
                                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                                    : theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {hour}
                            </div>
                        ))}
                    </div>

                    {/* Separator */}
                    <div className={`w-[1px] my-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`} />

                    {/* Minutes */}
                    <div className="flex-1 h-56 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 px-1">
                        <div className={`px-2 py-1 mb-1 text-xs font-bold text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Min</div>
                        {minutes.map(minute => (
                            <div
                                key={minute}
                                data-minute={minute}
                                onClick={() => onChange(`${selectedHour}:${minute}`)}
                                className={`px-2 py-2 text-center text-sm rounded-lg cursor-pointer transition-all mb-1 ${minute === selectedMinute
                                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                                    : theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {minute}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

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



                    {/* Header com Tabs e Botão Salvar */}
                    <div className="flex items-center justify-between mb-8">
                        {/* Tabs */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('funcionamento')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'funcionamento'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <Clock className="w-4 h-4" />
                                Funcionamento
                            </button>
                            <button
                                onClick={() => setActiveTab('colaboradores')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'colaboradores'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
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
                    {/* Content */}
                    {activeTab === 'funcionamento' && (
                        <div className="max-w-5xl mx-auto mt-8">
                            {/* Título e Descrição */}
                            <div className="mb-8">
                                <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    Horário de funcionamento
                                </h2>
                                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Limite os horários que seus clientes podem agendar online. Essa informação fica disponível no seu site.
                                </p>
                            </div>

                            {/* Timezone Info */}
                            <div className={`mb-8 p-4 rounded-xl border flex items-start gap-4 ${theme === 'dark' ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <div className="flex-1 pt-1">
                                    <h4 className={`text-sm font-bold mb-1 ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-900'}`}>Fuso Horário</h4>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-indigo-200/70' : 'text-indigo-700/80'}`}>
                                        Os horários abaixo estão no fuso horário de <strong className="text-indigo-800 dark:text-indigo-200">{timezoneLabel}</strong>. Ao realizar o agendamento pelo seu site, o horário será convertido para o fuso horário onde o cliente se localiza.
                                    </p>
                                </div>
                            </div>

                            {/* Days Schedule - Card Premium */}
                            <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {schedules.map((schedule, dayIndex) => {
                                        const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
                                        if (!day) return null;

                                        return (
                                            <div key={schedule.day_of_week} className={`p-6 transition-colors border-b last:border-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} ${!schedule.is_open ? 'bg-slate-50/50 dark:bg-white/[0.02]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'}`}>
                                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                                    {/* Left: Day Toggle */}
                                                    <div className="w-[200px] flex-shrink-0">
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <div className="relative">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={schedule.is_open}
                                                                    onChange={() => handleToggleDay(dayIndex)}
                                                                    className="sr-only"
                                                                />
                                                                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${schedule.is_open ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                                                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${schedule.is_open ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                                    {day.label}
                                                                </span>
                                                                {!schedule.is_open && (
                                                                    <span className="text-xs text-slate-500 font-medium">Oficina fechada</span>
                                                                )}
                                                            </div>
                                                        </label>
                                                    </div>

                                                    {/* Right: Slots */}
                                                    <div className="flex-1 space-y-3">
                                                        {schedule.is_open ? (
                                                            schedule.slots.map((slot, slotIndex) => (
                                                                <div
                                                                    key={slotIndex}
                                                                    className="flex items-center gap-3 animate-fade-in"
                                                                >
                                                                    {/* Time Inputs Group */}
                                                                    <div className={`flex-1 flex items-center gap-0 p-1.5 rounded-xl border ${theme === 'dark' ? 'bg-[#0f0f0f] border-slate-800' : 'bg-white border-slate-200'} shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors`}>
                                                                        <div className="flex-1 relative group flex items-center justify-center h-full">
                                                                            <CustomTimePicker
                                                                                value={slot.start_time}
                                                                                onChange={(val) => handleTimeChange(dayIndex, slotIndex, 'start_time', val)}
                                                                                theme={theme}
                                                                                disabled={!schedule.is_open}
                                                                            />
                                                                        </div>
                                                                        <div className={`h-6 w-[1px] ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                                                                        <div className="flex-1 relative group flex items-center justify-center h-full">
                                                                            <CustomTimePicker
                                                                                value={slot.end_time}
                                                                                onChange={(val) => handleTimeChange(dayIndex, slotIndex, 'end_time', val)}
                                                                                theme={theme}
                                                                                disabled={!schedule.is_open}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    {slotIndex === 0 ? (
                                                                        <button
                                                                            onClick={() => handleAddSlot(dayIndex)}
                                                                            className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${theme === 'dark'
                                                                                ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                                                                : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                                                                            title="Adicionar intervalo"
                                                                        >
                                                                            <Plus className="w-5 h-5" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                                                                            className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center transition-all group ${theme === 'dark'
                                                                                ? 'text-red-400 hover:bg-red-900/20'
                                                                                : 'bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600'}`}
                                                                            title="Remover horário"
                                                                        >
                                                                            <Trash2 className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className={`h-14 flex items-center px-6 rounded-xl border border-dashed ${theme === 'dark' ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400 bg-slate-50/50'}`}>
                                                                <span className="text-sm">Não há horários configurados para este dia.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
        </div >
    );
}
