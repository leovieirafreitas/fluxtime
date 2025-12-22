import { useState, useEffect } from 'react';
import { X, ChevronRight, Check, DollarSign, Edit, Trash2, Clock, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import DefaultClientAvatar from './DefaultClientAvatar';

interface AppointmentDetailsSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any; // Using any for now, but should ideally be typed
    onUpdate: () => void; // Trigger refresh in parent
    companyName?: string;
    onEdit?: (appointment: any) => void;
}

import { useToast } from '../contexts/ToastContext';

export default function AppointmentDetailsSlideOver({
    isOpen,
    onClose,
    appointment,
    onUpdate,
    companyName = 'Empresa',
    onEdit
}: AppointmentDetailsSlideOverProps) {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [isClosing, setIsClosing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [hasInfinitePay, setHasInfinitePay] = useState(false);

    // Reset when opening/changing appointment
    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            setShowActions(false);
            if (appointment?.company_id) {
                checkPaymentIntegration();
            }
        }
    }, [isOpen, appointment]);

    const checkPaymentIntegration = async () => {
        try {
            const { data } = await supabase
                .from('company_payment_integrations')
                .select('id, is_active')
                .eq('company_id', appointment.company_id)
                .eq('provider', 'infinitepay')
                .eq('is_active', true)
                .single();

            if (data) {
                setHasInfinitePay(true);
            } else {
                setHasInfinitePay(false);
            }
        } catch (err) {
            console.error('Error checking integration:', err);
            setHasInfinitePay(false);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    if (!appointment) return null;

    const handleClientClick = () => {
        if (appointment.client_id) {
            navigate(`/clients/${appointment.client_id}`);
            onClose();
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    };

    const formatTimeRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return `${s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até ${e.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const handleCancelAppointment = async () => {
        if (!confirm('Tem certeza que deseja desmarcar este agendamento?')) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointment.id);

            if (error) throw error;
            onUpdate();
            handleClose();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            addToast('Erro ao cancelar agendamento.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAppointment = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'confirmed' })
                .eq('id', appointment.id);

            if (error) throw error;
            onUpdate();
            // Don't close, just update UI
        } catch (error) {
            console.error('Error confirming appointment:', error);
            addToast('Erro ao confirmar agendamento.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePayment = async () => {
        const isPaid = appointment.payment_status === 'paid';
        const newStatus = isPaid ? 'unpaid' : 'paid';
        setLoading(true);

        try {
            // Fetch fresh data to ensure we use valid Discount and Price values even if UI is stale
            const { data: freshData } = await supabase
                .from('appointments')
                .select(`
                    discount,
                    total_amount,
                    service:services(price)
                `)
                .eq('id', appointment.id)
                .single();

            const dbDiscount = freshData?.discount || 0;
            // @ts-ignore
            const dbServicePrice = freshData?.service?.price || appointment.service?.price || 0;
            const dbTotalAmount = freshData?.total_amount;

            // Logic to preserve manual price as discount (matching TransactionDetails.tsx)
            let newDiscount = dbDiscount;

            if (newStatus === 'unpaid' && isPaid) {
                const confirmed = window.confirm('Ao marcar como NÃO PAGO, o registro de pagamento será removido e o valor voltará a ser cobrado na íntegra (considerando descontos). Deseja continuar?');
                if (!confirmed) {
                    setLoading(false);
                    return;
                }

                // Implied discount calculation
                // Ex: Price 55, Paid 54, Discount DB 0. => Implícito 1.
                // Use totalAmount which is consistently the 'Paid Amount' when status is Paid.
                const currentPaid = dbTotalAmount ?? dbServicePrice;

                if (dbServicePrice > 0 && currentPaid < dbServicePrice) {
                    const impliedDiscount = dbServicePrice - currentPaid;
                    // If implied discount is greater than recorded, update it
                    if (impliedDiscount > newDiscount) {
                        newDiscount = impliedDiscount;
                    }
                }
            }

            // Determine the amount to lock in if paying
            // We want to lock in the FULL FINAL PRICE (Service - Discount).
            const finalTotal = Math.max(0, dbServicePrice - newDiscount);

            const { error } = await supabase
                .from('appointments')
                .update({
                    payment_status: newStatus,
                    remaining_amount: newStatus === 'paid' ? 0 : null,
                    total_amount: newStatus === 'paid' ? finalTotal : null,
                    discount: newDiscount
                })
                .eq('id', appointment.id);

            if (error) throw error;
            onUpdate();
        } catch (error) {
            console.error('Error updating payment:', error);
            addToast('Erro ao atualizar pagamento.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePaymentLink = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-infinitepay-link', {
                body: {
                    appointmentId: appointment.id,
                    origin: window.location.origin
                }
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                addToast('Erro ao gerar link de pagamento. Tente novamente.', 'error');
            }

        } catch (error) {
            console.error('Error generating link:', error);
            addToast('Erro ao conectar com InfinitePay. Verifique se a integração está ativa.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Calculate duration
    const start = new Date(appointment.start_date || appointment.start_time);
    const end = new Date(appointment.end_date || appointment.end_time);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    // Payment Status
    const isPaid = appointment.payment_status === 'paid';
    const servicePrice = appointment.service?.price || 0;
    const discount = appointment.discount || 0;

    // Robust Total Calculation:
    // 1. Start with raw total_amount from DB
    let rawTotal = appointment.total_amount;

    // 2. Sanity Check: If total is 0, but we have a partial discount (not full), 
    // it implies the 0 is likely an error/default, not a "Free" service.
    if (rawTotal === 0 && discount > 0 && discount < servicePrice) {
        rawTotal = null; // Force recalculation
    }

    // 3. Final calculation
    const totalAmount = (rawTotal !== null && rawTotal !== undefined)
        ? rawTotal
        : Math.max(0, servicePrice - discount);

    const coupon = appointment.coupon;

    const isFeeEnabled = appointment.service?.is_reservation_fee_enabled;
    const feeAmount = appointment.service?.reservation_fee || 0;

    // Check if the current total matches the reservation fee
    const remaining = appointment.remaining_amount;
    // Only calculate a specific paid amount if there is a remaining balance tracked
    const paidAmount = (remaining !== null && remaining !== undefined)
        ? totalAmount - remaining
        : (isPaid ? totalAmount : 0);

    const isPayingFee = isFeeEnabled && Math.abs(paidAmount - feeAmount) < 0.01 && (remaining || 0) > 0;

    // Partial if not fully 'paid' status, paid > 0, and we actually have a remaining balance tracked
    const isPartiallyPaid = !isPaid && paidAmount > 0 && (remaining !== null && remaining !== undefined);

    const discountValue = servicePrice - totalAmount;
    // Only show discount if it's NOT just the fee payment (i.e., we are paying the fee, so the "difference" is just the rest of the price, not a discount)
    const hasDiscount = !isPayingFee && (discountValue > 0 || !!coupon);

    // Determine Creator Label
    const getCreatorLabel = () => {
        if (appointment.origin === 'client') return 'Cliente';
        if (appointment.origin === 'business') return companyName; // 'Barbershop' passed from parent
        // Fallback or infer
        return 'Cliente'; // Default to client if unknown
    };

    return (
        <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Slide-over Panel */}
            <div
                className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                            Agendamento
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Actions Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowActions(!showActions)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 relative z-10 bg-white"
                            >
                                Ações
                                <div className={`w-2 h-2 border-r border-b border-current transform rotate-45 transition-transform ${showActions ? '-rotate-135' : ''} mt-[-2px]`} />
                            </button>

                            {/* Dropdown Menu */}
                            {showActions && (
                                <>
                                    <div className="fixed inset-0 z-0" onClick={() => setShowActions(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                        {appointment.status !== 'confirmed' && appointment.status !== 'cancelled' && (
                                            <button
                                                disabled={loading}
                                                onClick={() => { handleConfirmAppointment(); setShowActions(false); }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Check className="w-4 h-4" />
                                                Confirmar
                                            </button>
                                        )}

                                        <button
                                            disabled={loading}
                                            onClick={() => { handleCancelAppointment(); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Desmarcar
                                        </button>
                                        <button
                                            onClick={() => { if (onEdit) onEdit(appointment); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Editar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Main Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">
                            {appointment.service?.name || 'Serviço sem nome'}
                        </h2>
                        <div className="text-slate-500 font-medium">
                            Hoje, {formatDate(appointment.start_date || appointment.start_time)} — {formatTimeRange(appointment.start_date || appointment.start_time, appointment.end_date || appointment.end_time)}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Client Info */}
                    <div
                        onClick={handleClientClick}
                        className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 -mx-2 p-2 rounded-xl transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex-shrink-0">
                                <DefaultClientAvatar size={48} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-lg">
                                    {appointment.client_name || 'Cliente sem nome'}
                                </div>
                                <div className="text-slate-500 text-sm font-medium">
                                    {appointment.client_phone || 'Sem telefone'}
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                    </div>

                    <hr className="border-slate-100" />

                    {/* Attendance Details */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">
                            <Clock className="w-4 h-4" />
                            Atendimento
                        </h3>

                        <div className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
                            <div className="text-slate-500 font-medium">Status</div>
                            <div>
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                                    ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}
                                `}>
                                    {appointment.status === 'confirmed' ? 'Confirmado' :
                                        appointment.status === 'pending' ? 'Pendente' :
                                            appointment.status === 'cancelled' ? 'Cancelado' : appointment.status}
                                </span>
                            </div>

                            <div className="text-slate-500 font-medium">Data e horário</div>
                            <div className="font-medium text-slate-900">
                                {new Date(appointment.start_date || appointment.start_time).toLocaleDateString('pt-BR')} - {new Date(appointment.start_date || appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>

                            <div className="text-slate-500 font-medium">Colaborador(a)</div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                    {appointment.professional?.full_name?.charAt(0) || 'P'}
                                </div>
                                <span className="font-medium text-slate-900">
                                    {appointment.professional?.full_name || 'Profissional'}
                                </span>
                            </div>

                            <div className="text-slate-500 font-medium">Duração</div>
                            <div className="font-medium text-slate-900">{durationMinutes} min</div>

                            <div className="text-slate-500 font-medium">Local</div>
                            <div className="font-medium text-slate-900">Em meu estabelecimento</div>

                            <div className="text-slate-500 font-medium">Criado por</div>
                            <div className="font-medium text-slate-900">{getCreatorLabel()}</div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Payment Details */}
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">
                            <DollarSign className="w-4 h-4" />
                            Pagamento
                        </h3>

                        <div className="grid grid-cols-[120px_1fr] gap-y-4 text-sm items-center">
                            <div className="text-slate-500 font-medium">Serviço</div>
                            <div className="font-medium text-slate-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servicePrice)}
                            </div>

                            {isPartiallyPaid && (
                                <>
                                    <div className="text-slate-500 font-medium">Taxa de Reserva</div>
                                    <div className="font-medium text-green-600">
                                        - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paidAmount)}
                                    </div>
                                </>
                            )}

                            {hasDiscount && (
                                <>
                                    <div className="text-slate-500 font-medium flex items-center gap-1">
                                        Desconto
                                        {coupon && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 rounded uppercase font-bold tracking-wider">{coupon.code}</span>}
                                    </div>
                                    <div className="font-medium text-green-600">
                                        - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servicePrice - totalAmount)}
                                    </div>
                                </>
                            )}

                            <div className="text-slate-900 font-bold text-base">Total</div>
                            <div className="font-bold text-slate-900 text-xl">
                                {isPartiallyPaid
                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.remaining_amount)
                                    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)
                                }
                            </div>



                            <div className="text-slate-500 font-medium pt-2">Status</div>
                            <div className="pt-2">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize
                                    ${isPaid ? 'bg-green-100 text-green-700' : isPartiallyPaid ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}
                                `}>
                                    {isPaid ? 'Pago' : isPartiallyPaid ? `Parcial: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paidAmount)}` : 'Não pago'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                    <button
                        onClick={handleTogglePayment}
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border disabled:opacity-50
                            ${isPaid
                                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}
                        `}
                    >
                        {isPaid ? 'Marcar como não pago' : 'Marcar como pago'}
                    </button>
                    {!isPaid && (
                        <button
                            onClick={async () => {
                                // If partial payment or we have remaining amount and fee paid, treat as 'Pay Remaining'
                                if (isPartiallyPaid || (isPayingFee && appointment.remaining_amount && appointment.remaining_amount > 0)) {
                                    setLoading(true);
                                    try {
                                        const { error: updateError } = await supabase
                                            .from('appointments')
                                            .update({
                                                total_amount: appointment.remaining_amount,
                                                remaining_amount: null,
                                                payment_status: 'unpaid'
                                            })
                                            .eq('id', appointment.id);

                                        if (updateError) throw updateError;

                                        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-infinitepay-link', {
                                            body: {
                                                appointmentId: appointment.id,
                                                origin: window.location.origin
                                            }
                                        });

                                        if (paymentError) throw paymentError;

                                        if (paymentData?.url) {
                                            window.location.href = paymentData.url;
                                        } else {
                                            addToast('Erro ao gerar link de pagamento.', 'error');
                                        }
                                    } catch (error) {
                                        console.error('Error:', error);
                                        addToast('Erro ao gerar link de pagamento do valor restante.', 'error');
                                    } finally {
                                        setLoading(false);
                                    }
                                } else {
                                    // Standard full payment logic
                                    handleGeneratePaymentLink();
                                }
                            }}
                            disabled={loading || !hasInfinitePay}
                            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                                ${hasInfinitePay && !loading
                                    ? 'bg-gradient-to-r from-[#00EE26] to-[#FFC600] text-slate-900 hover:opacity-90 shadow-sm'
                                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'}
                            `}
                            title={hasInfinitePay ? "Gerar link de pagamento InfinitePay" : "Integração InfinitePay não configurada"}
                        >
                            <CreditCard className="w-4 h-4" />
                            Cobrar agora
                        </button>
                    )}


                </div>
            </div>
        </div>
    );
}
