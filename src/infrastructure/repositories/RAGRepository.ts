import type { ContextRetrievalResult } from '../../braindrive-plugin/pluginTypes';
import type { HttpClient } from '../http/HttpClient';

/**
 * RAG search query structure
 */
export interface RAGQuery {
    query_text: string;
    collection_id: string;
    chat_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    config: RAGSearchConfig;
}

/**
 * RAG search configuration
 */
export interface RAGSearchConfig {
    use_chat_history?: boolean;
    max_history_turns?: number;
    top_k?: number;
    use_hybrid?: boolean;
    alpha?: number;
    use_intent_classification?: boolean;
    query_transformation?: {
        enabled: boolean;
        methods?: string[];
    };
    filters?: {
        min_similarity?: number;
    };
}

/**
 * RAGRepository - Single Responsibility: RAG search I/O operations
 *
 * Handles all HTTP communication for RAG (Retrieval Augmented Generation) search.
 * No business logic, just data access.
 */
export class RAGRepository {
    constructor(private http: HttpClient) {}

    async search(query: RAGQuery): Promise<ContextRetrievalResult> {
        return this.http.post<ContextRetrievalResult>('/search/', query);
    }
}
