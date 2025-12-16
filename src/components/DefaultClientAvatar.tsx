import React from 'react';

interface DefaultAvatarProps {
    size?: number;
    className?: string;
}

export const DefaultClientAvatar: React.FC<DefaultAvatarProps> = ({ size = 40, className = '' }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Fundo Circular Cinza Claro Minimalista */}
            <circle cx="50" cy="50" r="50" fill="#F1F5F9" />

            {/* Cabelo estilo "Nano" (Preto, canto superior direito) */}
            <path
                d="M 60 14 Q 85 20, 92 40 L 98 25 Q 90 5, 60 14 Z"
                fill="#0F172A"
            />

            {/* Olhos (Pontinhos Pretos Simples) */}
            <circle cx="45" cy="55" r="3.5" fill="#0F172A" />
            <circle cx="65" cy="55" r="3.5" fill="#0F172A" />

            {/* Sorriso Minimalista */}
            <path
                d="M 48 68 Q 55 74, 62 68"
                stroke="#0F172A"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default DefaultClientAvatar;
