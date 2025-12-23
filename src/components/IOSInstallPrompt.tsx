import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export default function IOSInstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detecta se é iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);

        // Detecta se já está instalado (standalone)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

        // Validar se é Safari (não Chrome no iOS, pois Chrome iOS não suporta PWA install igual Safari em versões antigas, mas hoje em dia suporta melhor, mas o foco é Safari)

        // Mostrar apenas se for iOS E NÃO for standalone
        if (isIOS && !isStandalone) {
            // Mostrar após um pequeno delay para não ser intrusivo demais logo de cara
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in-up">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-2xl max-w-sm mx-auto text-slate-900 relative">
                <button
                    onClick={() => setShowPrompt(false)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="pr-6">
                    <h3 className="font-bold text-lg mb-1">Ative as Notificações 🔔</h3>
                    <p className="text-sm text-slate-600 mb-3">
                        Para receber alertas no iPhone, você precisa instalar o aplicativo:
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Share className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">1. Toque no botão Compartilhar</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <PlusSquare className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium">2. Escolha "Adicionar à Tela de Início"</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Depois abra o app criado para ativar as notificações</p>
                </div>
            </div>
        </div>
    );
}
