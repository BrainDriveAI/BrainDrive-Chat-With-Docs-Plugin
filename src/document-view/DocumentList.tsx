import React from 'react';

import type { Document } from '../braindrive-plugin/pluginTypes';
import { DocumentListItem } from './DocumentListItem';
import { NoDocuments } from './NoDocuments';

interface ComponentProps {
    documents: Document[];
    onDocumentDelete: (docId: string, docFileName: string) => void;
	maxHeight?: string;
}

export const DocumentList: React.FC<ComponentProps> = ({
    documents,
    onDocumentDelete,
	maxHeight = "max-h-96"
}) => {
    return (
        <div className="dlist-container">
            {documents.length === 0 ? (
                <NoDocuments />
            ) : (
              <div className={`dlist-scroll ${maxHeight} space-y-3`}>
                {documents.map((doc) => (
                  <DocumentListItem key={doc.id} document={doc} onDocumentDelete={onDocumentDelete} />
                ))}
              </div>
            )}
        </div>
    )
}
