
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

        // Map capture_method to our payment_method enum
        let paymentMethod = 'pix';
        if (capture_method === 'credit' || capture_method === 'credit_card') paymentMethod = 'credit_card';
        else if (capture_method === 'debit' || capture_method === 'debit_card') paymentMethod = 'debit_card';
        else if (capture_method === 'pix') paymentMethod = 'pix';

        if (order_nsu) {
            // First, check if this is a pending booking (reservation fee payment)
            const { data: pendingBooking } = await supabaseClient
                .from('pending_bookings')
                .select('*')
                .eq('id', order_nsu)
                .single()

            if (pendingBooking) {
                // This is a pending booking - convert it to an appointment
                console.log(`Converting pending booking ${order_nsu} to appointment after payment via ${paymentMethod}`)

                const { data: appointmentId, error: confirmError } = await supabaseClient
                    .rpc('confirm_pending_booking', {
                        p_pending_id: order_nsu,
                        p_payment_method: paymentMethod
                    })

                if (confirmError) {
                    console.error('Error confirming pending booking:', confirmError)
                    throw confirmError
                }

                console.log(`Pending booking ${order_nsu} converted to appointment ${appointmentId}`)
            } else {
                // This is a regular appointment payment (e.g., remaining amount)
                console.log(`Updating existing appointment ${order_nsu} payment to paid via ${paymentMethod}`)

                const { error } = await supabaseClient
                    .from('appointments')
                    .update({
                        payment_status: 'paid',
                        status: 'confirmed',
                        payment_method: paymentMethod
                    })
                    .eq('id', order_nsu)

                if (error) {
                    console.error('Error updating appointment:', error)
                    throw error
                }

                console.log(`Appointment ${order_nsu} payment confirmed`)
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
