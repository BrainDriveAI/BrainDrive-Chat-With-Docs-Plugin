import type { ModelInfo } from '../../collection-chat-view/chatViewTypes';

/**
 * FallbackModelSelector - Single Responsibility: Select fallback model when primary unavailable
 *
 * Pure function that selects appropriate fallback model based on preferences.
 */
export class FallbackModelSelector {
    /**
     * Select first available model from list
     * @param models - Available models
     * @returns First model or null if none available
     */
    selectFirst(models: ModelInfo[]): ModelInfo | null {
        return models.length > 0 ? models[0] : null;
    }

    /**
     * Select model by name, fallback to first if not found
     * @param models - Available models
     * @param preferredName - Preferred model name
     * @returns Matching model, first model, or null
     */
    selectByName(models: ModelInfo[], preferredName: string): ModelInfo | null {
        if (models.length === 0) {
            return null;
        }

        const match = models.find(m => m.name === preferredName);
        return match || models[0];
    }

    /**
     * Select model by provider, fallback to first if not found
     * @param models - Available models
     * @param preferredProvider - Preferred provider name
     * @returns Matching model, first model, or null
     */
    selectByProvider(models: ModelInfo[], preferredProvider: string): ModelInfo | null {
        if (models.length === 0) {
            return null;
        }

        const match = models.find(m => m.provider === preferredProvider);
        return match || models[0];
    }

    /**
     * Select model by provider and name, fallback to first if not found
     * @param models - Available models
     * @param preferredProvider - Preferred provider
     * @param preferredName - Preferred model name
     * @returns Matching model, first model, or null
     */
    selectByProviderAndName(
        models: ModelInfo[],
        preferredProvider: string,
        preferredName: string
    ): ModelInfo | null {
        if (models.length === 0) {
            return null;
        }

        const match = models.find(
            m => m.provider === preferredProvider && m.name === preferredName
        );

        return match || models[0];
    }
}
