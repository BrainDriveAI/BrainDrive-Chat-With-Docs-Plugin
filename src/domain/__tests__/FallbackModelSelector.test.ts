import { FallbackModelSelector } from '../models/FallbackModelSelector';
import type { ModelInfo } from '../../collection-chat-view/chatViewTypes';

describe('FallbackModelSelector', () => {
    let selector: FallbackModelSelector;
    let testModels: ModelInfo[];

    beforeEach(() => {
        selector = new FallbackModelSelector();
        testModels = [
            {
                name: 'llama2:7b',
                provider: 'ollama',
                providerId: 'ollama_servers_settings',
                serverId: 'server-1',
                serverName: 'Local Ollama',
            },
            {
                name: 'gpt-4',
                provider: 'openai',
                providerId: 'openai_api_keys_settings',
                serverId: 'server-2',
                serverName: 'OpenAI',
            },
            {
                name: 'claude-3',
                provider: 'claude',
                providerId: 'claude_api_keys_settings',
                serverId: 'server-3',
                serverName: 'Claude',
            },
        ];
    });

    describe('selectFirst', () => {
        it('should return first model from list', () => {
            const result = selector.selectFirst(testModels);
            expect(result).toEqual(testModels[0]);
            expect(result?.name).toBe('llama2:7b');
        });

        it('should return null for empty list', () => {
            const result = selector.selectFirst([]);
            expect(result).toBeNull();
        });
    });

    describe('selectByName', () => {
        it('should return model matching preferred name', () => {
            const result = selector.selectByName(testModels, 'gpt-4');
            expect(result).toEqual(testModels[1]);
            expect(result?.provider).toBe('openai');
        });

        it('should fallback to first model if name not found', () => {
            const result = selector.selectByName(testModels, 'non-existent-model');
            expect(result).toEqual(testModels[0]);
        });

        it('should return null for empty list', () => {
            const result = selector.selectByName([], 'gpt-4');
            expect(result).toBeNull();
        });
    });

    describe('selectByProvider', () => {
        it('should return model matching preferred provider', () => {
            const result = selector.selectByProvider(testModels, 'claude');
            expect(result).toEqual(testModels[2]);
            expect(result?.name).toBe('claude-3');
        });

        it('should fallback to first model if provider not found', () => {
            const result = selector.selectByProvider(testModels, 'groq');
            expect(result).toEqual(testModels[0]);
        });

        it('should return null for empty list', () => {
            const result = selector.selectByProvider([], 'ollama');
            expect(result).toBeNull();
        });
    });

    describe('selectByProviderAndName', () => {
        it('should return model matching both provider and name', () => {
            const result = selector.selectByProviderAndName(testModels, 'openai', 'gpt-4');
            expect(result).toEqual(testModels[1]);
        });

        it('should fallback to first if provider matches but name does not', () => {
            const result = selector.selectByProviderAndName(testModels, 'openai', 'gpt-3.5');
            expect(result).toEqual(testModels[0]);
        });

        it('should fallback to first if name matches but provider does not', () => {
            const result = selector.selectByProviderAndName(testModels, 'groq', 'gpt-4');
            expect(result).toEqual(testModels[0]);
        });

        it('should fallback to first if neither matches', () => {
            const result = selector.selectByProviderAndName(testModels, 'groq', 'mixtral');
            expect(result).toEqual(testModels[0]);
        });

        it('should return null for empty list', () => {
            const result = selector.selectByProviderAndName([], 'ollama', 'llama2');
            expect(result).toBeNull();
        });
    });
});
