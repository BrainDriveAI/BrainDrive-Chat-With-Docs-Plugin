import { ModelKeyHelper } from './ModelKeyHelper';
import { ModelInfo } from '@/types';

describe('ModelKeyHelper', () => {
  describe('getModelKey', () => {
    it('should generate key from model and server name', () => {
      const result = ModelKeyHelper.getModelKey('gpt-4', 'openai');
      expect(result).toBe('openai:::gpt-4');
    });

    it('should handle null values', () => {
      const result = ModelKeyHelper.getModelKey(null, null);
      expect(result).toBe(':::');
    });

    it('should handle undefined values', () => {
      const result = ModelKeyHelper.getModelKey(undefined, undefined);
      expect(result).toBe(':::');
    });

    it('should trim whitespace', () => {
      const result = ModelKeyHelper.getModelKey('  gpt-4  ', '  openai  ');
      expect(result).toBe('openai:::gpt-4');
    });

    it('should handle empty strings', () => {
      const result = ModelKeyHelper.getModelKey('', '');
      expect(result).toBe(':::');
    });

    it('should handle mixed null and valid values', () => {
      const result1 = ModelKeyHelper.getModelKey('gpt-4', null);
      expect(result1).toBe(':::gpt-4');

      const result2 = ModelKeyHelper.getModelKey(null, 'openai');
      expect(result2).toBe('openai:::');
    });
  });

  describe('getModelKeyFromInfo', () => {
    it('should generate key from ModelInfo object', () => {
      const model: ModelInfo = {
        name: 'gpt-4',
        serverName: 'openai',
        provider: 'OpenAI',
        providerId: '1',
        serverId: '1',
      };

      const result = ModelKeyHelper.getModelKeyFromInfo(model);
      expect(result).toBe('openai:::gpt-4');
    });

    it('should return empty string for null model', () => {
      const result = ModelKeyHelper.getModelKeyFromInfo(null);
      expect(result).toBe('');
    });

    it('should handle model with empty name and serverName', () => {
      const model: ModelInfo = {
        name: '',
        serverName: '',
        provider: 'OpenAI',
        providerId: '1',
        serverId: '1',
      };

      const result = ModelKeyHelper.getModelKeyFromInfo(model);
      expect(result).toBe(':::');
    });

    it('should trim whitespace from model properties', () => {
      const model: ModelInfo = {
        name: '  gpt-4  ',
        serverName: '  openai  ',
        provider: 'OpenAI',
        providerId: '1',
        serverId: '1',
      };

      const result = ModelKeyHelper.getModelKeyFromInfo(model);
      expect(result).toBe('openai:::gpt-4');
    });
  });
});
