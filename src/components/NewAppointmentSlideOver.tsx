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
    onSubmit
}: NewAppointmentSlideOverProps) {
    const { theme } = useTheme();
    const [appointmentName, setAppointmentName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                            />
                        </div>
                        <div>
                            <CustomTimePicker
                                label="Horário *"
                                value={appointmentTime}
                                onChange={setAppointmentTime}
                                step={15}
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
