/**
 * @jest-environment jsdom
 */

import { StreamingChatHandler, StreamingRequest, StreamingCallbacks } from '../StreamingChatHandler';
import type { AIService } from '../../../services';
import type { ModelInfo } from '../../../collection-chat-view/chatViewTypes';

describe('StreamingChatHandler', () => {
  let mockAIService: jest.Mocked<AIService>;
  let handler: StreamingChatHandler;
  let mockCallbacks: StreamingCallbacks;

  const mockModel: ModelInfo = {
    name: 'test-model',
    provider: 'test-provider',
    providerId: 'test-provider-id',
    serverName: 'test-server',
    serverId: 'test-server-id'
  };

  beforeEach(() => {
    mockAIService = {
      sendPrompt: jest.fn().mockResolvedValue(undefined),
      cancelGeneration: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new StreamingChatHandler({ aiService: mockAIService });

    mockCallbacks = {
      onChunk: jest.fn(),
      onConversationId: jest.fn()
    };
  });

  afterEach(() => {
    handler.cleanup();
  });

  describe('sendPrompt', () => {
    const createRequest = (overrides?: Partial<StreamingRequest>): StreamingRequest => ({
      prompt: 'Test prompt',
      conversationType: 'chat',
      conversationId: null,
      selectedModel: mockModel,
      useStreaming: true,
      ...overrides
    });

    it('should send prompt to AI service', async () => {
      const request = createRequest();

      await handler.sendPrompt(request, mockCallbacks);

      expect(mockAIService.sendPrompt).toHaveBeenCalledWith(
        request.prompt,
        request.selectedModel,
        request.useStreaming,
        request.conversationId,
        request.conversationType,
        mockCallbacks.onChunk,
        mockCallbacks.onConversationId,
        request.pageContext,
        request.selectedPersona,
        expect.any(AbortController)
      );
    });

    it('should create abort controller before sending', async () => {
      const request = createRequest();

      // Mock sendPrompt to check isStreaming during execution
      mockAIService.sendPrompt.mockImplementation(async () => {
        expect(handler.isStreaming()).toBe(true);
      });

      await handler.sendPrompt(request, mockCallbacks);
    });

    it('should clear abort controller after completion', async () => {
      const request = createRequest();

      await handler.sendPrompt(request, mockCallbacks);

      expect(handler.isStreaming()).toBe(false);
      expect(handler.getAbortController()).toBeNull();
    });

    it('should clear abort controller even if error occurs', async () => {
      const request = createRequest();
      mockAIService.sendPrompt.mockRejectedValue(new Error('Test error'));

      await expect(handler.sendPrompt(request, mockCallbacks)).rejects.toThrow('Test error');

      expect(handler.isStreaming()).toBe(false);
      expect(handler.getAbortController()).toBeNull();
    });

    it('should pass all request parameters correctly', async () => {
      const request = createRequest({
        conversationId: 'conv-123',
        selectedPersona: { id: 'persona-1', name: 'Test Persona' } as any,
        pageContext: { pageId: 'page-1' }
      });

      await handler.sendPrompt(request, mockCallbacks);

      const callArgs = mockAIService.sendPrompt.mock.calls[0];
      expect(callArgs[0]).toBe(request.prompt);
      expect(callArgs[1]).toBe(request.selectedModel);
      expect(callArgs[2]).toBe(request.useStreaming);
      expect(callArgs[3]).toBe('conv-123');
      expect(callArgs[4]).toBe(request.conversationType);
      expect(callArgs[7]).toEqual({ pageId: 'page-1' });
      expect(callArgs[8]).toEqual(request.selectedPersona);
    });

    it('should call onChunk callback when provided', async () => {
      const request = createRequest();

      // Simulate chunk callback
      mockAIService.sendPrompt.mockImplementation(async (
        _prompt, _model, _streaming, _convId, _type,
        onChunk
      ) => {
        onChunk?.('chunk1');
        onChunk?.('chunk2');
      });

      await handler.sendPrompt(request, mockCallbacks);

      expect(mockCallbacks.onChunk).toHaveBeenCalledTimes(2);
      expect(mockCallbacks.onChunk).toHaveBeenNthCalledWith(1, 'chunk1');
      expect(mockCallbacks.onChunk).toHaveBeenNthCalledWith(2, 'chunk2');
    });

    it('should call onConversationId callback when provided', async () => {
      const request = createRequest();

      // Simulate conversation ID callback
      mockAIService.sendPrompt.mockImplementation(async (
        _prompt, _model, _streaming, _convId, _type,
        _onChunk, onConversationId
      ) => {
        onConversationId?.('new-conv-id');
      });

      await handler.sendPrompt(request, mockCallbacks);

      expect(mockCallbacks.onConversationId).toHaveBeenCalledWith('new-conv-id');
    });
  });

  describe('stopGeneration', () => {
    it('should abort current request if streaming', async () => {
      const request: StreamingRequest = {
        prompt: 'Test prompt',
        conversationType: 'chat',
        conversationId: 'conv-123',
        selectedModel: mockModel,
        useStreaming: true
      };

      // Mock AI service to respect abort controller
      mockAIService.sendPrompt.mockImplementation(async (_p, _m, _s, _c, _t, _oc, _oci, _pc, _sp, controller) => {
        // Simulate long-running request that respects abort
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 1000);
          controller?.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Request aborted', 'AbortError'));
          });
        });
      });

      // Start streaming
      const sendPromise = handler.sendPrompt(request, mockCallbacks);

      // Stop generation before it completes
      await handler.stopGeneration('conv-123');

      expect(handler.isStreaming()).toBe(false);

      // Wait for send to complete (it will throw)
      await expect(sendPromise).rejects.toThrow();
    });

    it('should call AI service cancelGeneration', async () => {
      await handler.stopGeneration('conv-123');

      expect(mockAIService.cancelGeneration).toHaveBeenCalledWith('conv-123');
    });

    it('should not call cancelGeneration if no conversation ID', async () => {
      await handler.stopGeneration(null);

      expect(mockAIService.cancelGeneration).not.toHaveBeenCalled();
    });

    it('should handle cancelGeneration errors gracefully', async () => {
      mockAIService.cancelGeneration.mockRejectedValue(new Error('Cancel failed'));

      await expect(handler.stopGeneration('conv-123')).resolves.not.toThrow();

      expect(mockAIService.cancelGeneration).toHaveBeenCalled();
    });

    it('should be safe to call when not streaming', async () => {
      expect(handler.isStreaming()).toBe(false);

      await expect(handler.stopGeneration('conv-123')).resolves.not.toThrow();
    });
  });

  describe('isStreaming', () => {
    it('should return false initially', () => {
      expect(handler.isStreaming()).toBe(false);
    });

    it('should return true while streaming', async () => {
      const request: StreamingRequest = {
        prompt: 'Test prompt',
        conversationType: 'chat',
        conversationId: null,
        selectedModel: mockModel,
        useStreaming: true
      };

      mockAIService.sendPrompt.mockImplementation(async () => {
        expect(handler.isStreaming()).toBe(true);
      });

      await handler.sendPrompt(request, mockCallbacks);
    });

    it('should return false after streaming completes', async () => {
      const request: StreamingRequest = {
        prompt: 'Test prompt',
        conversationType: 'chat',
        conversationId: null,
        selectedModel: mockModel,
        useStreaming: true
      };

      await handler.sendPrompt(request, mockCallbacks);

      expect(handler.isStreaming()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should abort ongoing request', async () => {
      const request: StreamingRequest = {
        prompt: 'Test prompt',
        conversationType: 'chat',
        conversationId: null,
        selectedModel: mockModel,
        useStreaming: true
      };

      // Mock AI service to respect abort controller
      mockAIService.sendPrompt.mockImplementation(async (_p, _m, _s, _c, _t, _oc, _oci, _pc, _sp, controller) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 1000);
          controller?.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Request aborted', 'AbortError'));
          });
        });
      });

      // Start streaming
      const sendPromise = handler.sendPrompt(request, mockCallbacks);

      // Cleanup before completion
      handler.cleanup();

      expect(handler.isStreaming()).toBe(false);

      await expect(sendPromise).rejects.toThrow();
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        handler.cleanup();
        handler.cleanup();
        handler.cleanup();
      }).not.toThrow();
    });

    it('should be safe to call when not streaming', () => {
      expect(handler.isStreaming()).toBe(false);

      expect(() => handler.cleanup()).not.toThrow();

      expect(handler.isStreaming()).toBe(false);
    });
  });

  describe('getAbortController', () => {
    it('should return null when not streaming', () => {
      expect(handler.getAbortController()).toBeNull();
    });

    it('should return abort controller while streaming', async () => {
      const request: StreamingRequest = {
        prompt: 'Test prompt',
        conversationType: 'chat',
        conversationId: null,
        selectedModel: mockModel,
        useStreaming: true
      };

      mockAIService.sendPrompt.mockImplementation(async () => {
        const controller = handler.getAbortController();
        expect(controller).toBeInstanceOf(AbortController);
      });

      await handler.sendPrompt(request, mockCallbacks);
    });
  });
});
