import { HttpClient } from '../http/HttpClient';
import type { Services } from '../../types';

describe('HttpClient', () => {
    const baseUrl = 'http://localhost:8000';
    let mockApiService: Services['api'];

    beforeEach(() => {
        // Reset mocks before each test
        mockApiService = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        } as any;
    });

    describe('with BrainDrive API service', () => {
        it('should use API service for GET requests', async () => {
            const mockData = { id: '1', name: 'Test' };
            (mockApiService.get as jest.Mock).mockResolvedValue(mockData);

            const httpClient = new HttpClient(mockApiService, baseUrl);
            const result = await httpClient.get('/test');

            expect(mockApiService.get).toHaveBeenCalledWith('http://localhost:8000/test');
            expect(result).toEqual(mockData);
        });

        it('should use API service for POST requests', async () => {
            const mockData = { id: '1', name: 'Created' };
            const postData = { name: 'New Item' };
            (mockApiService.post as jest.Mock).mockResolvedValue(mockData);

            const httpClient = new HttpClient(mockApiService, baseUrl);
            const result = await httpClient.post('/test', postData);

            expect(mockApiService.post).toHaveBeenCalledWith('http://localhost:8000/test', postData);
            expect(result).toEqual(mockData);
        });

        it('should use API service for PUT requests', async () => {
            const mockData = { id: '1', name: 'Updated' };
            const putData = { name: 'Updated Item' };
            (mockApiService.put as jest.Mock).mockResolvedValue(mockData);

            const httpClient = new HttpClient(mockApiService, baseUrl);
            const result = await httpClient.put('/test/1', putData);

            expect(mockApiService.put).toHaveBeenCalledWith('http://localhost:8000/test/1', putData);
            expect(result).toEqual(mockData);
        });

        it('should use API service for DELETE requests', async () => {
            (mockApiService.delete as jest.Mock).mockResolvedValue({});

            const httpClient = new HttpClient(mockApiService, baseUrl);
            const result = await httpClient.delete('/test/1');

            expect(mockApiService.delete).toHaveBeenCalledWith('http://localhost:8000/test/1');
            expect(result).toEqual({});
        });
    });

    describe('without BrainDrive API service (fallback to fetch)', () => {
        let httpClient: HttpClient;

        beforeEach(() => {
            httpClient = new HttpClient(undefined, baseUrl);
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should fallback to fetch for GET requests', async () => {
            const mockData = { id: '1', name: 'Test' };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockData,
            });

            const result = await httpClient.get('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/test',
                expect.objectContaining({
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            expect(result).toEqual(mockData);
        });

        it('should fallback to fetch for POST requests', async () => {
            const mockData = { id: '1', name: 'Created' };
            const postData = { name: 'New Item' };
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockData,
            });

            const result = await httpClient.post('/test', postData);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/test',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData),
                })
            );
            expect(result).toEqual(mockData);
        });

        it('should handle 204 No Content responses', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                status: 204,
            });

            const result = await httpClient.delete('/test/1');

            expect(result).toEqual({});
        });

        it('should throw error when fetch fails', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 404,
            });

            await expect(httpClient.get('/not-found')).rejects.toThrow(
                'HTTP GET http://localhost:8000/not-found failed: 404'
            );
        });
    });
});
