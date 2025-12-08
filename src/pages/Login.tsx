import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun, Loader2, User, Phone, Calendar, Mail, Lock, Building2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Form States
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');

    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                // Validações básicas
                if (password !== confirmPassword) {
                    throw new Error('As senhas não coincidem');
                }
                if (password.length < 6) {
                    throw new Error('A senha deve ter pelo menos 6 caracteres');
                }
                if (!companyName.trim()) {
                    throw new Error('O nome da empresa é obrigatório');
                }

                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            company_name: companyName,
                            full_name: fullName,
                            phone: phone,
                            birth_date: birthDate,
                        },
                    },
                });

                if (error) throw error;
                setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;
                if (data.session) {
                    navigate('/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            {/* Toggle de Tema */}
            <button
                onClick={toggleTheme}
                className="fixed top-6 right-6 glass glass-hover rounded-xl p-3 transition-all hover:scale-105"
                title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
                {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                    <Moon className="w-5 h-5 text-purple-600" />
                )}
            </button>

            <div className="w-full max-w-md my-8">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-2xl">F</span>
                    </div>
                </div>

                {/* Card */}
                <div className="glass rounded-3xl p-8 shadow-2xl transition-all duration-300">
                    <h1 className="text-3xl font-bold text-center mb-2">
                        {isSignUp ? 'Crie sua conta' : 'Acesse sua conta'}
                    </h1>
                    <p className="text-secondary text-center mb-8">
                        {isSignUp ? 'Preencha seus dados para começar.' : 'Faça login com e-mail ou Google.'}
                    </p>

                    {!isSignUp && (
                        <>
                            {/* Botão Google - Só Login */}
                            <button className="w-full glass glass-hover rounded-xl p-4 mb-6 flex items-center justify-center gap-3 font-medium transition-all hover:scale-[1.02]">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>Entrar com Google</span>
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex-1 h-px bg-secondary opacity-20"></div>
                                <span className="text-tertiary text-sm">ou</span>
                                <div className="flex-1 h-px bg-secondary opacity-20"></div>
                            </div>
                        </>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <>
                                {/* Nome da Empresa */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome da Barbearia/Empresa</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                            <Building2 className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Ex: Barbearia do Silva"
                                            className="w-full glass rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                            required={isSignUp}
                                        />
                                    </div>
                                </div>

                                {/* Nome Completo */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome Completo</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                            <User className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Seu nome completo"
                                            className="w-full glass rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                            required={isSignUp}
                                        />
                                    </div>
                                </div>

                                {/* Data de Nascimento */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Data de Nascimento</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                            <Calendar className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="date"
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                            className="w-full glass rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all [color-scheme:dark]"
                                            required={isSignUp}
                                            style={theme === 'light' ? { colorScheme: 'light' } : {}}
                                        />
                                    </div>
                                </div>

                                {/* Telefone */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Telefone</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                            <Phone className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="(00) 00000-0000"
                                            className="w-full glass rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                            required={isSignUp}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-medium mb-2">E-mail</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                    <Mail className="w-5 h-5" />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@exemplo.com"
                                    className="w-full glass rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Senha */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">Senha</label>
                                {!isSignUp && (
                                    <a href="#" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
                                        Esqueci minha senha
                                    </a>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={isSignUp ? "Crie uma senha forte" : "Digite sua senha"}
                                    className="w-full glass rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirmação de Senha */}
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Confirmar Senha</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                                        <Lock className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repita sua senha"
                                        className={`w-full glass rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 transition-all ${confirmPassword && password !== confirmPassword
                                            ? 'focus:ring-red-500 border-red-500/50'
                                            : 'focus:ring-purple-500'
                                            }`}
                                        required={isSignUp}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Feedback Mensagens */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center animate-fade-in">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm text-center animate-fade-in">
                                {message}
                            </div>
                        )}

                        {/* Botão Principal */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl py-3 font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isSignUp ? (
                                'Criar conta'
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>

                    {/* Toggle Login/Sign Up */}
                    <p className="text-center mt-6 text-secondary">
                        {isSignUp ? 'Já tem uma conta? ' : 'Não tem uma conta? '}
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setMessage(null);
                            }}
                            className="text-blue-500 hover:text-blue-600 font-semibold focus:outline-none hover:underline"
                        >
                            {isSignUp ? 'Faça login' : 'Cadastre-se aqui'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
