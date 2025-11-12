import { PROVIDER_SETTINGS_ID_MAP } from '../../constants';

/**
 * ProviderResolver - Single Responsibility: Map provider name to settings ID
 *
 * Pure function that resolves provider names to their corresponding settings IDs.
 * Uses PROVIDER_SETTINGS_ID_MAP constant for mapping.
 */
export class ProviderResolver {
    /**
     * Resolve provider name to settings ID
     * @param providerName - Provider name (e.g., 'ollama', 'openai')
     * @returns Settings ID (e.g., 'ollama_servers_settings')
     */
    resolve(providerName: string): string {
        return PROVIDER_SETTINGS_ID_MAP[providerName] || providerName;
    }

    /**
     * Check if provider is supported
     * @param providerName - Provider name to check
     * @returns True if provider has a mapping
     */
    isSupported(providerName: string): boolean {
        return providerName in PROVIDER_SETTINGS_ID_MAP;
    }

    /**
     * Get all supported providers
     * @returns Array of supported provider names
     */
    getSupportedProviders(): string[] {
        return Object.keys(PROVIDER_SETTINGS_ID_MAP);
    }
}
