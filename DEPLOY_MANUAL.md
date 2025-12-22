# 🚀 Deploy das Edge Functions - Guia Completo

## ❌ Problema com o CLI

O Supabase CLI está pedindo autenticação e tem problemas de permissão. 

## ✅ Solução: Deploy Manual via Dashboard

### **Passo 1: Acessar o Dashboard**

Abra: https://supabase.com/dashboard/project/vvvjdxfwfpgvqwgpqwjh/functions

### **Passo 2: Deploy da Função `verify-payment`**

1. Clique em **"New function"** ou procure por `verify-payment`
2. Se já existir, clique nela e depois em **"Deploy new version"**
3. Se não existir, clique em **"New function"** e:
   - Nome: `verify-payment`
   - Clique em **"Create function"**

4. **Cole o código abaixo:**

```typescript
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

        const { appointmentId } = await req.json()

        if (!appointmentId) {
            throw new Error('Missing appointmentId')
        }

        console.log('Checking payment for appointment:', appointmentId)

        // Get appointment details
        const { data: appointment, error: aptError } = await supabaseClient
            .from('appointments')
            .select('id, company_id, payment_status')
            .eq('id', appointmentId)
            .single()

        if (aptError || !appointment) {
            throw new Error('Appointment not found')
        }

        // If already paid, return success
        if (appointment.payment_status === 'paid') {
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    already_paid: true,
                    message: 'Pagamento já confirmado'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        // Get InfinitePay integration
        const { data: integration, error: intError } = await supabaseClient
            .from('company_payment_integrations')
            .select('settings')
            .eq('company_id', appointment.company_id)
            .eq('provider', 'infinitepay')
            .eq('is_active', true)
            .single()

        if (intError || !integration || !integration.settings?.infinitepay_tag) {
            throw new Error('InfinitePay integration not configured')
        }

        const { infinitepay_tag } = integration.settings
        const handle = infinitepay_tag.replace('$', '').replace('@', '').trim()

        // Check payment status using InfinitePay API
        const checkUrl = 'https://api.infinitepay.io/invoices/public/checkout/payment_check'
        
        const payload = {
            handle: handle,
            order_nsu: appointmentId
        }

        console.log('Checking payment with InfinitePay:', payload)

        const response = await fetch(checkUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('InfinitePay API Error:', response.status, errorText)
            throw new Error(`Failed to check payment: ${errorText}`)
        }

        const paymentData = await response.json()
        console.log('InfinitePay response:', paymentData)

        // Check if payment was confirmed
        if (paymentData.success && paymentData.paid) {
            // Update appointment to paid
            const paymentMethod = paymentData.capture_method === 'credit_card' ? 'credit_card' : 
                                 paymentData.capture_method === 'debit_card' ? 'debit_card' :
                                 paymentData.capture_method === 'pix' ? 'pix' : 'pix'

            const { error: updateError } = await supabaseClient
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    status: 'confirmed',
                    payment_method: paymentMethod
                })
                .eq('id', appointmentId)

            if (updateError) {
                console.error('Error updating appointment:', updateError)
                throw updateError
            }

            console.log(`Appointment ${appointmentId} marked as paid via ${paymentMethod}`)

            return new Response(
                JSON.stringify({ 
                    success: true, 
                    paid: true,
                    payment_method: paymentMethod,
                    amount: paymentData.paid_amount / 100,
                    message: 'Pagamento confirmado!'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        } else {
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    paid: false,
                    message: 'Pagamento ainda não confirmado'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

    } catch (error) {
        console.error('Function Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
```

5. Clique em **"Deploy"**

### **Passo 3: Adicionar o Botão no Frontend**

Abra o arquivo: `src/components/TransactionDetails.tsx`

**Localize a linha 480** e substitua:

```tsx
<div className="grid grid-cols-2 gap-3">
```

**Por:**

```tsx
<div className="grid grid-cols-1 gap-3">
    <button
        onClick={handleVerifyPayment}
        disabled={isProcessing}
        className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-blue-200/50"
    >
        <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Verificar Pagamento</span>
        </div>
    </button>
```

E **antes do botão de WhatsApp** (que já existe), certifique-se de que está assim:

```tsx
    <button
        onClick={handleCobrancaWhatsApp}
        disabled={isGeneratingLink}
        className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-green-200/50"
    >
        <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span>Enviar Link via WhatsApp</span>
        </div>
    </button>
</div>
```

### **Passo 4: Testar**

1. Faça um pagamento teste
2. Vá em **Financeiro** → Clique na transação
3. Clique em **"Verificar Pagamento"**
4. Aguarde a confirmação! ✅

---

## 📝 Checklist

- [ ] Deploy da função `verify-payment` no Dashboard
- [ ] Adicionar botão no `TransactionDetails.tsx`
- [ ] Testar com um pagamento real
- [ ] Comemorar! 🎉

---

**Última atualização:** 22/12/2025 14:07
