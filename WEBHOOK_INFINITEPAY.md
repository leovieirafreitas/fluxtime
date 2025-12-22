# 🔧 Configuração do Webhook InfinitePay

## ✅ O Que Foi Implementado

Foi adicionado o `webhook_url` ao link de pagamento da InfinitePay. Agora, quando um cliente pagar através do link enviado via WhatsApp (mesmo sem estar logado), o sistema receberá uma notificação automática e atualizará o status do pagamento.

## 📋 Como Funciona

### 1. **Fluxo Completo**

```
Cliente recebe link → Paga (sem login) → InfinitePay notifica webhook → Sistema atualiza automaticamente
```

### 2. **Código Atualizado**

**Arquivo**: `supabase/functions/create-infinitepay-link/index.ts`

**Mudança**: Adicionado o parâmetro `webhook_url` na linha 152-154:

```typescript
// Add webhook URL for automatic payment confirmation
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;
params.append('webhook_url', webhookUrl)
```

### 3. **URL Gerada**

Agora o link de pagamento inclui:
```
https://checkout.infinitepay.io/{handle}?
  items=[...]&
  order_nsu={appointment_id}&
  redirect_url={...}&
  webhook_url=https://[SEU-PROJETO].supabase.co/functions/v1/infinitepay-webhook
```

## 🚀 Como Fazer o Deploy

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard
2. Vá em **Edge Functions**
3. Clique em **create-infinitepay-link**
4. Clique em **Deploy new version**
5. Cole o conteúdo do arquivo `supabase/functions/create-infinitepay-link/index.ts`
6. Clique em **Deploy**

### Opção 2: Via CLI (se disponível)

```bash
npx supabase functions deploy create-infinitepay-link
```

## 🧪 Como Testar

1. **Envie um link de pagamento via WhatsApp** (usando o botão no sistema)
2. **Abra o link em uma aba anônima** (para simular cliente não logado)
3. **Complete o pagamento**
4. **Verifique no sistema** se o status mudou para "Pago" automaticamente

## 📊 Como Verificar os Logs

Para ver se o webhook está sendo chamado:

1. Acesse o Supabase Dashboard
2. Vá em **Edge Functions** → **infinitepay-webhook**
3. Clique em **Logs**
4. Você verá mensagens como:
   ```
   Webhook received: { order_nsu: "...", paid_amount: 100, ... }
   Updating existing appointment ... payment to paid via pix
   Appointment ... payment confirmed
   ```

## ⚠️ Importante

- O webhook já está implementado e funcionando
- Você **NÃO precisa** configurar nada no painel da InfinitePay
- O `webhook_url` é enviado automaticamente em cada link de pagamento
- Funciona para:
  - ✅ Pagamentos de agendamentos existentes
  - ✅ Taxas de reserva (pending_bookings)
  - ✅ Pagamentos parciais (remaining_amount)

## 🔍 Troubleshooting

### Pagamento não atualizou automaticamente?

1. Verifique os logs do webhook (passos acima)
2. Confirme que o `order_nsu` no log corresponde ao ID do agendamento
3. Verifique se há erros no log

### Como atualizar manualmente?

Se por algum motivo o webhook falhar, você pode:
1. Ir em **Financeiro** → Clicar na transação
2. Clicar em **"Marcar como PAGO"**

## 📚 Referências

- [Documentação InfinitePay - Checkout](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-da-infinitepay#h_a28438466f)
- Webhook implementado em: `supabase/functions/infinitepay-webhook/index.ts`
- Link criado em: `supabase/functions/create-infinitepay-link/index.ts`
