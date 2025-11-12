import { CollectionRepository } from '../repositories/CollectionRepository';
import type { HttpClient } from '../http/HttpClient';
import type { Collection } from '../../braindrive-plugin/pluginTypes';

describe('CollectionRepository', () => {
    let mockHttpClient: jest.Mocked<HttpClient>;
    let repository: CollectionRepository;

    beforeEach(() => {
        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        } as any;

        repository = new CollectionRepository(mockHttpClient);
    });

    describe('findAll', () => {
        it('should fetch all collections', async () => {
            const mockCollections: Collection[] = [
                { id: '1', name: 'Collection 1', description: 'Test 1', created_at: '2024-01-01' },
                { id: '2', name: 'Collection 2', description: 'Test 2', created_at: '2024-01-02' },
            ];

            mockHttpClient.get.mockResolvedValue(mockCollections);

            const result = await repository.findAll();

            expect(mockHttpClient.get).toHaveBeenCalledWith('/collections/');
            expect(result).toEqual(mockCollections);
        });
    });

    describe('findById', () => {
        it('should fetch collection by id', async () => {
            const mockCollection: Collection = {
                id: 'coll-123',
                name: 'Test Collection',
                description: 'Test description',
                created_at: '2024-01-01',
            };

            mockHttpClient.get.mockResolvedValue(mockCollection);

            const result = await repository.findById('coll-123');

            expect(mockHttpClient.get).toHaveBeenCalledWith('/collections/coll-123');
            expect(result).toEqual(mockCollection);
        });
    });

    describe('create', () => {
        it('should create a new collection', async () => {
            const newCollection: Partial<Collection> = {
                name: 'New Collection',
                description: 'New description',
            };

            const createdCollection: Collection = {
                id: 'coll-456',
                name: 'New Collection',
                description: 'New description',
                created_at: '2024-01-03',
            };

            mockHttpClient.post.mockResolvedValue(createdCollection);

            const result = await repository.create(newCollection);

            expect(mockHttpClient.post).toHaveBeenCalledWith('/collections/', newCollection);
            expect(result).toEqual(createdCollection);
        });
    });

    describe('update', () => {
        it('should update existing collection', async () => {
            const updates: Partial<Collection> = {
                name: 'Updated Name',
                description: 'Updated description',
            };

            const updatedCollection: Collection = {
                id: 'coll-123',
                name: 'Updated Name',
                description: 'Updated description',
                created_at: '2024-01-01',
            };

            mockHttpClient.put.mockResolvedValue(updatedCollection);

            const result = await repository.update('coll-123', updates);

            expect(mockHttpClient.put).toHaveBeenCalledWith('/collections/coll-123', updates);
            expect(result).toEqual(updatedCollection);
        });
    });

    describe('delete', () => {
        it('should delete collection by id', async () => {
            mockHttpClient.delete.mockResolvedValue(undefined);

            await repository.delete('coll-123');

            expect(mockHttpClient.delete).toHaveBeenCalledWith('/collections/coll-123');
        });
    });
});
