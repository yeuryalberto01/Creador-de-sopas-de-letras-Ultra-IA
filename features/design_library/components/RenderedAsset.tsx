import React from 'react';
import { DraggableElement } from '../../../components/editor/DraggableElement';
import { DesignAssetInstance, PuzzleTheme } from '../../../types';

interface RenderedAssetProps {
    instance: DesignAssetInstance;
    isEditMode: boolean;
    isSelected: boolean;
    onSelect: (id: string | null) => void;
    onDrag: (id: string, x: number, y: number) => void;
    themeData: PuzzleTheme | undefined;
}

export const RenderedAsset: React.FC<RenderedAssetProps> = ({
    instance,
    isEditMode,
    isSelected,
    onSelect,
    onDrag,
    themeData
}) => {
    // Basic Style for the SVG container
    const style: React.CSSProperties = {
        width: instance.width,
        height: instance.height,
        position: 'absolute',
        left: instance.x,
        top: instance.y,
        transform: instance.rotation ? `rotate(${instance.rotation}deg)` : 'none',
        // THEME ADAPTATION: Set CSS variables or color
        color: themeData?.primaryColor || 'black',
        '--primary-color': themeData?.primaryColor || 'black',
        '--secondary-color': themeData?.secondaryColor || 'gray'
    } as React.CSSProperties;

    return (
        <DraggableElement
            id={instance.id}
            isEditMode={isEditMode}
            isSelected={isSelected}
            onSelect={onSelect}
            onDrag={onDrag}
            style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} // Initial position is handled by parent or layout logic?
        // Wait, DraggableElement usually handles the positioning via style or transform.
        // But here "instance" has x,y. 
        // If DraggableElement expects us to pass the position via styles to IT, we should do that.
        // Let's look at DraggableElement usage in properties_panel or classic_template.
        >
            <div
                style={style}
                className={`design-asset-instance ${instance.isAdaptable ? 'smart-adapt' : ''}`}
                dangerouslySetInnerHTML={{ __html: instance.svgContent || '' }}
            />
        </DraggableElement>
    );
};
