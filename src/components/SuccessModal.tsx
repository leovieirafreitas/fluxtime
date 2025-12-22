import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';
import { useEffect } from 'react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'info';
}

export default function SuccessModal({
    isOpen,
    onClose,
    title,
    message,
    variant = 'success'
}: SuccessModalProps) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000); // Auto-close after 4 seconds

            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="w-12 h-12 text-green-500" />,
        error: <AlertCircle className="w-12 h-12 text-red-500" />,
        info: <Info className="w-12 h-12 text-blue-500" />
    };

    const colors = {
        success: 'from-green-500/20 to-green-600/20 border-green-500/30',
        error: 'from-red-500/20 to-red-600/20 border-red-500/30',
        info: 'from-blue-500/20 to-blue-600/20 border-blue-500/30'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            {/* Modal */}
            <div className="pointer-events-auto relative bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 border border-slate-700">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon and gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors[variant]} rounded-2xl opacity-50`} />

                {/* Content */}
                <div className="relative flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-4">
                        {icons[variant]}
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-300 leading-relaxed">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}
