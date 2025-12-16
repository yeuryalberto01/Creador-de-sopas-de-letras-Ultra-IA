import { ElementEffects } from '../../types';
import React from 'react';

/**
 * Converts ElementEffects to React.CSSProperties
 * Generates box-shadow, outline, background, transform, and filter styles
 */
export const effectsToStyle = (effects: ElementEffects | undefined): React.CSSProperties => {
    if (!effects) return {};

    const style: React.CSSProperties = {};

    // Shadow Effect
    if (effects.shadowEnabled) {
        const blur = effects.shadowBlur ?? 10;
        const offsetX = effects.shadowOffsetX ?? 0;
        const offsetY = effects.shadowOffsetY ?? 5;
        const color = effects.shadowColor ?? 'rgba(0,0,0,0.3)';
        style.boxShadow = `${offsetX}px ${offsetY}px ${blur}px ${color}`;
    }

    // Outline Effect
    if (effects.outlineEnabled) {
        const width = effects.outlineWidth ?? 2;
        const color = effects.outlineColor ?? '#6366f1';
        const outlineStyle = effects.outlineStyle ?? 'solid';
        style.outline = `${width}px ${outlineStyle} ${color}`;
        style.outlineOffset = '2px';
    }

    // Background Effect
    if (effects.backgroundEnabled) {
        const color = effects.backgroundColor ?? '#ffffff';
        const opacity = (effects.backgroundOpacity ?? 100) / 100;
        // Convert hex to rgba
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Border Radius
    if (effects.borderRadius) {
        style.borderRadius = `${effects.borderRadius}px`;
    }

    // Transform Effect
    const transforms: string[] = [];
    if (effects.rotation && effects.rotation !== 0) {
        transforms.push(`rotate(${effects.rotation}deg)`);
    }
    if (effects.scale && effects.scale !== 1) {
        transforms.push(`scale(${effects.scale})`);
    }
    if (effects.skewX && effects.skewX !== 0) {
        transforms.push(`skewX(${effects.skewX}deg)`);
    }
    if (effects.skewY && effects.skewY !== 0) {
        transforms.push(`skewY(${effects.skewY}deg)`);
    }
    if (transforms.length > 0) {
        style.transform = transforms.join(' ');
    }

    // Visual Properties
    if (effects.opacity !== undefined && effects.opacity !== 100) {
        style.opacity = effects.opacity / 100;
    }

    // Filters
    const filters: string[] = [];
    if (effects.blur && effects.blur > 0) {
        filters.push(`blur(${effects.blur}px)`);
    }
    if (filters.length > 0) {
        style.filter = filters.join(' ');
    }

    // Smooth transitions for all effects
    style.transition = 'all 0.3s ease';

    return style;
};

/**
 * Default effects for new elements
 */
export const getDefaultEffects = (): ElementEffects => ({
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowOffsetX: 0,
    shadowOffsetY: 5,

    outlineEnabled: false,
    outlineColor: '#6366f1',
    outlineWidth: 2,
    outlineStyle: 'solid',

    backgroundEnabled: false,
    backgroundColor: '#ffffff',
    backgroundOpacity: 100,

    rotation: 0,
    scale: 1,
    skewX: 0,
    skewY: 0,

    opacity: 100,
    borderRadius: 0,
    blur: 0
});

/**
 * Effect Presets
 */
export const EFFECT_PRESETS = {
    clean: getDefaultEffects(),

    softShadow: {
        ...getDefaultEffects(),
        shadowEnabled: true,
        shadowBlur: 20,
        shadowOffsetY: 8,
        shadowColor: 'rgba(0,0,0,0.15)'
    },

    boldOutline: {
        ...getDefaultEffects(),
        outlineEnabled: true,
        outlineWidth: 3,
        outlineColor: '#1e293b',
        outlineStyle: 'solid' as const
    },

    colorfulBackground: {
        ...getDefaultEffects(),
        backgroundEnabled: true,
        backgroundColor: '#f0f9ff',
        backgroundOpacity: 80,
        borderRadius: 12
    },

    depthEffect: {
        ...getDefaultEffects(),
        shadowEnabled: true,
        shadowBlur: 25,
        shadowOffsetY: 10,
        shadowColor: 'rgba(0,0,0,0.25)',
        outlineEnabled: true,
        outlineWidth: 1,
        outlineColor: '#e2e8f0',
        borderRadius: 8
    },

    subtleGlow: {
        ...getDefaultEffects(),
        shadowEnabled: true,
        shadowBlur: 30,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowColor: 'rgba(99,102,241,0.4)'
    }
};
