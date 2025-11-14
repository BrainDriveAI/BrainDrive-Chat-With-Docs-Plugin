import React from "react";
import { ChevronRight } from 'lucide-react';
import { type Collection, CollectionViewType } from './collectionViewTypes';
import { formatDate } from "../utils";

interface ComponentProps {
    collections: Collection[];
    onCollectionSelect: (collection: Collection) => void;
    viewMode: CollectionViewType;
    maxHeight?: string;
}

export const CollectionsList: React.FC<ComponentProps> = ({
    collections,
    onCollectionSelect,
    viewMode,
    maxHeight = "max-h-96"
}) => {
    const renderListItem = (collection: Collection) => {
        const collectionIndicatorStyle = {
            backgroundColor: collection.color
        };
        
        return (
            <li
                key={collection.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onCollectionSelect(collection)}
            >
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <div
                            className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                            style={collectionIndicatorStyle}
                            aria-label="Collection color indicator"
                        />
                        <div>
                            <p className="text-sm font-medium collection-item-title">
                                {collection.name}
                            </p>
                            <p className="text-sm collection-item-description">
                                {collection.description || 'No description'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-start space-y-1 text-left">
                        <span className="text-xs collection-item-meta">{collection.document_count || 0} documents</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs collection-item-meta">
                                {formatDate(collection.created_at)}
                            </span>
                            <ChevronRight className="h-4 w-4 collection-item-meta transition-colors" />
                        </div>
                    </div>
                </div>
            </li>
        );
    };

    const renderGridItem = (collection: Collection) => {
        const collectionIndicatorStyle = {
            backgroundColor: collection.color
        };

        return (
            <div
                key={collection.id}
                className="collection-list-item rounded-lg border hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => onCollectionSelect(collection)}
            >
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div
                            className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                            style={collectionIndicatorStyle}
                            aria-label="Collection color indicator"
                        />
                        <h3 className="text-lg font-medium collection-item-title">
                            {collection.name}
                        </h3>
                    </div>
                    <p className="text-sm collection-item-description mb-4 line-clamp-2">
                        {collection.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between text-sm collection-item-meta">
                        <span className="font-medium collection-item-title">
                            {collection.document_count || 0} documents
                        </span>
                        <span className="collection-item-meta">{formatDate(collection.created_at)}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (viewMode === CollectionViewType.GRID) {
        return (
            <div className={`h-full ${maxHeight} overflow-y-auto overflow-x-hidden collection-list-bg`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                    {collections.map((collection) => renderGridItem(collection))}
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full ${maxHeight} overflow-y-auto collection-list-bg`}>
            <ul id="collections-list" className="divide-y collection-list-divider collection-list-bg">
                {collections.map((collection) => renderListItem(collection))}
            </ul>
        </div>
    );
};
