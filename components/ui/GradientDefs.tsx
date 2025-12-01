import React from 'react';

export const GradientDefs = () => {
    return (
        <svg width="0" height="0" className="absolute pointer-events-none opacity-0">
            <defs>
                {/* Primary Gradient (Indigo to Purple) */}
                <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>

                {/* Accent Gradient (Pink to Orange) */}
                <linearGradient id="gradient-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f97316" />
                </linearGradient>

                {/* Success Gradient (Emerald to Teal) */}
                <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>

                {/* Gold Gradient (Amber to Yellow) */}
                <linearGradient id="gradient-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
            </defs>
        </svg>
    );
};
