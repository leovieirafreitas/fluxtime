
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

        const { appointmentId, origin } = await req.json()

        if (!appointmentId) {
            throw new Error('Missing appointmentId')
        }

        // 1. Fetch Appointment and Service Details
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
            throw new Error('Appointment not found')
        }

        // 2. Fetch Company Integration Settings
        const { data: integration, error: integrationError } = await supabaseClient
            .from('company_payment_integrations')
            .select('settings')
            .eq('company_id', appointment.company_id)
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
        // Ensure we use the final amount (considering discounts if any, but logic here uses total_amount or service price)
        const amount = appointment.total_amount ? appointment.total_amount : appointment.service.price
        const amountInCents = Math.round(amount * 100)

        // Items for invoice
        const items = [
            {
                quantity: 1,
                amount: amountInCents,
                name: appointment.service.name || 'Serviço Agendado'
            }
        ]
        // Fallback to manual URL construction
        // Deep linking format: https://checkout.infinitepay.io/{handle}?items=...
        // Items must use 'price' (cents) according to deep link docs, not 'amount'.

        const itemsForUrl = items.map(item => ({
            quantity: item.quantity,
            price: item.amount, // Map amount to price
            name: item.name
        }))

        const itemsParam = JSON.stringify(itemsForUrl)

        const params = new URLSearchParams()
        params.append('items', itemsParam)
        params.append('order_nsu', appointment.id)

        // redirect_url validation: some environments might block localhost or require https
        let redirectBase = 'https://fluxtime.com.br';
        if (origin && (origin.startsWith('http://localhost') || origin.startsWith('https://'))) {
            redirectBase = origin;
        }

        // Append payment_success param so the frontend knows to show a success message
        const redirectUrl = `${redirectBase}/client/dashboard?payment_success=true`;
        params.append('redirect_url', redirectUrl)

        if (appointment.client?.full_name) {
            params.append('customer_name', appointment.client.full_name)
        }

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
