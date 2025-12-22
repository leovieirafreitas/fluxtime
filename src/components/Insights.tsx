import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import CustomSelect from './CustomSelect';

interface InsightCard {
    title: string;
    value: string | number;
    data: number[];
    colorName: string;
    colorClasses: string;
}

// Sparkline Component Simples
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data, 1);
    const min = 0; // Sempre base zero
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 80; // Deixar margem de 20%
        return `${x},${y}`;
    });

    const pathData = `M0,100 L${points.map(p => p.replace(',', ',')).join(' L')} L100,100 Z`;
    const lineData = `M${points[0]} L${points.slice(1).join(' L')}`;

    const strokeColor = color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : color === 'indigo' ? '#6366f1' : '#10b981';
    const fillColor = color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : color === 'indigo' ? '#6366f1' : '#10b981';

    return (
        <svg viewBox="0 0 100 100" className="w-full h-16 overflow-visible" preserveAspectRatio="none">
            <path d={pathData} fill={fillColor} fillOpacity="0.1" />
            <path d={lineData} fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
};

export default function Insights() {
    const { profile } = useUserProfile();
    const [dateFilter, setDateFilter] = useState('6m');

    const [stats, setStats] = useState({
        appointments: 0,
        activeClients: 0,
        revenue: 0,
        reservationFees: 0,
        appointmentsHistory: [] as number[],
        clientsHistory: [] as number[],
        revenueHistory: [] as number[],
        feesHistory: [] as number[]
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (!profile?.company_id) return;

            try {
                const now = new Date();
                const startDate = new Date();
                let points = 6;
                let granularity = 'month';

                switch (dateFilter) {
                    case '30d':
                        startDate.setDate(now.getDate() - 30);
                        points = 30;
                        granularity = 'day';
                        break;
                    case '3m':
                        startDate.setMonth(now.getMonth() - 3);
                        points = 13; // 13 semanas aprox
                        granularity = 'week';
                        break;
                    case '6m':
                        startDate.setMonth(now.getMonth() - 12); // Buscando 1 ano para garantir
                        points = 6;
                        granularity = 'month';
                        break;
                    case '1y':
                        startDate.setFullYear(now.getFullYear() - 1);
                        points = 12;
                        granularity = 'month';
                        break;
                    default:
                        startDate.setMonth(now.getMonth() - 12);
                }
                startDate.setHours(0, 0, 0, 0);

                // 1. Get Appointments Data Filtered
                const { data: appointmentsData, error: aptError } = await supabase
                    .from('appointments')
                    .select(`
                        id,
                        status, 
                        payment_status, 
                        total_amount,
                        remaining_amount,
                        start_time,
                        end_time,
                        created_at,
                        discount,
                        service:services(price)
                    `)
                    .eq('company_id', profile.company_id)
                    .gte('start_time', startDate.toISOString())
                    .order('start_time', { ascending: true });

                if (aptError) throw aptError;

                // 2. Get Active Clients (Total)
                const { count: clientCount } = await supabase
                    .from('clients')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', profile.company_id);

                if (appointmentsData) {
                    // --- Cálculos de Totais ---
                    const totalAppointments = appointmentsData.filter(a =>
                        ['confirmed', 'completed', 'pending'].includes(a.status)
                    ).length;

                    // TOTAL REVENUE - APENAS VALORES JÁ PAGOS (Total Recebido do Financeiro)
                    const totalRevenue = appointmentsData.reduce((sum, apt: any) => {
                        const endTime = new Date(apt.end_time || apt.start_time);

                        // 1. Calcular valores base
                        const servicePrice = apt.service?.price || 0;
                        const totalAmount = (apt.total_amount !== null && apt.total_amount !== undefined) ? apt.total_amount : servicePrice;
                        const remaining = apt.remaining_amount;

                        // 2. Calcular paidAmount
                        let paidAmount = 0;
                        if (apt.payment_status === 'paid') {
                            paidAmount = totalAmount;
                        } else if (remaining !== null && remaining !== undefined) {
                            paidAmount = Math.max(0, totalAmount - remaining);
                        }

                        // 3. Determinar status da transação
                        let transactionStatus: 'paid' | 'unpaid' | 'pending' | 'cancelled' = 'unpaid';
                        if (apt.payment_status === 'paid') {
                            transactionStatus = 'paid';
                        } else if (apt.status === 'cancelled') {
                            transactionStatus = 'cancelled';
                        } else {
                            const toleranceDeadline = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
                            if (now > toleranceDeadline) {
                                transactionStatus = 'unpaid';
                            } else {
                                transactionStatus = 'pending';
                            }
                        }

                        // 4. Calcular displayAmount
                        const discount = apt.discount || 0;
                        const effectivePrice = Math.max(0, servicePrice - discount);
                        let displayAmount = 0;

                        if (transactionStatus === 'paid') {
                            displayAmount = paidAmount > 0 ? paidAmount : effectivePrice;
                        } else if (transactionStatus === 'pending') {
                            displayAmount = Math.max(0, effectivePrice - paidAmount);
                        } else if (transactionStatus === 'cancelled') {
                            displayAmount = paidAmount;
                        } else {
                            displayAmount = Math.max(0, effectivePrice - paidAmount);
                        }

                        // SOMAR APENAS SE TRANSAÇÃO FOI PAGA (igual "Total Recebido" do Financeiro)
                        if (transactionStatus === 'paid') {
                            return sum + displayAmount;
                        }
                        return sum;
                    }, 0);

                    const totalReservationFees = appointmentsData.reduce((sum, apt: any) => {
                        const servicePrice = apt.service?.price || 0;
                        const total = (apt.total_amount !== null && apt.total_amount !== undefined) ? apt.total_amount : servicePrice;
                        const remaining = apt.remaining_amount;
                        let paidVal = 0;

                        if (apt.payment_status === 'paid') {
                            paidVal = 0;
                        } else if (remaining !== null && remaining !== undefined) {
                            paidVal = Math.max(0, total - remaining);
                        }

                        if (['pending', 'confirmed'].includes(apt.status) &&
                            apt.payment_status !== 'paid' &&
                            paidVal > 0) {
                            return sum + paidVal;
                        }
                        return sum;
                    }, 0);

                    // --- Histórico ---
                    const appHistory = new Array(points).fill(0);
                    const revHistory = new Array(points).fill(0);
                    const feesHistory = new Array(points).fill(0);

                    // Simulação de histórico de clientes (crescimento suave)
                    const totalClients = clientCount || 0;
                    const cliHistory = new Array(points).fill(0).map((_, i) =>
                        Math.round(totalClients * (0.6 + (0.4 * (i / (points - 1)))))
                    );

                    appointmentsData.forEach((apt: any) => {
                        const date = new Date(apt.start_time);
                        let idx = -1;

                        if (granularity === 'day') {
                            const diffTime = now.getTime() - date.getTime();
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            idx = (points - 1) - diffDays;
                        } else if (granularity === 'week') {
                            const diffTime = now.getTime() - date.getTime();
                            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                            idx = (points - 1) - diffWeeks;
                        } else if (granularity === 'month') {
                            const monthDiff = (now.getMonth() - date.getMonth()) + (12 * (now.getFullYear() - date.getFullYear()));
                            idx = (points - 1) - monthDiff;
                        }

                        if (idx >= 0 && idx < points) {
                            // Appointments Count
                            if (['confirmed', 'completed', 'pending'].includes(apt.status)) {
                                appHistory[idx]++;
                            }

                            // Revenue & Fees - Apenas valores pagos para o histórico
                            const endTime = new Date(apt.end_time || apt.start_time);
                            const servicePrice = apt.service?.price || 0;
                            const totalAmount = (apt.total_amount !== null && apt.total_amount !== undefined) ? apt.total_amount : servicePrice;
                            const remaining = apt.remaining_amount;

                            let paidAmount = 0;
                            if (apt.payment_status === 'paid') {
                                paidAmount = totalAmount;
                            } else if (remaining !== null && remaining !== undefined) {
                                paidAmount = Math.max(0, totalAmount - remaining);
                            }

                            let transactionStatus: 'paid' | 'unpaid' | 'pending' | 'cancelled' = 'unpaid';
                            if (apt.payment_status === 'paid') {
                                transactionStatus = 'paid';
                            } else if (apt.status === 'cancelled') {
                                transactionStatus = 'cancelled';
                            } else {
                                const toleranceDeadline = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
                                if (now > toleranceDeadline) {
                                    transactionStatus = 'unpaid';
                                } else {
                                    transactionStatus = 'pending';
                                }
                            }

                            const discount = apt.discount || 0;
                            const effectivePrice = Math.max(0, servicePrice - discount);
                            let displayAmount = 0;

                            if (transactionStatus === 'paid') {
                                displayAmount = paidAmount > 0 ? paidAmount : effectivePrice;
                            } else if (transactionStatus === 'pending') {
                                displayAmount = Math.max(0, effectivePrice - paidAmount);
                            } else if (transactionStatus === 'cancelled') {
                                displayAmount = paidAmount;
                            } else {
                                displayAmount = Math.max(0, effectivePrice - paidAmount);
                            }

                            // Histórico de Revenue: apenas valores pagos
                            if (transactionStatus === 'paid') {
                                revHistory[idx] += displayAmount;
                            }

                            // Fees: valores parcialmente pagos (ainda pendentes)
                            if (['pending', 'confirmed'].includes(apt.status) &&
                                apt.payment_status !== 'paid' &&
                                paidAmount > 0) {
                                feesHistory[idx] += paidAmount;
                            }
                        }
                    });

                    setStats({
                        appointments: totalAppointments,
                        activeClients: clientCount || 0,
                        revenue: totalRevenue,
                        reservationFees: totalReservationFees,
                        appointmentsHistory: appHistory,
                        clientsHistory: cliHistory,
                        revenueHistory: revHistory,
                        feesHistory: feesHistory
                    });
                }
            } catch (error) {
                console.error('Error fetching dashboard insights:', error);
            }
        };

        if (profile?.company_id) {
            fetchStats();
        }
    }, [profile?.company_id, dateFilter]);

    const insights: InsightCard[] = [
        {
            title: 'Agendamentos',
            value: stats.appointments,
            data: stats.appointmentsHistory,
            colorName: 'purple',
            colorClasses: 'from-purple-500/20 to-purple-600/20'
        },
        {
            title: 'Clientes ativos',
            value: stats.activeClients,
            data: stats.clientsHistory,
            colorName: 'blue',
            colorClasses: 'from-blue-500/20 to-blue-600/20'
        },
        {
            title: 'Taxas Reservas',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.reservationFees),
            data: stats.feesHistory,
            colorName: 'indigo',
            colorClasses: 'from-indigo-500/20 to-indigo-600/20'
        },
        {
            title: 'Faturamento',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue),
            data: stats.revenueHistory,
            colorName: 'emerald',
            colorClasses: 'from-emerald-500/20 to-emerald-600/20'
        },
    ];

    return (
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Insights</h2>
                <div className="w-48">
                    <CustomSelect
                        value={dateFilter}
                        onChange={(val) => setDateFilter(val as string)}
                        options={[
                            { value: '30d', label: '30 dias' },
                            { value: '3m', label: '3 meses' },
                            { value: '6m', label: '6 meses' },
                            { value: '1y', label: '1 ano' },
                        ]}
                        placeholder="Período"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className="glass rounded-2xl p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${insight.colorClasses} opacity-50`}></div>
                        <div className="relative z-10">
                            <p className="text-sm text-dark-300 mb-1">{insight.title}</p>
                            <p className="text-2xl font-bold mb-4">{insight.value}</p>
                            <div className="h-16 flex items-end -mx-2">
                                <Sparkline data={insight.data} color={insight.colorName} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
