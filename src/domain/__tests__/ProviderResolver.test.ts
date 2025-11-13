import { ProviderResolver } from '../models/ProviderResolver';

describe('ProviderResolver', () => {
    let resolver: ProviderResolver;

    beforeEach(() => {
        resolver = new ProviderResolver();
    });

    describe('resolve', () => {
        it('should resolve ollama to ollama_servers_settings', () => {
            expect(resolver.resolve('ollama')).toBe('ollama_servers_settings');
        });

        it('should resolve openai to openai_api_keys_settings', () => {
            expect(resolver.resolve('openai')).toBe('openai_api_keys_settings');
        });

        it('should resolve claude to claude_api_keys_settings', () => {
            expect(resolver.resolve('claude')).toBe('claude_api_keys_settings');
        });

        it('should resolve groq to groq_api_keys_settings', () => {
            expect(resolver.resolve('groq')).toBe('groq_api_keys_settings');
        });

        it('should return input for unknown provider', () => {
            expect(resolver.resolve('unknown_provider')).toBe('unknown_provider');
        });
    });

    describe('isSupported', () => {
        it('should return true for supported providers', () => {
            expect(resolver.isSupported('ollama')).toBe(true);
            expect(resolver.isSupported('openai')).toBe(true);
            expect(resolver.isSupported('claude')).toBe(true);
        });

        it('should return false for unsupported providers', () => {
            expect(resolver.isSupported('unknown')).toBe(false);
            expect(resolver.isSupported('custom_provider')).toBe(false);
        });
    });

    describe('getSupportedProviders', () => {
        it('should return array of supported providers', () => {
            const providers = resolver.getSupportedProviders();

            expect(Array.isArray(providers)).toBe(true);
            expect(providers).toContain('ollama');
            expect(providers).toContain('openai');
            expect(providers).toContain('claude');
            expect(providers).toContain('groq');
            expect(providers).toContain('openrouter');
        });

        it('should return at least 5 providers', () => {
            const providers = resolver.getSupportedProviders();
            expect(providers.length).toBeGreaterThanOrEqual(5);
        });
    });
});
