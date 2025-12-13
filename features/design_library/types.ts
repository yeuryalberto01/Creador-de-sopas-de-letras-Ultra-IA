
export type AssetType = 'vignette' | 'textbox' | 'divider' | 'decoration' | 'corner';

export interface DesignAsset {
    id: string;
    name: string;
    type: AssetType;
    category: string; // e.g., 'Floral', 'Tech', 'Geometric'

    // Content
    // We support inline SVG for "Smart Adaptation" (easy color replacement)
    // OR image URLs for complex bitmap assets.
    svgContent?: string;
    imageUrl?: string;

    // Smart Adaptation Hints
    // If true, we replace 'currentColor' or specific classes with theme colors
    isAdaptable: boolean;

    // Layout Hints
    defaultWidth?: string; // e.g. "100px" or "100%"
    defaultHeight?: string;
    aspectRatio?: number;
}

export interface AssetCategory {
    id: string;
    label: string;
    assets: DesignAsset[];
}
