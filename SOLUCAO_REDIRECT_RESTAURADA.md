# ✅ SOLUÇÃO RESTAURADA - Redirect Automático da InfinitePay

## 🎯 Problema Identificado

O cliente não estava sendo redirecionado automaticamente de volta ao dashboard após o pagamento porque o código estava abrindo o pagamento em **nova aba** (`window.open`), impedindo que o `redirect_url` da InfinitePay funcionasse corretamente.

## 🔧 Solução Aplicada

**Revertemos para o comportamento original:**
- Mudamos de `window.open(data.url, '_blank')` para `window.location.href = data.url`
- Removemos o código de polling (não é mais necessário)

## 🔄 Fluxo Completo (FUNCIONANDO)

```
1. Cliente faz login via WhatsApp
   ↓
2. Vê o agendamento no Dashboard
   ↓
3. Clica em "Pagar"
   ↓
4. É REDIRECIONADO para InfinitePay (mesma aba)
   ↓
5. Faz o pagamento (PIX ou cartão)
   ↓
6. InfinitePay REDIRECIONA automaticamente para:
   /client/dashboard?payment_success=true
   ↓
7. ClientDashboard detecta payment_success=true
   ↓
8. Salva mensagem no sessionStorage
   ↓
9. Recarrega a página
   ↓
10. Mostra TOAST de sucesso
   ↓
11. Webhook atualiza payment_status em background
   ↓
12. Cliente vê "PAGO" no dashboard ✅
```

## 📝 Código Modificado

### **ClientDashboard.tsx - handlePayment (linha 425-427)**

```typescript
if (data?.url) {
    // Redirect to payment page (same tab so InfinitePay can redirect back)
    window.location.href = data.url;
} else {
    addToast('Erro ao gerar link de pagamento. Tente novamente mais tarde.', 'error');
    setIsPaymentLoading(false);
}
```

### **create-infinitepay-link/index.ts (linhas 201-202)**

```typescript
// Append payment_success param so the frontend knows to show a success message
const redirectUrl = `${redirectBase}/client/dashboard?payment_success=true`;
params.append('redirect_url', redirectUrl)
```

### **ClientDashboard.tsx - useEffect para payment_success (linhas 318-328)**

```typescript
} else if (paymentSuccess === 'true' && !searchParams.get('pending_id')) {
    if (processedRef.current) return;
    processedRef.current = true;

    // Fallback for legacy generic success flag
    sessionStorage.setItem('payment_success_message', 'Pagamento confirmado! Seu agendamento foi realizado com sucesso. 🎉');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('payment_success');
    navigate(`/client/dashboard?${newParams.toString()}`, { replace: true });
    window.location.reload();
}
```

### **ClientDashboard.tsx - useEffect para exibir toast (linhas 128-133)**

```typescript
// Check for success message from payment redirect
const successMessage = sessionStorage.getItem('payment_success_message');
if (successMessage) {
    addToast(successMessage, 'success');
    sessionStorage.removeItem('payment_success_message');
}
```

## ✅ Por Que Funciona Agora

1. **Mesma Aba**: Cliente é redirecionado na mesma aba, permitindo que a InfinitePay use o `redirect_url`
2. **redirect_url Configurado**: A Edge Function adiciona `redirect_url=/client/dashboard?payment_success=true` aos parâmetros
3. **Detecção Automática**: O `useEffect` detecta `payment_success=true` na URL
4. **Toast de Sucesso**: Mostra mensagem de confirmação ao cliente
5. **Webhook em Background**: Atualiza o `payment_status` automaticamente

## 🎯 Diferença do Comportamento Anterior (Errado)

| **Antes (Errado)** | **Agora (Correto)** |
|-------------------|---------------------|
| `window.open(data.url, '_blank')` | `window.location.href = data.url` |
| Nova aba abre | Mesma aba redireciona |
| Redirect da InfinitePay vai para nova aba | Redirect da InfinitePay volta ao dashboard original |
| Cliente fica perdido | Cliente volta automaticamente |
| Polling necessário | Não precisa polling |

## 🚀 Como Testar

1. Faça login no dashboard do cliente
2. Clique em "Pagar" em um agendamento
3. **Você será redirecionado** para a InfinitePay (mesma aba)
4. Faça o pagamento
5. **Automaticamente** volta para `/client/dashboard?payment_success=true`
6. Vê o toast: "Pagamento confirmado! Seu agendamento foi realizado com sucesso. 🎉"
7. Página recarrega
8. Status mostra "PAGO" ✅

---

**Data**: 2025-12-22 15:20
**Status**: ✅ FUNCIONANDO (Comportamento Original Restaurado)
