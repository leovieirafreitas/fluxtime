import { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import { dashboardCache, type UpcomingAppointment } from '../lib/dashboardCache';

interface Appointment extends UpcomingAppointment { }

export default function UpcomingAppointments() {
    const { profile } = useUserProfile();
    const [appointments, setAppointments] = useState<Appointment[]>(dashboardCache.appointments || []);
    const [loading, setLoading] = useState(!dashboardCache.appointments);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!profile?.company_id) return;

            // Check cache
            if (dashboardCache.appointments) {
                setAppointments(dashboardCache.appointments);
                setLoading(false);
                return;
            }

            // 3. Get appointments
            const { data } = await supabase
                .from('appointments')
                .select(`
                    id,
                    client_name,
                    start_time,
                    status,
                    payment_status,
                    total_amount,
                    remaining_amount,
                    discount,
                    service:services(name, price)
                `)
                .eq('company_id', profile.company_id)
                .gte('start_time', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()) // From start of today
                .order('start_time', { ascending: true })
                .limit(100);

            if (data) {
                const typedData = data as any as Appointment[];
                dashboardCache.appointments = typedData;
                setAppointments(typedData);
            }
            setLoading(false);
        };

        if (profile?.company_id) {
            fetchAppointments();
        }
    }, [profile?.company_id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'pending':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'cancelled':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusLabel = (status: string) => {
        return status === 'confirmed' ? 'Confirmado' : status === 'pending' ? 'Pendente' : status;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const calculatePendingAmount = (apt: any) => {
        // Se já está pago, não tem pendência
        if (apt.payment_status === 'paid') return 0;

        // Se cancelado, não tem pendência
        if (apt.status === 'cancelled') return 0;

        // PRIORITY 1: Se tem remaining_amount explícito
        if (apt.remaining_amount !== null && apt.remaining_amount !== undefined && apt.remaining_amount > 0) {
            return apt.remaining_amount;
        }

        const price = apt.service?.price || 0;
        const discount = apt.discount || 0;
        const paid = apt.total_amount || 0;

        // Cálculo Pendente com Desconto
        return Math.max(0, price - discount - paid);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Próximos agendamentos</h2>
                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div></div>
                ) : appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
                            <Calendar className="w-8 h-8 text-primary-400" />
                        </div>
                        <p className="text-dark-300 mb-2">Nenhum agendamento futuro</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {appointments.map((appointment) => {
                            const pendingValue = calculatePendingAmount(appointment);
                            return (
                                <div key={appointment.id} className="w-full glass-hover rounded-xl p-4 cursor-pointer border border-slate-100/50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-semibold text-dark-100">{appointment.client_name}</h3>
                                            <p className="text-sm text-dark-400">{appointment.service?.name}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                            {getStatusLabel(appointment.status)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-dark-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(appointment.start_time)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatTime(appointment.start_time)}</span>
                                        </div>
                                        <div className="ml-auto flex flex-col items-end">
                                            {appointment.payment_status === 'paid' ? (
                                                <span className="text-emerald-500 font-bold">
                                                    Pago {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        (appointment.total_amount && appointment.total_amount > 0)
                                                            ? appointment.total_amount
                                                            : Math.max(0, (appointment.service?.price || 0) - (appointment.discount || 0))
                                                    )}
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span>
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingValue)}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-medium">Valor pendente</span>
                                                </div>
                                            )}
                                            {/* Mostra taxa paga se houver pendência restante */}
                                            {appointment.payment_status !== 'paid' && (appointment.total_amount || 0) > 0 && pendingValue > 0 && (
                                                <div className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-full mt-0.5 border border-emerald-100 flex items-center gap-1">
                                                    <span>✓</span>
                                                    Pago R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(appointment.total_amount || 0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Valor a receber (Próximos)</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <DollarSign className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-4xl font-bold mb-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            appointments.reduce((acc, curr) => {
                                return acc + calculatePendingAmount(curr);
                            }, 0)
                        )}
                    </p>
                    <p className="text-sm text-dark-400">Total previsto dos próximos agendamentos</p>
                </div>
            </div>
        </div>
    );
}
