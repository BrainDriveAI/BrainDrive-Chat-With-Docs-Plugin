import type { ModelInfo } from '../../collection-chat-view/chatViewTypes';
import type { ApiService } from '../../types';
import { ModelMapper } from './ModelMapper';
import { ProviderResolver } from './ProviderResolver';

export interface ModelLoadResult {
    models: ModelInfo[];
    error?: string;
}

/**
 * ModelConfigLoader - Single Responsibility: Load model configurations from API
 *
 * Orchestrates loading models from /api/v1/ai/providers/all-models endpoint.
 * Delegates mapping to ModelMapper, handles errors.
 */
export class ModelConfigLoader {
    private apiService: ApiService;
    private modelMapper: ModelMapper;

    constructor(apiService: ApiService) {
        this.apiService = apiService;
        const providerResolver = new ProviderResolver();
        this.modelMapper = new ModelMapper(providerResolver);
    }

    /**
     * Load all available models from providers
     * @returns Promise<ModelLoadResult> with models array and optional error
     */
    async loadModels(): Promise<ModelLoadResult> {
        try {
            const response = await this.apiService.get('/api/v1/ai/providers/all-models');
            const rawModels = this.modelMapper.extractModelsFromResponse(response);
            const models = this.modelMapper.mapToModelInfoArray(rawModels);

            return { models };
        } catch (error: any) {
            console.error('Error loading models from all providers:', error);
            return {
                models: [],
                error: error.message || 'Failed to load models'
            };
        }
    }

    /**
     * Load models with fallback to Ollama-specific endpoint
     * This is the complex logic from CollectionChatViewShell.loadProviderSettings
     *
     * @returns Promise<ModelLoadResult>
     */
    async loadModelsWithFallback(): Promise<ModelLoadResult> {
        // Try main endpoint first
        const mainResult = await this.loadModels();

        if (mainResult.models.length > 0) {
            return mainResult;
        }

        // Fallback: Try Ollama-specific endpoint
        return this.loadOllamaFallback();
    }

    /**
     * Fallback: Load Ollama models via settings + /api/v1/ollama/models
     * This is the 150-line fallback logic from CollectionChatViewShell
     */
    private async loadOllamaFallback(): Promise<ModelLoadResult> {
        try {
            // Get Ollama server settings
            const settingsResp = await this.apiService.get('/api/v1/settings/instances', {
                params: {
                    definition_id: 'ollama_servers_settings',
                    scope: 'user',
                    user_id: 'current',
                },
            });

            let settingsData: any = null;
            if (Array.isArray(settingsResp) && settingsResp.length > 0) {
                settingsData = settingsResp[0];
            } else if (settingsResp && typeof settingsResp === 'object') {
                const obj = settingsResp as any;
                if (obj.data) {
                    settingsData = Array.isArray(obj.data) ? obj.data[0] : obj.data;
                } else {
                    settingsData = settingsResp;
                }
            }

            const fallbackModels: ModelInfo[] = [];

            if (settingsData?.value) {
                const parsedValue = typeof settingsData.value === 'string'
                    ? JSON.parse(settingsData.value)
                    : settingsData.value;

                const servers = Array.isArray(parsedValue?.servers) ? parsedValue.servers : [];

                // Load models from each Ollama server
                for (const server of servers) {
                    try {
                        const params: Record<string, string> = {
                            server_url: encodeURIComponent(server.serverAddress),
                            settings_id: 'ollama_servers_settings',
                            server_id: server.id,
                        };

                        if (server.apiKey) {
                            params.api_key = server.apiKey;
                        }

                        const modelResponse = await this.apiService.get('/api/v1/ollama/models', { params });
                        const serverModels = Array.isArray(modelResponse) ? modelResponse : [];

                        for (const m of serverModels) {
                            fallbackModels.push({
                                name: m.name,
                                provider: 'ollama',
                                providerId: 'ollama_servers_settings',
                                serverName: server.serverName,
                                serverId: server.id,
                            });
                        }
                    } catch (innerErr) {
                        console.error('Fallback: error loading Ollama models for server', server?.serverName, innerErr);
                    }
                }
            }

            return { models: fallbackModels };
        } catch (error: any) {
            console.error('Fallback: error loading Ollama settings/models:', error);
            return {
                models: [],
                error: 'Failed to load Ollama fallback models'
            };
        }
    }
}
