
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const payload = await req.json()
        console.log('Webhook received:', payload)

        // InfinitePay Payload Structure Example:
        // { "invoice_slug": "...", "amount": 1000, "paid_amount": 1010, "installments": 1, 
        //   "capture_method": "credit_card", "transaction_nsu": "...", "order_nsu": "UUID-DO-PEDIDO", "items": [...] }

        // According to docs, we should respond quickly.
        // However, we need to process it.

        const { order_nsu, transaction_nsu, paid_amount, capture_method } = payload

        if (order_nsu) {
            // Update appointment status to 'paid'
            // storing transaction details in metadata if possible or just marking paid

            const { error } = await supabaseClient
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    // Optionally store transaction ID in notes or a specific column if existed
                    // For now just mark paid
                })
                .eq('id', order_nsu)

            if (error) {
                console.error('Error updating appointment:', error)
                // Even if internal update fails, we might want to return 200 to InfinitePay so they don't retry forever? 
                // Or 400 to retry? Docs say 400 they retry.
                throw error
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: null }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
