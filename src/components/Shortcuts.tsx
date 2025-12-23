import { Calendar, UserPlus, Globe, Settings, Star, Ban, Store, Send, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';


export default function Shortcuts() {
    const navigate = useNavigate();
    const { profile } = useUserProfile();

    const shortcuts = [
        { icon: <Calendar className="w-6 h-6" />, label: 'Agenda', color: 'text-purple-600', borderColor: 'border-purple-200 hover:border-purple-400', path: '/appointments' },
        { icon: <Ban className="w-6 h-6" />, label: 'Novo bloqueio', color: 'text-purple-600', borderColor: 'border-purple-200 hover:border-purple-400', path: '/appointments' },
        { icon: <UserPlus className="w-6 h-6" />, label: 'Novo cliente', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400', path: '/clients' },
        { icon: <Store className="w-6 h-6" />, label: 'Atrair clientes', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400', path: '/clients' },
        { icon: <Send className="w-6 h-6" />, label: 'Gerenciar lembretes', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400', path: '/appointments' },
        { icon: <DollarSign className="w-6 h-6" />, label: 'Cobrar clientes', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400', path: '/financial/transactions' },
        { icon: <Globe className="w-6 h-6" />, label: 'Meu site', color: 'text-gray-500', borderColor: 'border-gray-200 hover:border-gray-400', path: 'external' },
        { icon: <Settings className="w-6 h-6" />, label: 'Personalizar site', color: 'text-gray-500', borderColor: 'border-gray-200 hover:border-gray-400', path: '/site/customization' },
        { icon: <Star className="w-6 h-6" />, label: 'Pedir avaliação', color: 'text-gray-500', borderColor: 'border-gray-200 hover:border-gray-400', path: '/site/reviews' },
    ];

    const handleShortcutClick = (shortcut: typeof shortcuts[0]) => {
        if (shortcut.path === 'external') {
            // Abre o site da empresa em uma nova aba usando o company_id
            if (profile?.company_id) {
                window.open(`/${profile.company_id}`, '_blank');
            }
        } else {
            // Navega para a página interna
            navigate(shortcut.path);
        }
    };

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Atalhos</h2>
            <div className="flex gap-6 overflow-x-auto p-4 -ml-4 scrollbar-hide">
                {shortcuts.map((shortcut, index) => (
                    <button
                        key={index}
                        onClick={() => handleShortcutClick(shortcut)}
                        className="flex flex-col items-center gap-3 group min-w-[100px] pt-2"
                    >
                        <div className={`w-16 h-16 rounded-full border-2 ${shortcut.borderColor} flex items-center justify-center bg-white dark:bg-dark-800 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg glass`}>
                            <div className={`${shortcut.color} transition-colors`}>
                                {shortcut.icon}
                            </div>
                        </div>
                        <span className="text-sm font-medium text-center text-dark-300 group-hover:text-dark-100 transition-colors leading-tight px-1">
                            {shortcut.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
