
import React, { useRef, useState, useEffect } from 'react';
import { EditorElementId } from './types';

interface DraggableElementProps {
    id: EditorElementId;
    isSelected: boolean;
    onSelect: (id: EditorElementId) => void;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    isEditMode: boolean;
    onDrag?: (id: EditorElementId, x: number, y: number) => void;
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
    id,
    isSelected,
    onSelect,
    children,
    className = '',
    style = {},
    isEditMode,
    onDrag
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isEditMode) return;
        e.stopPropagation();
        onSelect(id);

        if (onDrag) {
            setIsDragging(true);
            dragStartPos.current = { x: e.clientX, y: e.clientY };
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartPos.current || !onDrag) return;

            // Calculate delta? No, we need absolute position relative to parent?
            // Actually, for now let's just emit the delta or new position.
            // But wait, the parent manages the layout state (x, y).
            // We need to know the current x,y to add delta.
            // Or we can just pass the mouse movement to the parent.

            // Simplified approach: Pass the mouse event to a global handler?
            // Better: Calculate delta here and call onDrag with new coordinates if we knew the start coordinates.
            // Since we don't have the start coordinates passed in props here (only style), 
            // we might need to change the architecture slightly or assume style.left/top are the source of truth.

            // For this iteration, let's assume the parent handles the calculation if we pass the delta?
            // The prompt said "emitting onDrag events with x and y coordinates".
            // Let's assume the parent passes the current x/y in 'style'.

            // Actually, let's just implement a simple drag handler that calls onDrag with the new position relative to the container.
            // But we need the container reference.

            // Alternative: Just pass the delta.
            // Let's look at how onDrag is defined: (id: string, x: number, y: number) => void.
            // This implies absolute coordinates.

            // Let's try to get the current position from the element's offsetLeft/Top.
            if (elementRef.current) {
                const parent = elementRef.current.offsetParent as HTMLElement;
                if (parent) {
                    const rect = parent.getBoundingClientRect();
                    const x = e.clientX - rect.left - (elementRef.current.offsetWidth / 2); // Center on mouse?
                    const y = e.clientY - rect.top - (elementRef.current.offsetHeight / 2);
                    onDrag(id, x, y);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStartPos.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onDrag, id]);

    if (!isEditMode) {
        return <div className={className} style={style}>{children}</div>;
    }

    return (
        <div
            id={id}
            ref={elementRef}
            onMouseDown={handleMouseDown}
            className={`relative transition-all duration-200 ${className} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 cursor-move' : 'hover:ring-1 hover:ring-indigo-300 cursor-pointer'}`}
            style={{
                ...style,
                zIndex: isSelected ? 50 : 10,
                cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'pointer')
            }}
        >
            {children}

            {/* Selection Indicators */}
            {isSelected && (
                <>
                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm" />
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm" />

                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-mono uppercase tracking-wider whitespace-nowrap">
                        {id}
                    </div>
                </>
            )}
        </div>
    );
};
