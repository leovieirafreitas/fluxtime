import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
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
                    service:services(name, price)
                `)
                .eq('company_id', profile.company_id)
                .gte('start_time', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()) // From start of today
                .order('start_time', { ascending: true })
                .limit(5);

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
                    <div className="space-y-3">
                        {appointments.map((appointment) => (
                            <div key={appointment.id} className="glass-hover rounded-xl p-4 cursor-pointer">
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Valor a receber (Próximos)</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <span className="text-3xl">💰</span>
                    </div>
                    <p className="text-4xl font-bold mb-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            appointments.reduce((acc, curr) => acc + (curr.service?.price || 0), 0)
                        )}
                    </p>
                    <p className="text-sm text-dark-400">Total previsto dos próximos 5 agendamentos</p>
                </div>
            </div>
        </div>
    );
}
