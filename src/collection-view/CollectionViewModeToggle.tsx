import React from "react";
import { LayoutGrid, LayoutList } from 'lucide-react';

import { CollectionViewType } from './collectionViewTypes';

interface ComponentProps {
    currentViewMode: CollectionViewType;
    onViewModeChange: (view: CollectionViewType) => void;
}

export const CollectionViewModeToggle: React.FC<ComponentProps> = ({currentViewMode, onViewModeChange}) => {
    return (
        <div className="cv-toggle">
            <button
                onClick={() => onViewModeChange(CollectionViewType.LIST)}
                className={`cv-toggle-btn ${currentViewMode === CollectionViewType.LIST ? 'cv-toggle-btn--active' : ''}`}
                aria-label="List view"
            >
                <LayoutList className="h-4 w-4" />
            </button>
            <button
                onClick={() => onViewModeChange(CollectionViewType.GRID)}
                className={`cv-toggle-btn ${currentViewMode === CollectionViewType.GRID ? 'cv-toggle-btn--active' : ''}`}
                aria-label="Grid view"
            >
                <LayoutGrid className="h-4 w-4" />
            </button>
        </div>
    )
}
