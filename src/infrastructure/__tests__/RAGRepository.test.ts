import { RAGRepository, type RAGQuery } from '../repositories/RAGRepository';
import type { HttpClient } from '../http/HttpClient';
import type { ContextRetrievalResult } from '../../braindrive-plugin/pluginTypes';

describe('RAGRepository', () => {
    let mockHttpClient: jest.Mocked<HttpClient>;
    let repository: RAGRepository;

    beforeEach(() => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        } as any;

        repository = new RAGRepository(mockHttpClient);
    });

    describe('search', () => {
        it('should perform RAG search with query', async () => {
            const query: RAGQuery = {
                query_text: 'What is machine learning?',
                collection_id: 'coll-123',
                chat_history: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi! How can I help?' },
                ],
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
                    },
                },
            };

            const mockResult: ContextRetrievalResult = {
                chunks: [
                    {
                        content: 'Machine learning is a subset of AI...',
                        metadata: { source: 'doc1.pdf', page: 1 },
                        score: 0.95,
                    },
                    {
                        content: 'ML algorithms learn patterns from data...',
                        metadata: { source: 'doc2.pdf', page: 3 },
                        score: 0.87,
                    },
                ],
                query_used: 'What is machine learning?',
                total_results: 2,
            };

            mockHttpClient.post.mockResolvedValue(mockResult);

            const result = await repository.search(query);

            expect(mockHttpClient.post).toHaveBeenCalledWith('/search/', query);
            expect(result).toEqual(mockResult);
            expect(result.chunks).toHaveLength(2);
            expect(result.chunks[0].score).toBe(0.95);
        });

        it('should perform RAG search without chat history', async () => {
            const query: RAGQuery = {
                query_text: 'Explain neural networks',
                collection_id: 'coll-456',
                config: {
                    top_k: 5,
                    use_hybrid: false,
                },
            };

            const mockResult: ContextRetrievalResult = {
                chunks: [
                    {
                        content: 'Neural networks are computing systems...',
                        metadata: { source: 'nn.pdf', page: 1 },
                        score: 0.92,
                    },
                ],
                query_used: 'Explain neural networks',
                total_results: 1,
            };

            mockHttpClient.post.mockResolvedValue(mockResult);

            const result = await repository.search(query);

            expect(mockHttpClient.post).toHaveBeenCalledWith('/search/', query);
            expect(result).toEqual(mockResult);
        });

        it('should return empty chunks when no results found', async () => {
            const query: RAGQuery = {
                query_text: 'Non-existent topic xyz123',
                collection_id: 'coll-789',
                config: {
                    top_k: 7,
                },
            };

            const mockResult: ContextRetrievalResult = {
                chunks: [],
                query_used: 'Non-existent topic xyz123',
                total_results: 0,
            };

            mockHttpClient.post.mockResolvedValue(mockResult);

            const result = await repository.search(query);

            expect(result.chunks).toHaveLength(0);
            expect(result.total_results).toBe(0);
        });
    });
});
