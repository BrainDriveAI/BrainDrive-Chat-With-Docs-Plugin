import type { Services } from '../types';
import type {
    Collection,
    Document,
    ChatSession,
    ChatMessage,
    ContextRetrievalResult,
} from './pluginTypes';
import { HttpClient } from '../infrastructure/http';
import {
    CollectionRepository,
    DocumentRepository,
    ChatSessionRepository,
    RAGRepository,
    type RAGQuery,
} from '../infrastructure/repositories';

/**
 * DataRepository - Facade over specialized repositories
 *
 * @deprecated This class is maintained for backward compatibility.
 * New code should use the specialized repositories directly:
 * - CollectionRepository for collections
 * - DocumentRepository for documents
 * - ChatSessionRepository for chat sessions/messages
 * - RAGRepository for RAG search
 */
export class DataRepository {
    private collectionRepo: CollectionRepository;
    private documentRepo: DocumentRepository;
    private chatSessionRepo: ChatSessionRepository;
    private ragRepo: RAGRepository;

    constructor(apiService: Services['api'], apiBaseUrl: string) {
        // Create HttpClient (anti-corruption layer for BrainDrive API)
        const http = new HttpClient(apiService, apiBaseUrl);

        // Initialize specialized repositories
        this.collectionRepo = new CollectionRepository(http);
        this.documentRepo = new DocumentRepository(http);
        this.chatSessionRepo = new ChatSessionRepository(http);
        this.ragRepo = new RAGRepository(http);
    }

    // Delegate to CollectionRepository
    public getCollections = (): Promise<Collection[]> => {
        return this.collectionRepo.findAll();
    }

    // Delegate to DocumentRepository
    public getDocuments = async (collectionId: string): Promise<Document[]> => {
        return this.documentRepo.findByCollection(collectionId);
    }

    // Delegate to ChatSessionRepository
    public getChatSessions = async (): Promise<ChatSession[]> => {
        return this.chatSessionRepo.findAll();
    }

    // Delegate to ChatSessionRepository
    public getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
        return this.chatSessionRepo.findMessages(sessionId);
    }

    // Delegate to RAGRepository
    public getRelevantContent = async (
        query: string,
        collectionId: string,
        chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    ): Promise<ContextRetrievalResult> => {
        const ragQuery: RAGQuery = {
            query_text: query,
            collection_id: collectionId,
            chat_history: chatHistory,
            config: {
                use_chat_history: true,
                max_history_turns: 3,
                top_k: 7,
                use_hybrid: true,
                alpha: 0.5,
                use_intent_classification: true,
                query_transformation: {
                    enabled: true,
                    methods: [],
                },
                filters: {
                    min_similarity: 0.8,
                }
            }
        };
        return this.ragRepo.search(ragQuery);
    }

    // Expose repositories for direct access (migration path)
    public getCollectionRepository(): CollectionRepository {
        return this.collectionRepo;
    }

    public getDocumentRepository(): DocumentRepository {
        return this.documentRepo;
    }

    public getChatSessionRepository(): ChatSessionRepository {
        return this.chatSessionRepo;
    }

    public getRAGRepository(): RAGRepository {
        return this.ragRepo;
    }
}
