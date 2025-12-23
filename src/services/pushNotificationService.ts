import { supabase } from '../lib/supabase';

// VAPID Public Key
const VAPID_PUBLIC_KEY = 'BKaf0mfF_6CH6z30N48VErxSfc-CwSqcd-COM2VEv3cgTivebwA8jk-I50YDrZCtM_zFLsXRhtOYVm9I5rlb41E';

export const pushNotificationService = {
    // Verificar se notificações são suportadas
    isSupported: () => {
        return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    },

    // Verificar permissão atual
    getPermission: () => {
        if (!('Notification' in window)) {
            return 'denied';
        }
        return Notification.permission;
    },

    // Solicitar permissão
    requestPermission: async () => {
        if (!pushNotificationService.isSupported()) {
            throw new Error('Push notifications não são suportadas neste navegador');
        }

        const permission = await Notification.requestPermission();
        return permission;
    },

    // Registrar Service Worker
    registerServiceWorker: async () => {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker não é suportado');
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('Service Worker registrado:', registration);

            // Aguardar ativação
            await navigator.serviceWorker.ready;

            return registration;
        } catch (error) {
            console.error('Erro ao registrar Service Worker:', error);
            throw error;
        }
    },

    // Obter subscrição push
    getSubscription: async () => {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    },

    // Criar subscrição push
    subscribe: async () => {
        try {
            const registration = await navigator.serviceWorker.ready;

            // Verificar se já existe subscrição
            let subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                console.log('Subscrição já existe:', subscription);
                return subscription;
            }

            // Criar nova subscrição
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            console.log('Nova subscrição criada:', subscription);
            return subscription;
        } catch (error) {
            console.error('Erro ao criar subscrição:', error);
            throw error;
        }
    },

    // Cancelar subscrição
    unsubscribe: async () => {
        const subscription = await pushNotificationService.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            console.log('Subscrição cancelada');
        }
    },

    // Salvar subscrição no banco de dados
    saveSubscription: async (subscription: PushSubscription) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (!profile) throw new Error('Perfil não encontrado');

            const subscriptionJson = subscription.toJSON();

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    company_id: profile.company_id,
                    endpoint: subscription.endpoint,
                    p256dh: subscriptionJson.keys?.p256dh || '',
                    auth: subscriptionJson.keys?.auth || '',
                    user_agent: navigator.userAgent,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'endpoint'
                });

            if (error) throw error;

            console.log('Subscrição salva no banco de dados');
        } catch (error) {
            console.error('Erro ao salvar subscrição:', error);
            throw error;
        }
    },

    // Remover subscrição do banco de dados
    removeSubscription: async (endpoint: string) => {
        try {
            const { error } = await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('endpoint', endpoint);

            if (error) throw error;

            console.log('Subscrição removida do banco de dados');
        } catch (error) {
            console.error('Erro ao remover subscrição:', error);
            throw error;
        }
    },

    // Setup completo
    setup: async () => {
        try {
            // 1. Verificar suporte
            if (!pushNotificationService.isSupported()) {
                throw new Error('Push notifications não são suportadas');
            }

            // 2. Registrar Service Worker
            await pushNotificationService.registerServiceWorker();

            // 3. Solicitar permissão
            const permission = await pushNotificationService.requestPermission();

            if (permission !== 'granted') {
                throw new Error('Permissão negada');
            }

            // 4. Criar subscrição
            const subscription = await pushNotificationService.subscribe();

            // 5. Salvar no banco de dados
            await pushNotificationService.saveSubscription(subscription);

            return { success: true, subscription };
        } catch (error) {
            console.error('Erro no setup de notificações:', error);
            throw error;
        }
    }
};

// Função auxiliar para converter VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
