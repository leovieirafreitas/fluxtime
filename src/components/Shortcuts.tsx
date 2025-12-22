import { Calendar, UserPlus, Globe, Settings, Star, Ban, Store, Send, DollarSign } from 'lucide-react';


export default function Shortcuts() {
    // const { theme } = useTheme();

    const shortcuts = [
        { icon: <Calendar className="w-6 h-6" />, label: 'Agenda', color: 'text-purple-600', borderColor: 'border-purple-200 hover:border-purple-400' },
        { icon: <Ban className="w-6 h-6" />, label: 'Novo bloqueio', color: 'text-purple-600', borderColor: 'border-purple-200 hover:border-purple-400' },
        { icon: <UserPlus className="w-6 h-6" />, label: 'Novo cliente', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400' },
        { icon: <Store className="w-6 h-6" />, label: 'Atrair clientes', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400' },
        { icon: <Send className="w-6 h-6" />, label: 'Gerenciar lembretes', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400' },
        { icon: <DollarSign className="w-6 h-6" />, label: 'Cobrar clientes', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-400' },
        { icon: <Globe className="w-6 h-6" />, label: 'Meu site', color: 'text-gray-500', borderColor: 'border-gray-200 hover:border-gray-400' },
        { icon: <Settings className="w-6 h-6" />, label: 'Personalizar site', color: 'text-gray-500', borderColor: 'border-gray-200 hover:border-gray-400' },
        { icon: <Star className="w-6 h-6" />, label: 'Pedir avaliação', color: 'text-gray-500', borderColor: 'border-gray-200 hover:border-gray-400' },
    ];

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Atalhos</h2>
            <div className="flex gap-6 overflow-x-auto p-4 -ml-4 scrollbar-hide">
                {shortcuts.map((shortcut, index) => (
                    <button
                        key={index}
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
