import React, { useState } from 'react';
import { X, DollarSign, CreditCard, Send, User, CheckCircle2, MapPin, Sparkles, Link as LinkIcon, BadgePercent } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Ícone do Pix (SVG Oficial)
const PixIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.917 11.71a2.046 2.046 0 0 1-1.454-.602l-2.1-2.1a.4.4 0 0 0-.551 0l-2.108 2.108a2.044 2.044 0 0 1-1.454.602h-.414l2.66 2.66c.83.83 2.177.83 3.007 0l2.667-2.668h-.253zM4.25 4.282c.55 0 1.066.214 1.454.602l2.108 2.108a.39.39 0 0 0 .552 0l2.1-2.1a2.044 2.044 0 0 1 1.453-.602h.253L9.503 1.623a2.127 2.127 0 0 0-3.007 0l-2.66 2.66h.414z" />
        <path d="m14.377 6.496-1.612-1.612a.307.307 0 0 1-.114.023h-.733c-.379 0-.75.154-1.017.422l-2.1 2.1a1.005 1.005 0 0 1-1.425 0L5.268 5.32a1.448 1.448 0 0 0-1.018-.422h-.9a.306.306 0 0 1-.109-.021L1.623 6.496c-.83.83-.83 2.177 0 3.008l1.618 1.618a.305.305 0 0 1 .108-.022h.901c.38 0 .75-.153 1.018-.421L7.375 8.57a1.034 1.034 0 0 1 1.426 0l2.1 2.1c.267.268.638.421 1.017.421h.733c.04 0 .079.01.114.024l1.612-1.612c.83-.83.83-2.178 0-3.008z" />
    </svg>
);

interface TransactionDetailsProps {
    transaction: any;
    companyId: string;
    onClose: () => void;
    onUpdate: () => void;
    theme: 'light' | 'dark';
    viewMode?: 'default' | 'fee_details';
}

export function TransactionDetails({ transaction, companyId, onClose, onUpdate, theme, viewMode = 'default' }: TransactionDetailsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [updatingMethod, setUpdatingMethod] = useState<string | null>(null);

    const isPaid = transaction.status === 'paid';
    const isPending = transaction.status === 'pending';

    // Calcula valores iniciais
    const servicePrice = transaction.service_price || ((transaction.amount || 0) + (transaction.total_paid || 0) + (transaction.discount || 0));
    // Discount is now read-only from transaction or 0
    const discount = transaction.discount || 0;

    // Recalcula pendente com suporte a desconto fixo vindo do banco
    const currentPendingAmount = Math.max(0, servicePrice - discount - (transaction.total_paid || 0));



    // Função para atualizar o método de pagamento
    const handleUpdateMethod = async (method: string) => {
        if (updatingMethod) return;
        setUpdatingMethod(method);

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ payment_method: method })
                .eq('id', transaction.appointment_id);

            if (error) throw error;

            transaction.payment_method = method;
            onUpdate();
        } catch (error) {
            console.error('Erro ao atualizar método:', error);
            alert('Não foi possível atualizar o método de pagamento.');
        } finally {
            setUpdatingMethod(null);
        }
    };

    const handleTogglePaymentStatus = async () => {
        try {
            setIsProcessing(true);
            const newStatus = isPaid ? 'unpaid' : 'paid';

            // Lógica para preservar preço manual como desconto
            let newDiscount = transaction.discount || 0;

            if (newStatus === 'unpaid' && isPaid) {
                const confirmed = window.confirm('Ao marcar como NÃO PAGO, o registro de pagamento será removido e o valor voltará a ser cobrado na íntegra (considerando descontos). Deseja continuar?');
                if (!confirmed) {
                    setIsProcessing(false);
                    return;
                }

                // Cálculo do desconto implícito
                // Ex: Preço 55, Pago 54, Desconto DB 0. => Implícito 1.
                const servicePrice = transaction.service_price || 0;
                const currentPaid = transaction.amount;

                if (servicePrice > 0 && currentPaid < servicePrice) {
                    const impliedDiscount = servicePrice - currentPaid;
                    // Se o desconto implícito for maior que o registrado (ex: 0), atualiza
                    if (impliedDiscount > newDiscount) {
                        newDiscount = impliedDiscount;
                    }
                }
            } else if (newStatus === 'paid') {
                // Se marcar como pago, talvez devêssemos confirmar?
                // O comportamento padrão é aceitar.
            }

            const { error } = await supabase
                .from('appointments')
                .update({
                    payment_status: newStatus,
                    remaining_amount: newStatus === 'paid' ? 0 : null,
                    total_amount: newStatus === 'paid' ? transaction.amount : null,
                    discount: newDiscount
                })
                .eq('id', transaction.appointment_id);

            if (error) throw error;

            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error('Error toggling payment status:', error);
            alert('Erro ao atualizar status do pagamento');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReceiveManual = async (method: 'money' | 'credit_card' | 'debit_card' | 'pix') => {
        const methodLabel = method === 'money' ? 'Dinheiro' : method === 'pix' ? 'Pix' : method === 'credit_card' ? 'Crédito' : 'Débito';

        if (!confirm(`Confirmar recebimento de R$ ${currentPendingAmount.toFixed(2)} em ${methodLabel}?`)) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    payment_method: method,
                    remaining_amount: 0 // Zera pendência
                })
                .eq('id', transaction.appointment_id);

            if (error) throw error;

            onUpdate();
            onClose();
            alert('Pagamento registrado com sucesso!');
        } catch (error) {
            console.error('Erro ao receber:', error);
            alert('Erro ao processar pagamento.');
        } finally {
            setIsProcessing(false);
        }
    };

    const getPaymentLink = async (): Promise<string | null> => {
        try {
            const { data: tag, error: tagError } = await supabase.rpc('get_company_infinitepay_tag', {
                p_company_id: companyId
            });

            if (tagError || !tag) return null;

            const handle = tag.replace('$', '').replace('@', '').trim();
            const cleanHandle = handle.replace(/[^a-zA-Z0-9_-]/g, '');
            const amountInCents = Math.round(currentPendingAmount * 100);
            const itemName = `Pagamento Restante - ${transaction.service_name}`;

            const items = [{
                quantity: 1,
                price: amountInCents,
                name: itemName
            }];

            const params = new URLSearchParams();
            params.append('items', JSON.stringify(items));
            params.append('order_nsu', transaction.appointment_id);
            if (transaction.client_name) params.append('customer_name', transaction.client_name);

            return `https://checkout.infinitepay.io/${cleanHandle}?${params.toString()}`;

        } catch (error) {
            console.error('Erro ao gerar link:', error);
            return null;
        }
    };

    const handleCobrancaWhatsApp = async () => {
        setIsGeneratingLink(true);
        try {
            const link = await getPaymentLink();
            let message = `Olá ${transaction.client_name}, aqui é da barbearia. Segue link para pagamento do restante de R$ ${currentPendingAmount.toFixed(2).replace('.', ',')} referente ao serviço ${transaction.service_name}.`;
            if (link) message += `\n\nLink: ${link}`;
            else message += `\n\nChave Pix na recepção.`;

            const encodedMessage = encodeURIComponent(message);
            if (transaction.client_phone) {
                window.open(`https://wa.me/${transaction.client_phone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
            } else {
                if (link) {
                    await navigator.clipboard.writeText(link);
                    alert('Cliente sem telefone. Link copiado!');
                } else {
                    alert('Erro ao gerar link.');
                }
            }
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleCopyLink = async () => {
        setIsGeneratingLink(true);
        try {
            const link = await getPaymentLink();
            if (link) {
                await navigator.clipboard.writeText(link);
                alert('Link copiado!');
            } else {
                alert('Erro na Tag InfinitePay.');
            }
        } finally {
            setIsGeneratingLink(false);
        }
    }

    const bgColor = theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200';
    const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
    const secondaryText = theme === 'dark' ? 'text-neutral-400' : 'text-slate-500';

    const paymentMethods = [
        { id: 'money', label: 'Dinheiro', icon: <DollarSign className="w-5 h-5" /> },
        { id: 'pix', label: 'Pix', icon: <PixIcon className="w-5 h-5" /> },
        { id: 'credit_card', label: 'Crédito', icon: <CreditCard className="w-5 h-5" /> },
        { id: 'debit_card', label: 'Débito', icon: <CreditCard className="w-5 h-5" /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-md h-full shadow-2xl ${bgColor} border-l flex flex-col transform transition-transform duration-300 ease-in-out`}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <h2 className={`text-xl font-bold ${textColor}`}>Detalhes da Transação</h2>
                    <button onClick={onClose} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${secondaryText}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Badge e Valor */}
                    <div className="text-center space-y-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium 
                            ${viewMode === 'fee_details'
                                ? (theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-800')
                                : isPaid
                                    ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800')
                                    : transaction.status === 'pending'
                                        ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                                        : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-800')}`}>
                            {viewMode === 'fee_details' ? 'Taxa Recebida' :
                                isPaid ? 'Pago' : transaction.status === 'pending' ? 'Pendente' : 'Cancelado'}
                        </span>

                        <h3 className={`text-4xl font-bold ${textColor}`}>
                            R$ {viewMode === 'fee_details'
                                ? (transaction.total_paid || 0).toFixed(2).replace('.', ',')
                                : isPaid
                                    ? (transaction.amount || 0).toFixed(2).replace('.', ',')
                                    : currentPendingAmount.toFixed(2).replace('.', ',')}
                        </h3>

                        {/* Detalhes de Preço e Desconto */}
                        {viewMode !== 'fee_details' && !isPaid && (
                            <div className="flex flex-col items-center gap-1 text-sm">
                                <span className={secondaryText}>Valor do Serviço: R$ {servicePrice.toFixed(2)}</span>
                                {(transaction.discount || 0) > 0 && (
                                    <span className="text-red-500 font-medium text-xs flex items-center gap-1">
                                        <BadgePercent className="w-3 h-3" /> Desconto: - R$ {(transaction.discount || 0).toFixed(2)}
                                    </span>
                                )}
                                {(transaction.total_paid || 0) > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Já pago: R$ {(transaction.total_paid || 0).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Editor de Desconto removido conforme solicitação */}
                    </div>

                    {/* Seletor de Método (Editável se já pago) */}
                    {isPaid && (
                        <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                            <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${secondaryText}`}>Método de Pagamento</p>
                            <div className="grid grid-cols-4 gap-2">
                                {paymentMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => handleUpdateMethod(method.id)}
                                        disabled={updatingMethod !== null}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                                            ${transaction.payment_method === method.id
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500 shadow-sm'
                                                : `border-transparent hover:bg-white hover:shadow-sm ${theme === 'dark' ? 'hover:bg-neutral-700 text-slate-400' : 'text-slate-500'}`
                                            }`}
                                    >
                                        <div className={transaction.payment_method === method.id ? 'text-emerald-600' : ''}>
                                            {method.icon}
                                        </div>
                                        <span className="text-[10px] font-semibold mt-1">{method.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detalhes Completos */}
                    <div className={`p-4 rounded-xl space-y-4 ${theme === 'dark' ? 'bg-neutral-800/50' : 'bg-slate-50'}`}>
                        {/* Cliente */}
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white shadow-sm'}`}>
                                <User className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${textColor}`}>{transaction.client_name}</p>
                                <p className={`text-xs ${secondaryText}`}>Cliente</p>
                            </div>
                        </div>

                        <div className="w-full h-px bg-gray-200 dark:bg-neutral-700" />

                        {/* Colaborador */}
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white shadow-sm'}`}>
                                <User className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${textColor}`}>{transaction.professional_name || 'Não atribuído'}</p>
                                <p className={`text-xs ${secondaryText}`}>Colaborador responsável</p>
                            </div>
                        </div>
                        <div className="w-full h-px bg-gray-200 dark:bg-neutral-700" />

                        {/* Serviço */}
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white shadow-sm'}`}>
                                <Sparkles className="w-5 h-5 text-pink-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${textColor}`}>{transaction.service_name}</p>
                                <p className={`text-xs ${secondaryText}`}>Serviço realizado</p>
                            </div>
                        </div>
                        <div className="w-full h-px bg-gray-200 dark:bg-neutral-700" />

                        {/* Local */}
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-neutral-700' : 'bg-white shadow-sm'}`}>
                                <MapPin className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${textColor}`}>Unidade Principal</p>
                                <p className={`text-xs ${secondaryText}`}>Local de atendimento</p>
                            </div>
                        </div>
                    </div>



                    {/* Ações de Pagamento Rápido (Toggle) */}
                    {viewMode !== 'fee_details' && (
                        <div className={`p-4 rounded-xl space-y-3 border ${theme === 'dark' ? 'border-neutral-700 bg-neutral-800/30' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${secondaryText}`}>Status do Pagamento</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {isPaid ? 'Pago' : 'Pendente / Não Pago'}
                                </span>
                            </div>
                            <button
                                onClick={handleTogglePaymentStatus}
                                disabled={isProcessing}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all border flex items-center justify-center gap-2
                                    ${isPaid
                                        ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                        : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200/50'}
                                `}
                            >
                                {isPaid ? (
                                    <>
                                        <X className="w-4 h-4" /> Marcar como NÃO PAGO
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" /> Marcar como PAGO
                                    </>
                                )}
                            </button>
                            {isPaid && (
                                <p className="text-center text-[10px] text-slate-400">
                                    Ao marcar como não pago, o registro sairá dos relatórios financeiros de entrada.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ações (Se Pendente e NÃO for visualização de taxa) */}
                    {viewMode !== 'fee_details' && !isPaid && (
                        <div className="space-y-4">
                            <label className={`text-sm font-medium ${secondaryText} uppercase tracking-wider`}>Ações</label>

                            {/* Opções de Recebimento Presencial */}
                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-neutral-700 bg-neutral-800/30' : 'border-slate-200 bg-slate-50'}`}>
                                <h4 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textColor}`}>
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    Receber Presencialmente
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleReceiveManual('money')}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-neutral-700 hover:bg-neutral-700 text-emerald-400' : 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}
                                    >
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-xs font-bold">Dinheiro</span>
                                    </button>

                                    <button
                                        onClick={() => handleReceiveManual('pix')}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-neutral-700 hover:bg-neutral-700 text-teal-400' : 'border-teal-100 bg-teal-50 hover:bg-teal-100 text-teal-700'}`}
                                    >
                                        <PixIcon className="w-5 h-5" />
                                        <span className="text-xs font-bold">Pix</span>
                                    </button>

                                    <button
                                        onClick={() => handleReceiveManual('credit_card')}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-neutral-700 hover:bg-neutral-700 text-blue-400' : 'border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-700'}`}
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        <span className="text-xs font-bold">Crédito</span>
                                    </button>

                                    <button
                                        onClick={() => handleReceiveManual('debit_card')}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-colors ${theme === 'dark' ? 'border-neutral-700 hover:bg-neutral-700 text-indigo-400' : 'border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}
                                    >
                                        <CreditCard className="w-5 h-5" />
                                        <span className="text-xs font-bold">Débito</span>
                                    </button>
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-neutral-700 bg-neutral-800/30' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <CreditCard className="w-4 h-4 text-indigo-500" />
                                    <h4 className={`text-sm font-semibold ${textColor}`}>Cobrar Online</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handleCobrancaWhatsApp} disabled={isGeneratingLink} className="py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                        <Send className="w-4 h-4" /> WhatsApp
                                    </button>
                                    <button onClick={handleCopyLink} disabled={isGeneratingLink} className={`py-2 border rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${theme === 'dark' ? 'border-neutral-700 hover:bg-neutral-700' : 'border-slate-200 hover:bg-slate-100'}`}>
                                        <LinkIcon className="w-4 h-4" /> Copiar Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
