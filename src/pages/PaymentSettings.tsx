import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, CheckCircle2 } from 'lucide-react';

export default function PaymentSettings() {
    const { theme } = useTheme();
    const { profile } = useUserProfileContext();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Config State
    const [saving, setSaving] = useState(false);
    const [integrationId, setIntegrationId] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Form State
    const [tag, setTag] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (profile?.company_id) {
            fetchSettings();
        }
    }, [profile]);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('company_payment_integrations')
                .select('*')
                .eq('company_id', profile?.company_id)
                .eq('provider', 'infinitepay')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
                throw error;
            }

            if (data) {
                setIntegrationId(data.id);
                setIsActive(data.is_active);
                setTag(data.settings?.infinitepay_tag || '');
                setPhone(data.settings?.infinitepay_phone || '+55 ');
            } else {
                setPhone('+55 ');
            }
        } catch (error) {
            console.error('Error fetching payment settings:', error);
        }
    };

    const formatPhone = (value: string) => {
        // Remove everything that is not a number
        const numbers = value.replace(/\D/g, '');

        // Ensure it starts with 55 (Brazil country code)
        // If user deleted part of +55, we enforce it back
        let cleaned = numbers;
        if (!cleaned.startsWith('55')) {
            // careful handling if user deletes, but requirement says "+55 has to be there"
            // simplest is to treat what's left as data after 55, or if empty just reset
            if (cleaned.length === 0) return '+55 ';
            cleaned = '55' + cleaned;
        }

        // Apply masking
        // +55 (XX) XXXXX-XXXX
        // 55 12 12345 6789

        let formatted = '+55';

        if (cleaned.length > 2) {
            formatted += ` (${cleaned.substring(2, 4)}`; // DDD
        }

        if (cleaned.length > 4) {
            formatted += `) ${cleaned.substring(4, 9)}`; // First 5 digits
        }

        if (cleaned.length > 9) {
            formatted += `-${cleaned.substring(9, 13)}`; // Last 4 digits
        }

        return formatted;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        // Don't allow deleting +55 space
        if (input.length < 4) {
            setPhone('+55 ');
            return;
        }
        setPhone(formatPhone(input));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.company_id) return;

        try {
            setSaving(true);

            const settings = {
                infinitepay_tag: tag,
                infinitepay_phone: phone
            };

            if (integrationId) {
                // Update
                const { error } = await supabase
                    .from('company_payment_integrations')
                    .update({
                        is_active: true,
                        settings: settings,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', integrationId);

                if (error) throw error;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('company_payment_integrations')
                    .insert({
                        company_id: profile.company_id,
                        provider: 'infinitepay',
                        is_active: true,
                        settings: settings
                    })
                    .select()
                    .single();

                if (error) throw error;
                if (data) setIntegrationId(data.id);
            }

            setIsActive(true);
            setExpanded(false);
            alert('Configurações salvas com sucesso!');

        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            style={{ backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc' }}
            className="min-h-screen transition-colors duration-300"
        >
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="md:ml-64 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header Mobile */}
                    <button
                        className={`md:hidden mb-6 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-slate-900 hover:bg-slate-100'}`}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Page Header */}
                    <div className="mb-8">
                        <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span>Negócio</span>
                            <span>/</span>
                            <span>Central de pagamentos</span>
                        </div>
                        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Central de pagamentos
                        </h1>
                        <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Ofereça pros seus clientes formas de pagar online, seja por Pix ou cartão de crédito. Gerencie seus métodos de pagamento e dados bancários.
                        </p>
                    </div>



                    {/* Methods Section */}
                    <h2 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Métodos de pagamento online
                    </h2>
                    <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Esses são os métodos de pagamento que você pode disponibilizar para os seus clientes
                    </p>

                    {/* InfinitePay Card */}
                    <div className={`rounded-xl border overflow-hidden transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

                        {/* Card Header for Integration */}
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
                                    <svg width="100" height="21" viewBox="0 0 151 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16.3836 31.2435C24.903 31.2435 31.8173 24.3292 31.8173 15.8098C31.8173 7.29039 24.903 0.376099 16.3836 0.376099C7.86424 0.376099 0.949951 7.29039 0.949951 15.8098C0.949951 24.3292 7.86424 31.2435 16.3836 31.2435Z" fill="#171527" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M16.3837 23.7736C20.7823 23.7736 24.3475 20.2084 24.3475 15.8098C24.3475 11.4112 20.7823 7.84606 16.3837 7.84606C11.9851 7.84606 8.41992 11.4112 8.41992 15.8098C8.41992 20.2084 11.9851 23.7736 16.3837 23.7736ZM26.7706 15.8098C26.7706 21.5512 22.125 26.1967 16.3837 26.1967C10.6424 26.1967 5.99683 21.5512 5.99683 15.8098C5.99683 10.0685 10.6424 5.42297 16.3837 5.42297C22.125 5.42297 26.7706 10.0685 26.7706 15.8098Z" fill="url(#paint0_linear_8587_51458)" />
                                        <path d="M51.5724 9.7135C50.2142 9.7135 48.4393 10.3617 47.714 11.8896V9.96044H46.0471V21.6592H47.714V15.2696C47.714 12.4144 49.7358 11.3649 51.5724 11.3649C53.3627 11.3649 54.3813 12.6922 54.3813 14.8375V21.6592H56.0481V14.8529C56.079 11.6736 54.4122 9.7135 51.5724 9.7135Z" fill="#171527" />
                                        <path d="M77.7789 9.7135C76.4208 9.7135 74.6459 10.3617 73.9205 11.8896V9.96044H72.2537V21.6592H73.9205V15.2696C73.9205 12.4144 75.9423 11.3649 77.7789 11.3649C79.5692 11.3649 80.5879 12.6922 80.5879 14.8375V21.6592H82.2547V14.8529C82.2856 11.6736 80.6187 9.7135 77.7789 9.7135Z" fill="#171527" />
                                        <path d="M85.3567 9.97583V21.6746H87.0081L86.9927 9.97583H85.3567Z" fill="#171527" />
                                        <path d="M108.322 15.7789C108.322 12.0748 105.945 9.72888 102.627 9.72888C99.3088 9.72888 96.7468 12.0748 96.7468 15.7789C96.7468 19.483 99.2934 21.9061 102.643 21.9061C104.973 21.9061 106.995 20.6714 107.936 18.5878C107.412 18.4643 106.763 18.3409 106.269 18.2174C105.544 19.4984 104.201 20.2547 102.643 20.2547C100.482 20.2547 98.7532 18.9274 98.46 16.6432H108.307C108.322 16.4271 108.322 16.0258 108.322 15.7789ZM98.4445 14.9918C98.7686 12.7693 100.482 11.3649 102.627 11.3649C104.757 11.3649 106.3 12.7539 106.624 14.9918H98.4445Z" fill="#171527" />
                                        <path d="M68.7347 9.96045H67.0833V21.6592H68.7347V9.96045Z" fill="#171527" />
                                        <path d="M42.4666 9.96045H40.7998V21.6592H42.4666V9.96045Z" fill="#171527" />
                                        <path d="M93.3205 4.5741H91.6537V9.97589H89.7554V11.6427H91.6537V21.6746H93.3205V11.6427H95.2189V9.97589H93.3205V4.5741Z" fill="#171527" />
                                        <path d="M63.7804 4.5741C60.7245 4.5741 59.7213 6.75024 59.7213 9.55918V9.96045H57.823V11.6119H59.7213V21.6746H61.3882V11.6119H64.4595V9.97589H61.3882V9.57461C61.3573 8.03124 61.558 6.1792 63.765 6.1792H64.9997V4.58953L63.7804 4.5741Z" fill="#171527" />
                                        <path d="M41.6331 4.5741H41.5868C40.9231 4.58953 40.4138 5.12971 40.4138 5.79336C40.4138 6.47244 40.954 7.01262 41.6331 7.01262C42.3122 7.01262 42.8523 6.47244 42.8523 5.79336C42.8369 5.11427 42.2967 4.5741 41.6331 4.5741Z" fill="#171527" />
                                        <path d="M86.1748 4.5741C85.5112 4.5741 84.971 5.11427 84.9556 5.79336C84.9556 6.47244 85.4957 7.01262 86.1748 7.01262C86.8385 7.01262 87.3941 6.47244 87.3941 5.79336C87.3941 5.11427 86.8539 4.5741 86.1748 4.5741Z" fill="#171527" />
                                        <path d="M67.9167 4.55859H67.8859C67.2222 4.57403 66.7129 5.11421 66.7129 5.77785C66.7129 6.45694 67.2531 6.99711 67.9167 6.99711C68.5804 6.99711 69.136 6.45694 69.136 5.77785C69.1205 5.11421 68.5804 4.55859 67.9167 4.55859Z" fill="#171527" />
                                        <path d="M117.552 9.7135C116.024 9.7135 114.542 10.3926 113.925 11.5501V9.97588H110.9V27.3542H113.925V20.1158C114.542 21.2888 116.039 21.9215 117.552 21.9215C120.592 21.9215 123.231 19.5448 123.231 15.8098C123.231 12.1212 120.592 9.7135 117.552 9.7135ZM117.058 19.0046C115.468 19.0046 113.986 17.8779 113.971 15.8561C113.971 13.896 115.375 12.6459 117.058 12.6459C118.74 12.6459 120.114 13.9578 120.114 15.8561C120.114 17.7545 118.725 19.0046 117.058 19.0046Z" fill="#171527" />
                                        <path d="M134.096 9.97588V11.4266C133.248 10.1148 131.534 9.7135 130.485 9.7135C127.429 9.7135 124.558 12.0594 124.558 15.8098C124.558 19.5448 127.414 21.9061 130.485 21.9061C131.627 21.9061 133.34 21.3814 134.096 20.1775V21.6746H137.121V9.97588H134.096ZM130.917 18.9428H130.871C129.127 18.9583 127.722 17.5384 127.707 15.7944C127.707 13.896 129.25 12.6459 130.917 12.6459C132.507 12.6459 134.112 13.8034 134.112 15.7944C134.096 17.8008 132.553 18.9428 130.917 18.9428Z" fill="#171527" />
                                        <path d="M147.74 9.94495L144.838 17.2142L141.952 9.94495H138.696L143.171 20.8874L140.594 27.3078H143.789L150.95 9.94495H147.74Z" fill="#171527" />
                                        <defs>
                                            <linearGradient id="paint0_linear_8587_51458" x1="16.3842" y1="5.42407" x2="16.3842" y2="26.1956" gradientUnits="userSpaceOnUse">
                                                <stop stopColor="#00EE26" />
                                                <stop offset="1" stopColor="#FFC600" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                            Integração FluxTime e InfinitePay
                                        </h3>
                                        {isActive && (
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Ativo
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm mb-4 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        A FluxTime não cobra taxas adicionais sobre transações via InfinitePay. Essa integração usa o link de cobrança da InfinitePay para oferecer Pix sem taxa e cartão com parcelamento para clientes, repasse de taxa para clientes e recebimento em até 1 dia útil.
                                    </p>

                                    {!expanded && !isActive ? (
                                        <button
                                            onClick={() => setExpanded(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Desbloquear pagamentos InfinitePay
                                        </button>
                                    ) : !expanded && isActive ? (
                                        <button
                                            onClick={() => setExpanded(true)}
                                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            Configurar
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* Expandable Configuration Area */}
                        {expanded && (
                            <div className={`border-t p-6 animate-in slide-in-from-top-2 duration-200 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                                <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                        <span className={`font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                                            Crie sua conta InfinitePay
                                        </span>
                                    </div>
                                    <a
                                        href="https://www.infinitepay.io/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`text-sm px-3 py-1.5 rounded border transition-colors ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-white'}`}
                                    >
                                        Acessar site
                                    </a>
                                </div>

                                <form onSubmit={handleSave}>
                                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                Tag InfinitePay
                                            </label>
                                            <input
                                                type="text"
                                                value={tag}
                                                onChange={(e) => setTag(e.target.value)}
                                                placeholder="Escreva sua tag InfinitePay"
                                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${theme === 'dark'
                                                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500'
                                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
                                            />
                                            <p className={`text-xs mt-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                Ex: $sua-loja
                                            </p>
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-medium mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                Telefone InfinitePay
                                            </label>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={handlePhoneChange}
                                                placeholder="+55"
                                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${theme === 'dark'
                                                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500'
                                                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'}`}
                                            />
                                            <p className={`text-xs mt-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                                Insira o telefone de sua conta InfinitePay
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                                        >
                                            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                            Confirmar cadastro
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(false)}
                                            className={`px-6 py-2.5 rounded-lg font-medium transition-colors border ${theme === 'dark'
                                                ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                                                : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
