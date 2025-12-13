import { PuzzleConfig } from '../../types';

/**
 * Returns the CSS properties for an element based on the configuration's layout.
 * Used for "Free Layout" mode where elements can be dragged around.
 * 
 * @param config - The puzzle configuration object
 * @param id - The ID of the element (e.g., 'title', 'grid', 'wordList')
 * @returns React.CSSProperties with absolute positioning if applicable
 */
export const getElementLayout = (config: PuzzleConfig, id: string): React.CSSProperties => {
    if (config.isFreeLayout && config.layout?.[id]) {
        return {
            position: 'absolute',
            left: `${config.layout[id].x}px`,
            top: `${config.layout[id].y}px`,
            zIndex: 20,
            width: 'auto',
            maxWidth: '100%'
        };
    }
    return {};
};
