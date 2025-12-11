import React, { useRef, useEffect } from 'react';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
}

export default function OTPInput({ length = 6, value, onChange, onComplete }: OTPInputProps) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (inputs.current[0]) {
            inputs.current[0]?.focus();
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const char = e.target.value;
        if (/[^0-9]/.test(char)) return;

        const newValue = value.split('');
        newValue[index] = char.substring(char.length - 1);
        const newString = newValue.join('');

        onChange(newString);

        if (char && index < length - 1) {
            inputs.current[index + 1]?.focus();
        }

        if (newString.length === length && onComplete) {
            onComplete(newString);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
        if (pastedData) {
            onChange(pastedData.padEnd(length, '')); // Or just pastedData? Usually we want the exact string
            // Actually, the parent handles the state string.
            // But we need to update the parent with the full pasted string.
            onChange(pastedData);

            // Focus last filled or first empty
            const nextIndex = Math.min(pastedData.length, length - 1);
            inputs.current[nextIndex]?.focus();

            if (pastedData.length === length && onComplete) {
                onComplete(pastedData);
            }
        }
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-center items-center">
            {Array.from({ length }).map((_, i) => (
                <React.Fragment key={i}>
                    <input
                        ref={(el) => { inputs.current[i] = el; }}
                        type="text"
                        maxLength={1}
                        value={value[i] || ''}
                        onChange={(e) => handleChange(e, i)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        onPaste={handlePaste}
                        className="w-10 h-12 sm:w-12 sm:h-14 border border-slate-300 rounded-lg text-center text-xl sm:text-2xl font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all shadow-sm bg-white"
                    />
                    {i === 2 && (
                        <div className="w-2 h-0.5 bg-slate-300 rounded-full mx-1" />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
