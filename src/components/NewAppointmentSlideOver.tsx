import { X, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { useState } from 'react';

interface NewAppointmentSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    clients: any[];
    services: any[];
    selectedService: any;
    setSelectedService: (service: any) => void;
    selectedClient: string;
    setSelectedClient: (client: string) => void;
    appointmentDate: string;
    setAppointmentDate: (date: string) => void;
    appointmentTime: string;
    setAppointmentTime: (time: string) => void;
    discountType: 'percent' | 'fixed';
    setDiscountType: (type: 'percent' | 'fixed') => void;
    discountValue: number;
    setDiscountValue: (value: number) => void;
    subtotal: number;
    discount: number;
    total: number;
    userFullName: string;
    onSubmit: (data: { name: string; notes: string }) => void;
    schedulingRules: any;
    businessHours: any[];
    appointments: any[];
}

export default function NewAppointmentSlideOver({
    isOpen,
    onClose,
    clients,
    services,
    selectedService,
    setSelectedService,
    selectedClient,
    setSelectedClient,
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    subtotal,
    // discount,
    total,
    userFullName,
    onSubmit,
    schedulingRules,
    businessHours,
    appointments
}: NewAppointmentSlideOverProps) {
    const { theme } = useTheme();
    const [appointmentName, setAppointmentName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- LOGIC FOR CONSTRAINTS ---

    // 1. Valid Dates
    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const check = new Date(date);
        check.setHours(0, 0, 0, 0);

        // Past dates
        if (check < today) return true;

        // Future limit
        if (schedulingRules?.scheduling_window_days) {
            const maxDate = new Date(today);
            maxDate.setDate(today.getDate() + schedulingRules.scheduling_window_days);
            if (check > maxDate) return true;
        }

        // Closed days (Business Hours check - OPTIONAL for DatePicker but good for logic)
        // If the business is closed strictly on weekends, we could disable them.
        // Assuming 'businessHours' contains objects { day_of_week: 0..6, is_open: boolean, ... }
        if (businessHours && businessHours.length > 0) {
            const dayOfWeek = check.getDay();
            const dayConfig = businessHours.find((h: any) => h.day_of_week === dayOfWeek);
            // If explicit config says closed, disable. If config missing, assume closed? Or open?
            // Usually if missing, it means closed or default. Let's assume safely:
            if (dayConfig && !dayConfig.is_open) return true;
        }

        return false;
    };

    // 2. Available Times for Selected Date
    const getAvailableTimes = () => {
        if (!appointmentDate) return [];

        const dateParts = appointmentDate.split('-');
        const currentSelectedDate = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
        );

        const dayOfWeek = currentSelectedDate.getDay();

        // Get limits from Business Hours
        // There can be multiple slots for same day? Usually logic is simplified to one range or multiple.
        // The arrays 'businessHours' usually has 1 entry per day of week (0-6).
        const dayConfig = businessHours?.find((h: any) => h.day_of_week === dayOfWeek);

        if (!dayConfig || !dayConfig.is_open) return []; // Closed

        const startStr = dayConfig.start_time; // "09:00"
        const endStr = dayConfig.end_time; // "18:00"

        if (!startStr || !endStr) return [];

        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);

        const available: string[] = [];

        // Interval
        const interval = schedulingRules?.slot_interval_minutes || 30;

        // Loop from start to end
        let currentH = startH;
        let currentM = startM;

        // Helper to convert H:M to minutes
        const toMinutes = (h: number, m: number) => h * 60 + m;
        const endMinutes = toMinutes(endH, endM);

        while (toMinutes(currentH, currentM) < endMinutes) {
            const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

            // Check specific availability (Collision with Appointments)
            // We need to check if this slot overlaps with any existing appointment on that day
            const slotStart = new Date(currentSelectedDate);
            slotStart.setHours(currentH, currentM, 0, 0);

            // Default service duration or 30 mins
            const duration = selectedService?.duration_minutes || 30;
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);

            // Check collision
            const hasCollision = appointments?.some((apt: any) => {
                const aptStart = new Date(apt.start_time);
                const aptEnd = new Date(apt.end_time || (aptStart.getTime() + 30 * 60000));

                // Check if overlapping
                // Overlap exists if: SlotStart < AptEnd AND SlotEnd > AptStart
                return slotStart < aptEnd && slotEnd > aptStart;
            });

            // Check Min Notice
            const now = new Date();
            let isTooShow = false;
            if (schedulingRules?.min_notice_minutes) {
                const limit = new Date(now.getTime() + schedulingRules.min_notice_minutes * 60000);
                if (slotStart < limit) isTooShow = true;
            } else {
                if (slotStart < now) isTooShow = true; // Default, can't book in past
            }

            if (!hasCollision && !isTooShow) {
                available.push(timeStr);
            }

            // Increment
            currentM += interval;
            if (currentM >= 60) {
                currentH += Math.floor(currentM / 60);
                currentM = currentM % 60;
            }
        }

        return available;
    };

    const availableTimes = getAvailableTimes();

    if (!isOpen) return null;

    // Função para formatar moeda
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            await onSubmit({ name: appointmentName, notes });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md z-[70] transform transition-transform duration-300 shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-white text-slate-900'
                }`}>

                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-100'
                    }`}>
                    <h2 className="text-xl font-bold">Novo agendamento</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                            ? 'hover:bg-zinc-800 text-zinc-400'
                            : 'hover:bg-slate-100 text-slate-600'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Data e Horário Estilizados - USANDO NOVOS COMPONENTES */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <CustomDatePicker
                                label="Data *"
                                value={appointmentDate}
                                onChange={setAppointmentDate}
                                isDateDisabled={isDateDisabled}
                            />
                        </div>
                        <div>
                            <CustomTimePicker
                                label="Horário *"
                                value={appointmentTime}
                                onChange={setAppointmentTime}
                                step={schedulingRules?.slot_interval_minutes || 30}
                                availableTimes={availableTimes}
                            />
                        </div>
                    </div>

                    {/* Recorrência */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium opacity-90">Recorrência</label>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                                Essencial
                            </span>
                        </div>
                        <CustomSelect
                            value={0}
                            onChange={() => { }}
                            options={[
                                { value: 0, label: 'Não se repete' },
                                { value: 1, label: 'Diariamente' },
                                { value: 2, label: 'Semanalmente' },
                                { value: 3, label: 'Mensalmente' }
                            ]}
                        />
                    </div>

                    {/* Cliente - COM BUSCA */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 opacity-90">Cliente *</label>
                        <CustomSelect
                            value={selectedClient}
                            onChange={(value) => setSelectedClient(String(value))}
                            options={clients.map(client => ({
                                value: client.id,
                                label: client.name
                            }))}
                            searchable={true}
                            placeholder="Selecione um cliente..."
                        />
                    </div>

                    {/* Colaborador - COM BUSCA */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 opacity-90">Colaborador(a) *</label>
                        <CustomSelect
                            value={userFullName}
                            onChange={() => { }}
                            options={[
                                { value: userFullName, label: userFullName }
                            ]}
                            searchable={true}
                            placeholder="Selecione um colaborador..."
                        />
                        <p className="mt-1.5 text-xs opacity-60">
                            Assine o Plano Essencial para adicionar colaboradores
                        </p>
                    </div>

                    {/* Serviço - COM BUSCA */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 opacity-90">Serviço *</label>
                        <CustomSelect
                            value={selectedService?.id || ''}
                            onChange={(value) => {
                                const service = services.find(s => s.id === value);
                                setSelectedService(service || null);
                            }}
                            options={services.map(service => ({
                                value: service.id,
                                label: `${service.name} • ${formatCurrency(service.price)}`
                            }))}
                            searchable={true}
                            placeholder="Selecione um serviço..."
                        />
                    </div>

                    {/* Duração */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 opacity-90">Duração</label>
                        <CustomSelect
                            value={selectedService?.duration_minutes || 30}
                            onChange={() => { }}
                            options={[
                                { value: 15, label: '15 min' },
                                { value: 30, label: '30 min' },
                                { value: 45, label: '45 min' },
                                { value: 60, label: '1 hora' },
                                { value: 90, label: '1h 30min' },
                                { value: 120, label: '2 horas' }
                            ]}
                        />
                        <p className="mt-1.5 text-xs opacity-60">
                            Se desejar, edite a duração padrão do serviço escolhido.
                        </p>
                    </div>

                    {/* Card de Valores */}
                    <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm opacity-70">Subtotal</span>
                            <span className="font-semibold">
                                {subtotal > 0 ? formatCurrency(subtotal) : 'Grátis'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm opacity-70">Desconto</span>
                            <div className="flex items-center gap-2">
                                <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-zinc-600">
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('percent')}
                                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${discountType === 'percent'
                                            ? 'bg-blue-600 text-white'
                                            : theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white hover:bg-slate-50'
                                            }`}
                                    >
                                        %
                                    </button>
                                    <div className={`w-[1px] ${theme === 'dark' ? 'bg-zinc-700' : 'bg-slate-300'}`} />
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('fixed')}
                                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${discountType === 'fixed'
                                            ? 'bg-blue-600 text-white'
                                            : theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white hover:bg-slate-50'
                                            }`}
                                    >
                                        R$
                                    </button>
                                </div>

                                <input
                                    type="number"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                                    className={`w-20 px-3 py-1 text-sm text-right rounded-md border outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${theme === 'dark'
                                        ? 'bg-zinc-950 border-zinc-700 text-white'
                                        : 'bg-white border-slate-300 text-slate-900'
                                        }`}
                                />
                                <span className="text-sm opacity-70 w-4">
                                    {discountType === 'percent' ? '%' : ''}
                                </span>
                            </div>
                        </div>

                        <div className={`pt-4 border-t flex justify-between items-baseline ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-200'
                            }`}>
                            <span className="font-semibold">Total</span>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {total > 0 ? formatCurrency(total) : 'Grátis'}
                            </span>
                        </div>
                    </div>

                    {/* Mais Opções (Estilo Accordion Clean) */}
                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-100 bg-slate-50/50'
                        }`}>
                        <details className="group">
                            <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Mais opções</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                        Opcional
                                    </span>
                                </div>
                                <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 opacity-50 block" />
                            </summary>

                            <div className="px-4 pb-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                {/* Nome do agendamento */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-90">Nome</label>
                                    <input
                                        type="text"
                                        value={appointmentName}
                                        onChange={(e) => setAppointmentName(e.target.value)}
                                        placeholder="Dê um nome ao agendamento..."
                                        className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${theme === 'dark'
                                            ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                            }`}
                                    />
                                    <p className="mt-1.5 text-xs opacity-60">
                                        Caso não preenchido, será o nome do serviço escolhido.
                                    </p>
                                </div>

                                {/* Anotação Pessoal */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-90">Anotação pessoal</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Escreva uma anotação..."
                                        rows={3}
                                        className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${theme === 'dark'
                                            ? 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500'
                                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                            }`}
                                    />
                                    <p className="mt-1.5 text-xs opacity-60">
                                        A anotação ficará visível apenas para você.
                                    </p>
                                </div>
                            </div>
                        </details>
                    </div>

                </div>

                {/* Footer Fixo */}
                <div className={`p-6 border-t ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950' : 'border-slate-100 bg-white'}`}>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Criando...' : 'Criar agendamento'}
                    </button>
                </div>

            </div>
        </>
    );
}
