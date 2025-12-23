
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { appointmentId, pendingBookingId, origin, amount: requestedAmount } = await req.json()

        if (!appointmentId && !pendingBookingId) {
            throw new Error('Missing appointmentId or pendingBookingId')
        }

        let amount: number;
        let itemName: string;
        let orderId: string;
        let companyId: string;

        // Check if it's a pending booking (reservation fee) or regular appointment
        if (pendingBookingId) {
            // Fetch Pending Booking Details
            const { data: pendingBooking, error: pendingError } = await supabaseClient
                .from('pending_bookings')
                .select(`
                    *,
                    service:services(name)
                `)
                .eq('id', pendingBookingId)
                .single()

            if (pendingError || !pendingBooking) {
                console.error('Pending booking error:', pendingError)
                throw new Error(`Pending booking not found: ${pendingError?.message || 'Unknown error'}`)
            }

            amount = pendingBooking.reservation_fee;
            itemName = `Taxa de Reserva - ${pendingBooking.service.name}`;
            orderId = pendingBooking.id;
            companyId = pendingBooking.company_id;
        } else {
            // Fetch Appointment Details
            const { data: appointment, error: appointmentError } = await supabaseClient
                .from('appointments')
                .select(`
                    *,
                    service:services(name, price),
                    client:profiles(full_name, phone)
                `)
                .eq('id', appointmentId)
                .single()

            if (appointmentError || !appointment) {
                console.error('Appointment error:', appointmentError)
                throw new Error(`Appointment not found: ${appointmentError?.message || 'Unknown error'}`)
            }

            // PRIORITY:
            // 1. If explicitly requested (frontend says it's partial) AND it matches database logic (optional validation)
            // 2. If appointment has remaining_amount > 0 AND it's pending, assume we want to pay the remainder.
            // 3. Fallback to total amount or service price.

            if (requestedAmount) {
                amount = requestedAmount;
                itemName = `Pagamento Restante - ${appointment.service.name}`;
            } else if (appointment.remaining_amount && appointment.remaining_amount > 0) {
                amount = appointment.remaining_amount;
                itemName = `Pagamento Restante - ${appointment.service.name}`;
            } else {
                amount = appointment.total_amount ?? appointment.service.price;
                itemName = appointment.service.name || 'Serviço Agendado';
            }

            orderId = appointment.id;
            companyId = appointment.company_id;
        }


        const { data: integration, error: integrationError } = await supabaseClient
            .from('company_payment_integrations')
            .select('settings')
            .eq('company_id', companyId)
            .eq('provider', 'infinitepay')
            .eq('is_active', true)
            .single()

        if (integrationError || !integration || !integration.settings?.infinitepay_tag) {
            throw new Error('InfinitePay integration not configured')
        }

        const { infinitepay_tag } = integration.settings

        // Clean tag (remove $ and @ if present, and trim)
        const handle = infinitepay_tag.replace('$', '').replace('@', '').trim()

        // Calculate amount in cents
        const amountInCents = Math.round(amount * 100)

        console.log('Payment amount calculation:', {
            orderId: orderId,
            isPendingBooking: !!pendingBookingId,
            amount: amount,
            amount_in_cents: amountInCents
        })

        // Pre-calculate Redirect URL
        let redirectBase = 'https://fluxtime.com.br';
        if (origin && (origin.startsWith('http://localhost') || origin.startsWith('https://'))) {
            redirectBase = origin;
        }

        // Must include pending_id/order_nsu for Frontend verification!
        const redirectUrl = `${redirectBase}/client/dashboard?payment_success=true&pending_id=${orderId}`;

        console.log('Redirect URL:', redirectUrl)

        // Get webhook URL
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

        console.log('Webhook URL:', webhookUrl)

        // Try to use InfinitePay API to create checkout link with webhook
        // According to docs: POST https://api.infinitepay.io/invoices/public/checkout/links
        const infinitepayApiUrl = 'https://api.infinitepay.io/invoices/public/checkout/links';

        const payload = {
            handle: handle,
            webhook_url: webhookUrl,
            order_nsu: orderId,
            return_url: redirectUrl, // Standard field for redirect
            redirect_url: redirectUrl, // Redundant fallback just in case
            metadata: {
                return_url: redirectUrl,
                order_id: orderId
            },
            items: [
                {
                    quantity: 1,
                    price: amountInCents,
                    description: itemName
                }
            ]
        };

        console.log('Calling InfinitePay API with payload:', JSON.stringify(payload, null, 2))

        try {
            const apiResponse = await fetch(infinitepayApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                console.log('InfinitePay API Response:', apiData)

                // The API should return a checkout URL
                if (apiData.url || apiData.checkout_url || apiData.link) {
                    const checkoutUrl = apiData.url || apiData.checkout_url || apiData.link;
                    console.log('Using API-generated URL:', checkoutUrl)

                    return new Response(
                        JSON.stringify({ url: checkoutUrl }),
                        {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 200,
                        }
                    )
                }
            } else {
                const errorText = await apiResponse.text();
                console.error('InfinitePay API Error:', apiResponse.status, errorText)
                // Fall through to manual URL construction
            }
        } catch (apiError) {
            console.error('Error calling InfinitePay API:', apiError)
            // Fall through to manual URL construction
        }

        // Fallback to manual URL construction
        // Deep linking format: https://checkout.infinitepay.io/{handle}?items=...\n        // Items must use 'price' (cents) according to deep link docs, not 'amount'.

        const itemsForUrl = [{
            quantity: 1,
            price: amountInCents,
            name: itemName
        }]

        const itemsParam = JSON.stringify(itemsForUrl)

        const params = new URLSearchParams()
        params.append('items', itemsParam)
        params.append('order_nsu', orderId)
        params.append('redirect_url', redirectUrl)
        params.append('webhook_url', webhookUrl)

        // Use the cleaned handle
        const cleanHandle = handle.replace(/[^a-zA-Z0-9_-]/g, '')

        const checkoutUrl = `https://checkout.infinitepay.io/${cleanHandle}?${params.toString()}`

        console.log('Generating Manual Checkout URL:', checkoutUrl)

        return new Response(
            JSON.stringify({ url: checkoutUrl }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Function Error:', error)
        return new Response(
            JSON.stringify({
                error: error.message,
                details: 'Ocorreu um erro ao gerar o link. Tente novamente mais tarde.'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
