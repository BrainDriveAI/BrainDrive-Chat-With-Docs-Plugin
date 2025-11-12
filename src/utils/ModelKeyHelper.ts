import { ModelInfo } from '@/types';

/**
 * Utility for generating and managing model keys.
 * Model keys uniquely identify a model by combining server and model name.
 */
export class ModelKeyHelper {
  /**
   * Generate a model key from model name and server name.
   * @param modelName - The model name
   * @param serverName - The server name
   * @returns Composite key in format "serverName:::modelName"
   */
  static getModelKey(modelName?: string | null, serverName?: string | null): string {
    const safeModel = (modelName || '').trim();
    const safeServer = (serverName || '').trim();
    return `${safeServer}:::${safeModel}`;
  }

  /**
   * Generate a model key from a ModelInfo object.
   * @param model - The model info object
   * @returns Composite key in format "serverName:::modelName", or empty string if model is null
   */
  static getModelKeyFromInfo(model: ModelInfo | null): string {
    if (!model) {
      return '';
    }
    return ModelKeyHelper.getModelKey(model.name, model.serverName);
  }
}
