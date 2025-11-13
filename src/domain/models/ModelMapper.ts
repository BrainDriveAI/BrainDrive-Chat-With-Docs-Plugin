import type { ModelInfo } from '../../collection-chat-view/chatViewTypes';
import { ProviderResolver } from './ProviderResolver';

/**
 * ModelMapper - Single Responsibility: Map raw API model data to domain ModelInfo
 *
 * Pure function that transforms API response models into standardized ModelInfo objects.
 */
export class ModelMapper {
    private providerResolver: ProviderResolver;

    constructor(providerResolver: ProviderResolver) {
        this.providerResolver = providerResolver;
    }

    /**
     * Map raw API model to ModelInfo
     * @param rawModel - Raw model data from API
     * @returns Standardized ModelInfo object
     */
    mapToModelInfo(rawModel: any): ModelInfo {
        const provider = rawModel.provider || 'ollama';
        const providerId = this.providerResolver.resolve(provider);
        const serverId = rawModel.server_id || rawModel.serverId || 'unknown';
        const serverName = rawModel.server_name || rawModel.serverName || 'Unknown Server';
        const name = rawModel.name || rawModel.id || '';

        return {
            name,
            provider,
            providerId,
            serverName,
            serverId,
        };
    }

    /**
     * Map array of raw models to ModelInfo array
     * @param rawModels - Array of raw model data
     * @returns Array of ModelInfo objects
     */
    mapToModelInfoArray(rawModels: any[]): ModelInfo[] {
        if (!Array.isArray(rawModels)) {
            return [];
        }

        return rawModels.map(m => this.mapToModelInfo(m));
    }

    /**
     * Extract models array from API response
     * Handles various response formats:
     * - { models: [...] }
     * - { data: { models: [...] } }
     * - [...]
     */
    extractModelsFromResponse(response: any): any[] {
        if (!response) {
            return [];
        }

        // Check for response.models
        if (response.models && Array.isArray(response.models)) {
            return response.models;
        }

        // Check for response.data.models
        if (response.data?.models && Array.isArray(response.data.models)) {
            return response.data.models;
        }

        // Direct array response
        if (Array.isArray(response)) {
            return response;
        }

        return [];
    }
}
