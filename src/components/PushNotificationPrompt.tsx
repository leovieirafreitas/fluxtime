import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { pushNotificationService } from '../services/pushNotificationService';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function PushNotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const { theme } = useTheme();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = () => {
        // Verifica suporte
        if (!pushNotificationService.isSupported()) return;

        // Verifica status atual
        const permission = pushNotificationService.getPermission();

        // Se já concedido ou negado, não mostra
        if (permission === 'granted' || permission === 'denied') return;

        // Verifica se o usuário já fechou o prompt recentemente (últimas 24h)
        const lastClosed = localStorage.getItem('push_prompt_closed_at');
        if (lastClosed) {
            const timeSinceClosed = Date.now() - parseInt(lastClosed);
            if (timeSinceClosed < 24 * 60 * 60 * 1000) return;
        }

        // Mostra o prompt após 2 segundos de navegação para não ser invasivo demais
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 2000);

        return () => clearTimeout(timer);
    };

    const handleEnable = async () => {
        setLoading(true);
        try {
            await pushNotificationService.setup();
            addToast('Notificações ativadas com sucesso!', 'success');
            setIsVisible(false);
        } catch (error: any) {
            console.error('Erro ao ativar notificações:', error);
            // Se o usuário bloquear no navegador, não podemos fazer nada além de avisar
            if (error.message?.includes('denied') || error.message?.includes('permis')) {
                addToast('Você bloqueou as notificações. Ative nas configurações do navegador.', 'warning');
            } else {
                addToast('Não foi possível ativar as notificações.', 'error');
            }
            setIsVisible(false);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        // Salva timestamp para não mostrar novamente por 24h
        localStorage.setItem('push_prompt_closed_at', Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl transform transition-all scale-100 ${theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' : 'bg-white'
                    }`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                        <Bell className="w-6 h-6 text-blue-600" />
                    </div>
                    <button
                        onClick={handleClose}
                        className={`p-1 rounded-full hover:bg-black/5 transition-colors ${theme === 'dark' ? 'text-neutral-400 hover:bg-white/10' : 'text-slate-400'
                            }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Não perca nenhum agendamento!
                </h3>

                <p className={`mb-6 text-sm ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Ative as notificações para receber alertas instantâneos quando um cliente agendar ou pagar.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleEnable}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Bell className="w-4 h-4" />
                                Ativar Notificações
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleClose}
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${theme === 'dark'
                            ? 'text-neutral-400 hover:bg-white/5'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        Agora não
                    </button>
                </div>
            </div>
        </div>
    );
}
