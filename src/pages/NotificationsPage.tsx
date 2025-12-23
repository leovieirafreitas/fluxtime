import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Bell, BellOff, Check, Menu, Trash2, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { pushNotificationService } from '../services/pushNotificationService';
import { useToast } from '../contexts/ToastContext';
import IOSInstallPrompt from '../components/IOSInstallPrompt';

interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    appointment_id: string | null;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { theme } = useTheme();
    const { profile } = useUserProfile();
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [checkingPermission, setCheckingPermission] = useState(true);

    useEffect(() => {
        if (profile?.company_id) {
            fetchNotifications();
            checkPushPermission();
        }
    }, [profile]);

    const checkPushPermission = async () => {
        try {
            const permission = pushNotificationService.getPermission();
            setPushEnabled(permission === 'granted');

            if (permission === 'granted') {
                const subscription = await pushNotificationService.getSubscription();
                setPushEnabled(!!subscription);
            }
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
        } finally {
            setCheckingPermission(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('company_id', profile?.company_id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnablePush = async () => {
        try {
            setCheckingPermission(true);
            await pushNotificationService.setup();
            setPushEnabled(true);
            addToast('Notificações push ativadas com sucesso!', 'success');
        } catch (error: any) {
            console.error('Erro ao ativar notificações:', error);
            addToast(error.message || 'Erro ao ativar notificações', 'error');
        } finally {
            setCheckingPermission(false);
        }
    };

    const handleDisablePush = async () => {
        try {
            setCheckingPermission(true);
            const subscription = await pushNotificationService.getSubscription();
            if (subscription) {
                await pushNotificationService.removeSubscription(subscription.endpoint);
                await pushNotificationService.unsubscribe();
            }
            setPushEnabled(false);
            addToast('Notificações push desativadas', 'success');
        } catch (error: any) {
            console.error('Erro ao desativar notificações:', error);
            addToast('Erro ao desativar notificações', 'error');
        } finally {
            setCheckingPermission(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Erro ao marcar como lida:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

            if (unreadIds.length === 0) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .in('id', unreadIds);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );

            addToast('Todas as notificações marcadas como lidas', 'success');
        } catch (error) {
            console.error('Erro ao marcar todas como lidas:', error);
            addToast('Erro ao marcar notificações', 'error');
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setNotifications(prev => prev.filter(n => n.id !== id));
            addToast('Notificação excluída', 'success');
        } catch (error) {
            console.error('Erro ao excluir notificação:', error);
            addToast('Erro ao excluir notificação', 'error');
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_appointment':
                return <Calendar className="w-5 h-5 text-blue-600" />;
            case 'appointment_cancelled':
                return <Calendar className="w-5 h-5 text-red-600" />;
            case 'payment_received':
                return <Check className="w-5 h-5 text-green-600" />;
            default:
                return <Bell className="w-5 h-5 text-gray-600" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }} className="min-h-screen transition-colors duration-300">
            <IOSInstallPrompt />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden mb-6 p-2 glass rounded-lg text-dark-100 hover:bg-white/10 transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Notificações
                        </h1>
                        <p className="text-slate-500">
                            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas as notificações lidas'}
                        </p>
                    </div>

                    {/* Push Notification Toggle */}
                    <div className={`glass p-6 rounded-xl mb-6 ${theme === 'dark' ? 'bg-dark-800' : 'bg-white'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {pushEnabled ? (
                                    <Bell className="w-6 h-6 text-blue-600" />
                                ) : (
                                    <BellOff className="w-6 h-6 text-slate-400" />
                                )}
                                <div>
                                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        Notificações Push
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {pushEnabled ? 'Ativadas - Você receberá alertas em tempo real' : 'Desativadas - Ative para receber alertas'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={pushEnabled ? handleDisablePush : handleEnablePush}
                                disabled={checkingPermission}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${pushEnabled
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {checkingPermission ? 'Aguarde...' : pushEnabled ? 'Desativar' : 'Ativar'}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    {unreadCount > 0 && (
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Marcar todas como lidas
                            </button>
                        </div>
                    )}

                    {/* Notifications List */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className={`glass p-12 rounded-xl text-center ${theme === 'dark' ? 'bg-dark-800' : 'bg-white'}`}>
                            <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Nenhuma notificação
                            </h3>
                            <p className="text-slate-500">
                                Você será notificado quando houver novos agendamentos
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`glass p-4 rounded-xl transition-all ${notification.is_read
                                        ? theme === 'dark' ? 'bg-dark-800/50' : 'bg-white/50'
                                        : theme === 'dark' ? 'bg-dark-800 border-l-4 border-blue-600' : 'bg-white border-l-4 border-blue-600'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {notification.title}
                                            </h4>
                                            <p className="text-sm text-slate-500 mb-2">
                                                {notification.body}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(notification.created_at).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Marcar como lida"
                                                >
                                                    <Check className="w-4 h-4 text-blue-600" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
