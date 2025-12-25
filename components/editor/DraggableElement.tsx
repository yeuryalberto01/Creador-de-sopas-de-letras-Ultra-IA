
import React, { useRef, useState, useEffect } from 'react';
import { EditorElementId } from './types';

interface DraggableElementProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onSelect' | 'onDoubleClick'> {
    id: EditorElementId;
    isSelected: boolean;
    onSelect: (id: EditorElementId) => void;
    children: React.ReactNode;
    isEditMode: boolean;
    onDrag?: (id: EditorElementId, x: number, y: number) => void;
    onDoubleClick?: () => void;
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
    id,
    isSelected,
    onSelect,
    children,
    className = '',
    style = {},
    isEditMode,
    onDrag,
    onDoubleClick,
    ...props
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
            onDoubleClick={(e) => {
                if (isEditMode && onDoubleClick) {
                    e.stopPropagation();
                    onDoubleClick();
                }
            }}
            className={`group relative transition-all duration-200 ${className} 
                ${isSelected
                    ? 'ring-2 ring-indigo-500 ring-offset-2 cursor-move z-50'
                    : 'hover:outline-2 hover:outline-dashed hover:outline-indigo-400 hover:bg-indigo-50/10 cursor-pointer z-10'
                }
            `}
            style={{
                ...style,
                zIndex: isSelected ? 50 : (isDragging ? 40 : 10),
                cursor: isDragging ? 'grabbing' : (isSelected ? 'grab' : 'pointer'),
                transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : undefined
            }}
            {...props}
        >
            {children}

            {/* Smart Label - Visible ONLY on Hover or Selection, not just edit mode */}
            {isSelected && (
                <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 
                    bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded shadow-sm 
                    font-mono uppercase tracking-wider whitespace-nowrap transition-opacity duration-200 pointer-events-none
                    opacity-100
                `}>
                    {id}
                </div>
            )}

            {/* Selection Indicators (Corners) - Visible only on Selection */}
            {isSelected && (
                <>
                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125" />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125" />
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125" />
                </>
            )}

            {/* Hover Hint Corners (Subtle corners that appear on hover if not selected) */}
            {!isSelected && isEditMode && (
                <>
                    <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
            )}
        </div>
    );
};
