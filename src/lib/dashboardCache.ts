
export interface DashboardInsights {
    appointments: number;
    activeClients: number;
    revenue: number;
}

export interface UpcomingAppointment {
    id: string;
    client_name: string;
    service: { name: string; price: number };
    start_time: string;
    status: 'confirmed' | 'pending' | 'cancelled';
}

interface DashboardCache {
    insights: DashboardInsights | null;
    appointments: UpcomingAppointment[] | null;
}

// Data persists during SPA navigation but resets on page reload
export const dashboardCache: DashboardCache = {
    insights: null,
    appointments: null
};
