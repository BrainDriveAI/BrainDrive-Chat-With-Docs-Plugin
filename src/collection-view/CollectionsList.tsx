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
                            <p className="text-sm font-medium dark:text-gray-100">
                                {collection.name}
                            </p>
                            <p className="text-sm dark:text-gray-400">
                                {collection.description || 'No description'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-start space-y-1 text-left">
                        <span className="text-xs dark:text-gray-400">{collection.document_count || 0} documents</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs dark:text-gray-400">
                                {formatDate(collection.created_at)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
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
                className="dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => onCollectionSelect(collection)}
            >
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div
                            className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                            style={collectionIndicatorStyle}
                            aria-label="Collection color indicator"
                        />
                        <h3 className="text-lg font-medium dark:text-gray-100">
                            {collection.name}
                        </h3>
                    </div>
                    <p className="text-sm dark:text-gray-400 mb-4 line-clamp-2">
                        {collection.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between text-sm dark:text-gray-500">
                        <span className="font-medium dark:text-gray-300">
                            {collection.document_count || 0} documents
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">{formatDate(collection.created_at)}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (viewMode === CollectionViewType.GRID) {
        return (
            <div className={`h-full ${maxHeight} overflow-y-auto overflow-x-hidden dark:bg-gray-950`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                    {collections.map((collection) => renderGridItem(collection))}
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full ${maxHeight} overflow-y-auto dark:bg-gray-950`}>
            <ul id="collections-list" className="divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
                {collections.map((collection) => renderListItem(collection))}
            </ul>
        </div>
    );
};
