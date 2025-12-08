

interface InsightCard {
    title: string;
    value: string | number;
    trend?: number;
    color: string;
}

export default function Insights() {
    const insights: InsightCard[] = [
        { title: 'Agendamentos', value: 0, color: 'from-purple-500/20 to-purple-600/20' },
        { title: 'Clientes ativos', value: 0, color: 'from-blue-500/20 to-blue-600/20' },
        { title: 'Faturamento', value: 'R$ 0,00', color: 'from-emerald-500/20 to-emerald-600/20' },
    ];

    return (
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Insights</h2>
                <select className="glass rounded-lg px-4 py-2 text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>Últimos 7 dias</option>
                    <option>Últimos 30 dias</option>
                    <option>Últimos 90 dias</option>
                </select>
            </div>
            <div className="grid grid-cols-3 gap-6">
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
                                    <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full" style={{ width: '0%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
