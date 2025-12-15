import { useState } from 'react';
import Header from '../components/Header';
import Shortcuts from '../components/Shortcuts';
import Insights from '../components/Insights';
import UpcomingAppointments from '../components/UpcomingAppointments';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';

export default function Dashboard() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme } = useTheme();
    useUserProfile();



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
                        className="md:hidden mb-6 p-2 glass rounded-lg text-dark-100 hover:bg-white/10 transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <Header />
                    <Shortcuts />
                    <Insights />
                    <UpcomingAppointments />
                </div>
            </div>
        </div>
    );
}
