import { createClient } from "npm:@supabase/supabase-js@2.44.4";

// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

// Helper function to send push notification using fetch
async function sendPushNotification(subscription: any, payload: string) {
    const webpush = await import("npm:web-push@3.6.7");

    webpush.setVapidDetails(
        'mailto:leovieiradefreitas@gmail.com',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );

    return await webpush.sendNotification(subscription, payload);
}

serve(async (req) => {
    // Configurar CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        const { appointment_id } = await req.json();

        if (!appointment_id) {
            throw new Error("Missing appointment_id");
        }

        // Criar cliente Supabase (usando Service Role para acessar dados protegidos)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Buscar detalhes do agendamento
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('*, services(name)')
            .eq('id', appointment_id)
            .single();

        if (aptError) throw aptError;

        const company_id = appointment.company_id;
        const client_name = appointment.client_name;
        const service_name = appointment.services?.name || 'Serviço';
        const start_time = new Date(appointment.start_time).toLocaleString('pt-BR');

        // 2. Buscar subscrições ativas da empresa
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('company_id', company_id)
            .eq('is_active', true);

        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Nenhuma subscrição ativa encontrada' }),
                { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
        }

        const payload = JSON.stringify({
            title: 'Novo Agendamento 📅',
            body: `${client_name} agendou ${service_name} às ${start_time}`,
            url: `/appointments`,
            appointmentId: appointment_id
        });

        console.log('Payload a ser enviado:', payload);
        console.log('Número de subscrições:', subscriptions.length);

        // 3. Enviar notificações
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    let pushSubscription;

                    // Try to use subscription_data first (new format)
                    if (sub.subscription_data) {
                        const subscriptionData = typeof sub.subscription_data === 'string'
                            ? JSON.parse(sub.subscription_data)
                            : sub.subscription_data;

                        pushSubscription = {
                            endpoint: sub.endpoint,
                            keys: subscriptionData.keys
                        };
                        console.log('✅ Usando subscription_data (novo formato)');
                    } else {
                        // Fallback to legacy format (p256dh/auth)
                        pushSubscription = {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        };
                        console.log('⚠️ Usando p256dh/auth (formato legado)');
                    }

                    console.log('Enviando para endpoint:', sub.endpoint.substring(0, 50) + '...');
                    console.log('User agent:', sub.user_agent);

                    try {
                        const result = await sendPushNotification(pushSubscription, payload);
                        console.log('✅ Sucesso! Resultado:', JSON.stringify(result));
                        return true;
                    } catch (sendError: any) {
                        console.error('❌ Erro ao enviar push:', {
                            message: sendError.message,
                            statusCode: sendError.statusCode,
                            body: sendError.body,
                            endpoint: sub.endpoint.substring(0, 50)
                        });
                        throw sendError;
                    }
                } catch (error: any) {
                    console.error('Erro ao enviar push:', error);
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Subscrição inválida/expirada, marcar como inativa
                        await supabase
                            .from('push_subscriptions')
                            .update({ is_active: false })
                            .eq('id', sub.id);
                    }
                    throw error;
                }
            })
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;

        return new Response(
            JSON.stringify({
                message: `Notificações enviadas: ${successCount}/${subscriptions.length}`,
                success: successCount
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );

    } catch (error: any) {
        console.error('Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
    }
});
