import { Calendar, Clock } from 'lucide-react';

interface Appointment {
    id: number;
    client: string;
    service: string;
    date: string;
    time: string;
    status: 'confirmed' | 'pending' | 'cancelled';
}

export default function UpcomingAppointments() {
    const appointments: Appointment[] = [
        // Dados mockados - vazio por enquanto
    ];

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
        switch (status) {
            case 'confirmed':
                return 'Confirmado';
            case 'pending':
                return 'Pendente';
            case 'cancelled':
                return 'Cancelado';
            default:
                return status;
        }
    };

    return (
        <div className="grid grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Próximos agendamentos</h2>
                {appointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
                            <Calendar className="w-8 h-8 text-primary-400" />
                        </div>
                        <p className="text-dark-300 mb-2">Nenhum agendamento</p>
                        <p className="text-sm text-dark-400">Seus próximos agendamentos aparecerão aqui</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {appointments.map((appointment) => (
                            <div key={appointment.id} className="glass-hover rounded-xl p-4 cursor-pointer">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold text-dark-100">{appointment.client}</h3>
                                        <p className="text-sm text-dark-400">{appointment.service}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                        {getStatusLabel(appointment.status)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-dark-400">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{appointment.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{appointment.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Valor a receber</h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <span className="text-3xl">💰</span>
                    </div>
                    <p className="text-4xl font-bold mb-2">R$ 0,00</p>
                    <p className="text-sm text-dark-400">Nenhum valor pendente</p>
                </div>
            </div>
        </div>
    );
}
