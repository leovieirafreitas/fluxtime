import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { whatsappService } from '../services/whatsapp';
import { supabase } from '../lib/supabase';
import OTPInput from '../components/OTPInput';

export default function ClientLogin() {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [error, setError] = useState('');
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        } else {
            // Expire code when timer hits 0
            setGeneratedOtp('');
        }
    }, [timeLeft]);

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
                setTimeLeft(30);
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
        const normalizedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

        try {
            // Check using Secure RPC
            const { data, error } = await supabase
                .rpc('public_check_client_phone', { p_phone: cleanPhone })
                .maybeSingle<any>();

            if (data && !error) {
                // Login directly
                localStorage.setItem('client_session', JSON.stringify({
                    phone: normalizedPhone,
                    name: data.name || '',
                    email: data.email || ''
                }));
                navigate('/client/dashboard');
            } else {
                // Does not exist -> Show registration form
                setShowRegisterForm(true);
            }

        } catch (err) {
            console.error(err);
            setError('Erro ao verificar usuário.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const cleanPhone = phone.replace(/\D/g, '');
        const normalizedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;

        try {
            const { error } = await supabase.rpc('public_register_portal_client', {
                p_name: name,
                p_phone: normalizedPhone,
                p_email: email,
                p_birth_date: birthDate
            });

            if (error) throw error;

            // Login
            localStorage.setItem('client_session', JSON.stringify({
                phone: normalizedPhone,
                name: name,
                email: email
            }));
            navigate('/client/dashboard');

        } catch (err) {
            console.error(err);
            setError('Erro ao realizar cadastro.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                {!showOtpInput && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-medium text-slate-500">FluxTime</span>
                                <h2 className="text-2xl font-bold text-blue-600">PORTAL DO CLIENTE</h2>
                            </div>
                        </div>

                        <div className="text-center mb-8">
                            <h1 className="text-xl font-bold text-slate-900 mb-2">
                                Entre ou crie sua conta como cliente
                            </h1>
                            <p className="text-slate-500 text-sm">
                                Digite seu celular e enviaremos um código para verificação.
                            </p>
                        </div>
                    </>
                )}

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
                                className="flex-1 h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
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
                ) : showRegisterForm ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Complete seu cadastro</h3>
                            <p className="text-slate-500 text-sm">
                                Informe seus dados para continuar.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    placeholder="Seu nome"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-10 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                'Concluir Cadastro'
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Digite o Código</h3>
                            <p className="text-slate-500 text-sm">
                                Enviamos um código de verificação para<br />
                                <span className="font-semibold text-slate-700">{phone}</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => { setShowOtpInput(false); setOtp(''); setError(''); }}
                                className="text-sm text-blue-600 font-medium hover:underline mt-2"
                            >
                                Número errado? Editar
                            </button>
                        </div>

                        <OTPInput
                            value={otp}
                            onChange={setOtp}
                            onComplete={() => { }} // Optional auto-submit can be added
                        />

                        <button
                            type="submit"
                            disabled={isLoading || otp.length < 6}
                            className="w-full h-12 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Verificar Código</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            {timeLeft > 0 ? (
                                <p className="text-sm text-slate-500">
                                    Enviar novamente em <span className="font-medium text-slate-900">00:{timeLeft.toString().padStart(2, '0')}</span>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    className="text-sm text-blue-600 font-medium hover:underline"
                                    disabled={isLoading}
                                >
                                    Enviar código novamente
                                </button>
                            )}
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
