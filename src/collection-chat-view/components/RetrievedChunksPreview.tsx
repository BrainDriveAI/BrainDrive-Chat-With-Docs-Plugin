import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DocumentChunk, IntentResponse } from '../../braindrive-plugin/pluginTypes';

interface RetrievedChunksPreviewProps {
  chunks: DocumentChunk[];
  intent?: IntentResponse | null;
  metadata?: Record<string, any>;
}

const truncate = (text: string, max = 280) => {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max) + '…';
};

const getChunkLabel = (chunk: DocumentChunk, index: number) => {
  const idx = typeof chunk.chunk_index === 'number' ? `#${chunk.chunk_index}` : `#${index}`;
  return `Excerpt ${idx}`;
};

const RetrievedChunksPreview: React.FC<RetrievedChunksPreviewProps> = ({ chunks, intent, metadata }) => {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return null;
  }

  return (
    <div className="retrieved-chunks-preview">
      <div className="retrieved-chunks-header">
        {intent && (
          <div className="retrieved-intent">
            <div className="retrieved-intent-type">Intent: <strong>{intent.type}</strong></div>
            {intent.reasoning && (
              <div className="retrieved-intent-reasoning">{intent.reasoning}</div>
            )}
          </div>
        )}
        {metadata && Array.isArray(metadata.transformed_queries) && metadata.transformed_queries.length > 0 && (
          <div className="retrieved-transformed-queries">
            <div className="retrieved-queries-title">Transformed queries:</div>
            <ul className="retrieved-queries-list">
              {metadata.transformed_queries.slice(0, 5).map((q: string, i: number) => (
                <li key={i} className="retrieved-query-item">{q}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="retrieved-chunks-list">
        {chunks.map((chunk, i) => (
          <div key={chunk.id || i} className="retrieved-chunk-item">
            <div className="retrieved-chunk-header">
              <span className="retrieved-chunk-source">{getChunkLabel(chunk, i)}</span>
            </div>
            <div className="retrieved-chunk-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {truncate(chunk.content, 1200)}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RetrievedChunksPreview;


