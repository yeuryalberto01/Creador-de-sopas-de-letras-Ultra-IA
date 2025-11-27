import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", hoverEffect = false }) => {
    return (
        <div className={`
      bg-glass-white backdrop-blur-xl border border-glass-border 
      rounded-2xl shadow-xl p-6
      ${hoverEffect ? 'hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl' : ''}
      ${className}
    `}>
            {children}
        </div>
    );
};
