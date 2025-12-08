import { useUserProfile } from '../hooks/useUserProfile';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
    const { profile, loading } = useUserProfile();
    const { theme } = useTheme();

    const userName = profile?.full_name?.split(' ')[0] || 'Visitante';

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const formatDate = () => {
        const date = new Date();
        const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

        return `Hoje é ${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    return (
        <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">
                Olá, {loading ? (
                    <span className={`inline-block w-32 h-10 rounded-lg align-middle ${theme === 'dark' ? 'skeleton' : 'skeleton-light'}`}></span>
                ) : (
                    <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 bg-clip-text text-transparent">{userName}</span>
                )}
            </h1>
            <p className="text-secondary text-lg">{formatDate()}</p>
            <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <span className="text-purple-400 text-sm">✨</span>
                    <span className="text-sm text-tertiary">{getGreeting()}</span>
                </div>
                <span className="text-tertiary">•</span>
                <span className="text-sm text-purple-500 font-medium">Bora produzir!</span>
            </div>
        </div>
    );
}
