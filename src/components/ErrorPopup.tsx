import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ErrorPopupProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    duration?: number; // in milliseconds
}

export default function ErrorPopup({
    isOpen,
    onClose,
    title,
    message,
    duration = 3000
}: ErrorPopupProps) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose, duration]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            {/* Backdrop with subtle blur */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" />

            {/* Popup */}
            <div className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 pointer-events-auto border border-red-500/20">
                {/* Error gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-rose-600/10 pointer-events-none" />

                {/* Content */}
                <div className="relative px-8 py-10 flex flex-col items-center text-center">
                    {/* Error Icon with animation */}
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                        <div className="relative bg-red-500/10 p-4 rounded-full border-2 border-red-500/30">
                            <AlertCircle className="w-12 h-12 text-red-500" strokeWidth={2.5} />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-3">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-300 leading-relaxed text-[15px]">
                        {message}
                    </p>

                    {/* Progress bar */}
                    <div className="w-full mt-6 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full animate-progress"
                            style={{
                                animation: `progress ${duration}ms linear forwards`
                            }}
                        />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
                .animate-progress {
                    animation: progress linear forwards;
                }
            `}</style>
        </div>
    );
}
