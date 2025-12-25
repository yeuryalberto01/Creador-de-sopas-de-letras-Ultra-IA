import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-50 px-3 py-1.5 bg-black/90 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wide rounded-lg shadow-xl whitespace-nowrap pointer-events-none min-w-max`}
                    >
                        {text}
                        {/* Flecha decorativa */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-white/20 rotate-45 ${position === 'top' ? '-bottom-1 border-t-0 border-l-0' : '-top-1 border-b-0 border-r-0 rotate-[225deg]'}`}></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
