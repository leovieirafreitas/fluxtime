import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../hooks/useUserProfile';
import { dashboardCache, type DashboardInsights } from '../lib/dashboardCache';

interface InsightCard {
    title: string;
    value: string | number;
    trend?: number;
    color: string;
}

export default function Insights() {
    const { profile } = useUserProfile();

    // Initialize state from cache if available
    const [stats, setStats] = useState<DashboardInsights>(dashboardCache.insights || {
        appointments: 0,
        activeClients: 0,
        revenue: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (!profile?.company_id) return;

            // If we already have cached data, don't fetch again
            if (dashboardCache.insights) {
                setStats(dashboardCache.insights);
                return;
            }

            try {
                const { data, error } = await supabase
                    .rpc('get_dashboard_insights', { p_company_id: profile.company_id });

                if (error) throw error;

                if (data && data.length > 0) {
                    const statsData = data[0];
                    const newStats = {
                        appointments: statsData.total_appointments || 0,
                        activeClients: statsData.active_clients || 0,
                        revenue: statsData.total_revenue || 0
                    };

                    // Save to cache
                    dashboardCache.insights = newStats;
                    setStats(newStats);
                }
            } catch (error) {
                console.error('Error fetching dashboard insights:', error);
            }
        };

        if (profile?.company_id) {
            fetchStats();
        }
    }, [profile?.company_id]);

    const insights: InsightCard[] = [
        { title: 'Agendamentos', value: stats.appointments, color: 'from-purple-500/20 to-purple-600/20' },
        { title: 'Clientes ativos', value: stats.activeClients, color: 'from-blue-500/20 to-blue-600/20' },
        {
            title: 'Faturamento',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue),
            color: 'from-emerald-500/20 to-emerald-600/20'
        },
    ];

    return (
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Insights</h2>
                <select className="glass rounded-lg px-4 py-2 text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>Todo o período</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className="glass rounded-2xl p-6 relative overflow-hidden group hover:scale-105 transition-all duration-300"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${insight.color} opacity-50`}></div>
                        <div className="relative z-10">
                            <p className="text-sm text-dark-300 mb-2">{insight.title}</p>
                            <p className="text-3xl font-bold mb-4">{insight.value}</p>
                            <div className="h-16 flex items-end">
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full" style={{ width: '70%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
