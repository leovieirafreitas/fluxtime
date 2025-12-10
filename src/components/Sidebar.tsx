import { Menu, Bell, Search, User, Moon, Sun, LogOut, X, Building2, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import { useState } from 'react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, loading } = useUserProfile();
    const [businessMenuOpen, setBusinessMenuOpen] = useState(false);
    const [siteMenuOpen, setSiteMenuOpen] = useState(false);
    const [catalogMenuOpen, setCatalogMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const menuItems = [
        { icon: <Menu className="w-5 h-5" />, label: 'Início', path: '/dashboard' },
        { icon: <Bell className="w-5 h-5" />, label: 'Notificações', badge: 5, path: '/notifications' },
        { icon: <Search className="w-5 h-5" />, label: 'Agendamentos', path: '/appointments' },
        { icon: <User className="w-5 h-5" />, label: 'Clientes', path: '/clients' },
    ];

    const businessSubItems = [
        { label: 'Dados cadastrais', path: '/settings/company' },
        { label: 'Fuso horário', path: '/settings/timezone' },
        { label: 'Equipe', path: '/settings/team' },
        { label: 'Central de pagamentos', path: '/settings/payments' },
        { label: 'Regras para agendar', path: '/settings/rules' },
        { label: 'Horários e turnos', path: '/settings/schedule' },
    ];

    const siteSubItems = [
        { label: 'Customização', path: '/site/customization' },
        { label: 'Avaliações', path: '/site/reviews' },
        { label: 'Links', path: '/site/links' },
    ];

    const catalogSubItems = [
        { label: 'Serviços', path: '/catalog/services' },
        { label: 'Conteúdos', path: '/catalog/contents' },
        { label: 'Combos', path: '/catalog/combos' },
        { label: 'Cupons', path: '/catalog/coupons' },
    ];

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose(); // Fecha sidebar no mobile ao navegar
    };

    return (
        <>
            {/* Overlay para mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <div
                style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }}
                className={`fixed left-0 top-0 h-screen w-64 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col z-50 transition-transform duration-300 shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}>
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-none">
                            <span className="text-white font-bold text-lg drop-shadow-none">F</span>
                        </div>
                        <div>
                            <h1 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>FluxTime</h1>
                            {loading ? (
                                <div className={`h-4 w-24 rounded ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></div>
                            ) : (
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {profile?.companies?.name || 'Barbearia'}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Botão de fechar apenas mobile */}
                    <button onClick={onClose} className={`md:hidden p-2 hover:text-slate-700 dark:hover:text-white ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 space-y-2">
                    {menuItems.map((item, index) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={index}
                                onClick={() => handleNavigation(item.path)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-primary-500/10 text-primary-600 border border-primary-500/20'
                                    : theme === 'dark'
                                        ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                {item.badge && (
                                    <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Menu Catálogo */}
                    <div>
                        <button
                            onClick={() => setCatalogMenuOpen(!catalogMenuOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${theme === 'dark'
                                ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span className="font-medium">Catálogo</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${catalogMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {catalogMenuOpen && (
                            <div className="ml-4 mt-1 space-y-1">
                                {catalogSubItems.map((subItem, index) => {
                                    const isActive = location.pathname === subItem.path;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleNavigation(subItem.path)}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${isActive
                                                ? 'bg-primary-500/10 text-primary-600 font-medium'
                                                : theme === 'dark'
                                                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                        >
                                            {subItem.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Menu Site */}
                    <div>
                        <button
                            onClick={() => setSiteMenuOpen(!siteMenuOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${theme === 'dark'
                                ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Site</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${siteMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {siteMenuOpen && (
                            <div className="ml-4 mt-1 space-y-1">
                                {siteSubItems.map((subItem, index) => {
                                    const isActive = location.pathname === subItem.path;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleNavigation(subItem.path)}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${isActive
                                                ? 'bg-primary-500/10 text-primary-600 font-medium'
                                                : theme === 'dark'
                                                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                        >
                                            {subItem.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Menu Meu Negócio */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <p className={`text-xs font-semibold mb-2 px-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Configurações
                        </p>
                        <button
                            onClick={() => setBusinessMenuOpen(!businessMenuOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${theme === 'dark'
                                ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5" />
                                <span className="font-medium">Meu negócio</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${businessMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {businessMenuOpen && (
                            <div className="ml-4 mt-1 space-y-1">
                                {businessSubItems.map((subItem, index) => {
                                    const isActive = location.pathname === subItem.path;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleNavigation(subItem.path)}
                                            className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${isActive
                                                ? 'bg-primary-500/10 text-primary-600 font-medium'
                                                : theme === 'dark'
                                                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                                }`}
                                        >
                                            {subItem.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>


                </nav>

                <div className="mt-auto">
                    <button
                        onClick={toggleTheme}
                        className={`w-full rounded-xl p-4 mb-2 flex items-center justify-between group transition-all ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {theme === 'dark' ? (
                                <Moon className="w-5 h-5 text-purple-400" />
                            ) : (
                                <Sun className="w-5 h-5 text-amber-500" />
                            )}
                            <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                {theme === 'dark' ? 'Dark' : 'Light'}
                            </span>
                        </div>
                        <div className={`w-12 h-6 rounded-full relative transition-all ${theme === 'dark' ? 'bg-slate-700' : 'bg-blue-200'
                            }`}>
                            <div
                                className={`absolute top-1 w-4 h-4 rounded-full transition-all ${theme === 'dark'
                                    ? 'left-1 bg-gradient-to-r from-purple-500 to-purple-600'
                                    : 'left-7 bg-gradient-to-r from-blue-500 to-blue-600'
                                    }`}
                            />
                        </div>
                    </button>

                    <button
                        onClick={handleLogout}
                        className={`w-full rounded-xl p-4 flex items-center gap-3 text-red-600 transition-all ${theme === 'dark' ? 'text-red-400 hover:bg-red-900/10' : 'text-red-600 hover:bg-red-50'
                            }`}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </div>
        </>
    );
}
