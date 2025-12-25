import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
    return (
        <div className={`bg-cosmic-900/80 border border-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-6 ${className}`}>
            {children}
        </div>
    );
};
