// Service Worker para FluxTime
// eslint-disable-next-line no-unused-vars
const manifest = self.__WB_MANIFEST;

const CACHE_NAME = 'fluxtime-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interceptar requisições (opcional - para cache)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// NOTIFICAÇÕES PUSH
self.addEventListener('push', (event) => {
    console.log('[SW] ========== PUSH RECEBIDO ==========');

    let data;
    try {
        data = event.data.json();
        console.log('[SW] ✅ Parseado como JSON:', data);
    } catch (e) {
        console.log('[SW] ⚠️ Não é JSON, usando texto puro');
        data = {
            title: 'FluxTime',
            body: event.data ? event.data.text() : 'Nova notificação',
        };
    }

    const title = data.title || 'FluxTime';
    const options = {
        body: data.body || 'Você tem uma nova notificação',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: {
            url: data.url || '/',
            appointmentId: data.appointmentId,
            notificationId: data.notificationId
        }
    };

    console.log('[SW] Mostrando notificação:', title, options);

    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => {
                console.log('[SW] ✅ Notificação mostrada com sucesso!');
            })
            .catch(err => {
                console.error('[SW] ❌ Erro ao mostrar notificação:', err);
            })
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada:', event);

    event.notification.close();

    if (event.action === 'view' || !event.action) {
        const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Se já existe uma janela aberta, foca nela
                    for (let client of clientList) {
                        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                            return client.focus().then(() => {
                                // Navegar para a URL
                                return client.navigate(urlToOpen);
                            });
                        }
                    }
                    // Senão, abre nova janela
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notificação fechada:', event);
});
