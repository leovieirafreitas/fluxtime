# 🎯 Solução Final: Pagamento com Polling Automático

## 📋 Problema Identificado

O cliente fazia login, clicava para pagar, mas **não voltava automaticamente** para o dashboard após o pagamento porque:

1. **A InfinitePay não aceita `redirect_url`** via parâmetros de URL na API pública
2. **O código anterior redirecionava na mesma aba** (`window.location.href = data.url`), fazendo o cliente perder o dashboard

## ✅ Solução Implementada

### **1. Abrir Pagamento em Nova Aba**
- Mudamos de `window.location.href` para `window.open(data.url, '_blank')`
- O dashboard **permanece aberto** enquanto o cliente paga

### **2. Polling Automático**
- Após abrir o pagamento, o sistema **verifica automaticamente** a cada 3 segundos se o webhook confirmou o pagamento
- Quando o `payment_status` muda para `'paid'`, mostra popup de sucesso e recarrega a página

### **3. Fluxo Completo**

```
1. Cliente faz login (via link do WhatsApp)
   ↓
2. Cliente vê o agendamento no dashboard
   ↓
3. Cliente clica em "Pagar"
   ↓
4. Sistema abre InfinitePay em NOVA ABA
   ↓
5. Dashboard fica aberto fazendo POLLING (verificando status)
   ↓
6. Cliente paga na InfinitePay
   ↓
7. Webhook atualiza payment_status para 'paid'
   ↓
8. Polling detecta mudança
   ↓
9. Popup de sucesso aparece
   ↓
10. Dashboard recarrega mostrando "PAGO"
```

## 🔧 Código Modificado

### **ClientDashboard.tsx - handlePayment**

```typescript
const handlePayment = async (apt: AppointmentType) => {
    if (apt.payment_status === 'paid' || isPaymentLoading) return;

    const confirmPayment = confirm(`Deseja ir para o pagamento do serviço ${apt.service_name}?`);
    if (!confirmPayment) return;

    setIsPaymentLoading(true);

    try {
        const { data, error } = await supabase.functions.invoke('create-infinitepay-link', {
            body: {
                appointmentId: apt.id,
                origin: window.location.origin,
                amount: (apt.remaining_amount && apt.remaining_amount > 0)
                    ? apt.remaining_amount
                    : (apt.total_amount && apt.total_amount > 0 ? apt.total_amount : undefined)
            }
        });

        if (error) throw error;

        if (data?.url) {
            // ✅ NOVA ABA (não perde o dashboard)
            const paymentWindow = window.open(data.url, '_blank');
            
            if (!paymentWindow) {
                addToast('Por favor, permita pop-ups para abrir o pagamento', 'error');
                setIsPaymentLoading(false);
                return;
            }

            addToast('Abrindo página de pagamento em nova aba...', 'info');
            setIsPaymentLoading(false);

            // ✅ POLLING AUTOMÁTICO
            const pollInterval = setInterval(async () => {
                try {
                    const { data: appointment, error: fetchError } = await supabase
                        .from('appointments')
                        .select('payment_status')
                        .eq('id', apt.id)
                        .single();

                    if (fetchError) {
                        console.error('Error polling payment status:', fetchError);
                        return;
                    }

                    if (appointment?.payment_status === 'paid') {
                        clearInterval(pollInterval);
                        
                        // ✅ POPUP DE SUCESSO
                        setSuccessPopup({
                            isOpen: true,
                            title: 'Pagamento Confirmado! 🎉',
                            message: 'Seu pagamento foi processado com sucesso. Obrigado!'
                        });

                        // ✅ RECARREGA DASHBOARD
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }
                } catch (pollError) {
                    console.error('Polling error:', pollError);
                }
            }, 3000); // Verifica a cada 3 segundos

            // ✅ TIMEOUT DE 5 MINUTOS
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 300000);

        } else {
            addToast('Erro ao gerar link de pagamento. Tente novamente mais tarde.', 'error');
            setIsPaymentLoading(false);
        }
    } catch (error) {
        console.error('Error generating payment link:', error);
        addToast('Não foi possível iniciar o pagamento. Entre em contato com o estabelecimento.', 'error');
        setIsPaymentLoading(false);
    }
};
```

## 🎯 Vantagens

1. ✅ **Cliente não perde o dashboard** (abre em nova aba)
2. ✅ **Confirmação automática** (via polling + webhook)
3. ✅ **Feedback visual** (popup de sucesso)
4. ✅ **Funciona mesmo sem redirect da InfinitePay**
5. ✅ **Timeout de segurança** (para após 5 minutos)

## 📝 Observações

- **Polling a cada 3 segundos**: Balanceado entre responsividade e carga no servidor
- **Timeout de 5 minutos**: Evita polling infinito se o cliente abandonar o pagamento
- **Popup bloqueado**: Se o navegador bloquear pop-ups, mostra mensagem para o usuário permitir

## 🚀 Como Testar

1. Faça login no dashboard do cliente
2. Clique em "Pagar" em um agendamento
3. Nova aba abre com InfinitePay
4. Faça o pagamento (PIX ou cartão)
5. **Volte para a aba do dashboard**
6. Aguarde até 3 segundos
7. Popup de sucesso aparece
8. Dashboard recarrega mostrando "PAGO"

---

**Data**: 2025-12-22
**Status**: ✅ Implementado e Funcionando
