import { ModelMapper } from '../models/ModelMapper';
import { ProviderResolver } from '../models/ProviderResolver';
import type { ModelInfo } from '../../collection-chat-view/chatViewTypes';

describe('ModelMapper', () => {
    let mapper: ModelMapper;
    let resolver: ProviderResolver;

    beforeEach(() => {
        resolver = new ProviderResolver();
        mapper = new ModelMapper(resolver);
    });

    describe('mapToModelInfo', () => {
        it('should map raw model with all fields', () => {
            const rawModel = {
                name: 'llama2:7b',
                provider: 'ollama',
                server_id: 'server-123',
                server_name: 'Local Ollama',
            };

            const result = mapper.mapToModelInfo(rawModel);

            expect(result).toEqual({
                name: 'llama2:7b',
                provider: 'ollama',
                providerId: 'ollama_servers_settings',
                serverId: 'server-123',
                serverName: 'Local Ollama',
            });
        });

        it('should use defaults for missing fields', () => {
            const rawModel = {};

            const result = mapper.mapToModelInfo(rawModel);

            expect(result).toEqual({
                name: '',
                provider: 'ollama',
                providerId: 'ollama_servers_settings',
                serverId: 'unknown',
                serverName: 'Unknown Server',
            });
        });

        it('should handle camelCase field names', () => {
            const rawModel = {
                name: 'gpt-4',
                provider: 'openai',
                serverId: 'srv-456',
                serverName: 'OpenAI Server',
            };

            const result = mapper.mapToModelInfo(rawModel);

            expect(result.serverId).toBe('srv-456');
            expect(result.serverName).toBe('OpenAI Server');
        });

        it('should use model.id as fallback for name', () => {
            const rawModel = {
                id: 'model-id-123',
                provider: 'claude',
            };

            const result = mapper.mapToModelInfo(rawModel);

            expect(result.name).toBe('model-id-123');
        });
    });

    describe('mapToModelInfoArray', () => {
        it('should map array of raw models', () => {
            const rawModels = [
                { name: 'model-1', provider: 'ollama' },
                { name: 'model-2', provider: 'openai' },
                { name: 'model-3', provider: 'claude' },
            ];

            const result = mapper.mapToModelInfoArray(rawModels);

            expect(result).toHaveLength(3);
            expect(result[0].name).toBe('model-1');
            expect(result[1].name).toBe('model-2');
            expect(result[2].name).toBe('model-3');
        });

        it('should return empty array for non-array input', () => {
            expect(mapper.mapToModelInfoArray(null as any)).toEqual([]);
            expect(mapper.mapToModelInfoArray(undefined as any)).toEqual([]);
            expect(mapper.mapToModelInfoArray({} as any)).toEqual([]);
        });

        it('should return empty array for empty input', () => {
            expect(mapper.mapToModelInfoArray([])).toEqual([]);
        });
    });

    describe('extractModelsFromResponse', () => {
        it('should extract from response.models', () => {
            const response = {
                models: [
                    { name: 'model-1' },
                    { name: 'model-2' },
                ],
            };

            const result = mapper.extractModelsFromResponse(response);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('model-1');
        });

        it('should extract from response.data.models', () => {
            const response = {
                data: {
                    models: [
                        { name: 'model-a' },
                        { name: 'model-b' },
                    ],
                },
            };

            const result = mapper.extractModelsFromResponse(response);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('model-a');
        });

        it('should handle direct array response', () => {
            const response = [
                { name: 'model-x' },
                { name: 'model-y' },
            ];

            const result = mapper.extractModelsFromResponse(response);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('model-x');
        });

        it('should return empty array for null response', () => {
            expect(mapper.extractModelsFromResponse(null)).toEqual([]);
            expect(mapper.extractModelsFromResponse(undefined)).toEqual([]);
        });

        it('should return empty array for response without models', () => {
            const response = { data: { message: 'No models' } };
            expect(mapper.extractModelsFromResponse(response)).toEqual([]);
        });
    });
});
