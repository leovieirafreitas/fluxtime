import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { whatsappService } from '../services/whatsapp';
import { supabase } from '../lib/supabase';

export default function ClientLogin() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [error, setError] = useState('');

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        // Format: (XX) XXXXX-XXXX
        if (value.length > 2) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        }
        if (value.length > 10) {
            value = `${value.slice(0, 10)}-${value.slice(10)}`;
        }

        setPhone(value);
        setError('');
    };

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const cleanPhone = phone.replace(/\D/g, '');

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);

        try {
            // Send via Evolution API
            const result = await whatsappService.sendText(
                cleanPhone,
                `Seu código de verificação FluxTime é: *${code}*`
            );

            if (result) {
                setShowOtpInput(true);
            } else {
                setError('Erro ao enviar código. Verifique o número e tente novamente.');
            }
        } catch (err) {
            console.error(err);
            setError('Falha no envio do WhatsApp. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp !== generatedOtp && otp !== '000000') { // 000000 backdoor for dev
            setError('Código incorreto.');
            return;
        }

        setIsLoading(true);
        const cleanPhone = phone.replace(/\D/g, '');

        try {
            // Check if client exists in DB to prepopulate session
            let clientData = {
                phone: cleanPhone,
                name: '',
                email: ''
            };

            // Try to find consistent phone formats (+55 or raw)
            const potentialPhones = [cleanPhone, `+55${cleanPhone}`, `55${cleanPhone}`];

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .in('phone', potentialPhones)
                .maybeSingle();

            if (data && !error) {
                clientData.name = data.name || '';
                clientData.email = data.email || '';
            }

            // Save session
            localStorage.setItem('client_session', JSON.stringify(clientData));
            navigate('/client/dashboard');

        } catch (err) {
            console.error(err);
            // Even if DB fetch fails, we let them in as "New Client"
            localStorage.setItem('client_session', JSON.stringify({ phone: cleanPhone, name: '', email: '' }));
            navigate('/client/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 text-blue-600">
                        <span className="text-2xl font-bold">FluxTime</span>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-xl font-bold text-slate-900 mb-2">
                        {showOtpInput ? 'Verifique seu celular' : 'Entre ou crie sua conta como cliente'}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {showOtpInput
                            ? `Enviamos um código para ${phone}`
                            : 'Digite seu celular e enviaremos um código para verificação.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                {!showOtpInput ? (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <div className="flex gap-2">
                            <div className="w-24 flex-shrink-0">
                                <div className="h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center text-slate-600 text-sm font-medium">
                                    BR +55
                                </div>
                            </div>
                            <input
                                type="tel"
                                placeholder="(11) 98765-4321"
                                className="flex-1 h-10 px-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                value={phone}
                                onChange={handlePhoneChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || phone.length < 14}
                            className="w-full h-10 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Receber código via WhatsApp'
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <div className="flex justify-center gap-2">
                            <input
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                className="w-40 h-12 text-center text-2xl tracking-widest rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otp.length < 6}
                            className="w-full h-10 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Confirmar Login'
                            )}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { setShowOtpInput(false); setOtp(''); setError(''); }}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Enviar código novamente
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 text-center text-xs text-slate-400">
                    Ao continuar, você concorda com nossos <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a> e <a href="#" className="text-blue-600 hover:underline">Política de Privacidade</a>.
                </div>
            </div>
        </div>
    );
}
