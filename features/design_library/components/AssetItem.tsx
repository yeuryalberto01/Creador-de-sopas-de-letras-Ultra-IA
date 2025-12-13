import React from 'react';
import { DesignAsset } from '../types';

interface AssetItemProps {
    asset: DesignAsset;
    onDragStart: (e: React.DragEvent, asset: DesignAsset) => void;
}

export const AssetItem: React.FC<AssetItemProps> = ({ asset, onDragStart }) => {

    // We render the SVG preview. 
    // For the library view, we might want to force a neutral color (e.g. black or gray)
    // so it looks consistent in the panel.
    const previewStyle: React.CSSProperties = {
        width: '100%',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        cursor: 'grab',
        backgroundColor: '#fff',
        color: '#334155' // Slate-700
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, asset)}
            className="flex flex-col gap-1 p-2 hover:bg-slate-50 rounded transition-colors"
        >
            <div style={previewStyle} title={asset.name}>
                {asset.svgContent ? (
                    <div
                        style={{ width: '60px', height: '60px', color: 'currentColor' }}
                        dangerouslySetInnerHTML={{ __html: asset.svgContent }}
                    />
                ) : (
                    <img src={asset.imageUrl} alt={asset.name} className="max-w-full max-h-full object-contain" />
                )}
            </div>
            <span className="text-xs text-center font-medium text-slate-600 truncate w-full">
                {asset.name}
            </span>
        </div>
    );
};
