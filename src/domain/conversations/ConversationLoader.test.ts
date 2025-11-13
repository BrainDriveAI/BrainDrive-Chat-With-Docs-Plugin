import {
  ConversationLoader,
  LoadConversationOptions,
  ModelInfo,
  PersonaInfo,
  ConversationWithPersona,
} from './ConversationLoader';

describe('ConversationLoader', () => {
  let loader: ConversationLoader;
  let mockApi: any;
  let mockAiService: any;

  beforeEach(() => {
    mockApi = {
      get: jest.fn(),
    };

    mockAiService = {
      loadConversationWithPersona: jest.fn(),
      updateConversationPersona: jest.fn(),
    };

    loader = new ConversationLoader({
      api: mockApi,
      aiService: mockAiService,
    });
  });

  describe('cleanMessageContent', () => {
    it('should normalize line endings', () => {
      const result = loader.cleanMessageContent('Hello\r\nWorld');
      expect(result).toBe('Hello\nWorld');
    });

    it('should replace 3+ newlines with 2', () => {
      const result = loader.cleanMessageContent('Hello\n\n\n\nWorld');
      expect(result).toBe('Hello\n\nWorld');
    });

    it('should trim content', () => {
      const result = loader.cleanMessageContent('  Hello World  ');
      expect(result).toBe('Hello World');
    });

    it('should trim overall content', () => {
      const result = loader.cleanMessageContent('  Hello\nWorld  ');
      expect(result).toBe('Hello\nWorld');
    });

    it('should handle empty content', () => {
      const result = loader.cleanMessageContent('');
      expect(result).toBe('');
    });

    it('should handle null/undefined content', () => {
      expect(loader.cleanMessageContent(null as any)).toBe(null);
      expect(loader.cleanMessageContent(undefined as any)).toBe(undefined);
    });
  });

  describe('loadConversationHistory', () => {
    it('should load conversation messages successfully', async () => {
      const mockResponse = {
        messages: [
          {
            id: 'msg1',
            sender: 'user',
            message: 'Hello',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'msg2',
            sender: 'llm',
            message: 'Hi there!',
            created_at: '2024-01-01T00:00:01Z',
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await loader.loadConversationHistory('conv123');

      expect(result.conversationId).toBe('conv123');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({
        id: 'msg1',
        sender: 'user',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00Z',
      });
      expect(result.messages[1]).toEqual({
        id: 'msg2',
        sender: 'ai',
        content: 'Hi there!',
        timestamp: '2024-01-01T00:00:01Z',
      });
    });

    it('should convert llm sender to ai', async () => {
      const mockResponse = {
        messages: [
          {
            sender: 'llm',
            message: 'AI response',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await loader.loadConversationHistory('conv123');

      expect(result.messages[0].sender).toBe('ai');
    });

    it('should generate ID if message has no ID', async () => {
      const mockResponse = {
        messages: [
          {
            sender: 'user',
            message: 'Hello',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await loader.loadConversationHistory('conv123');

      expect(result.messages[0].id).toMatch(/^history_/);
    });

    it('should clean message content', async () => {
      const mockResponse = {
        messages: [
          {
            sender: 'user',
            message: 'Hello\r\n\r\n\r\nWorld  ',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await loader.loadConversationHistory('conv123');

      expect(result.messages[0].content).toBe('Hello\n\nWorld');
    });

    it('should handle empty messages array', async () => {
      mockApi.get.mockResolvedValue({ messages: [] });

      const result = await loader.loadConversationHistory('conv123');

      expect(result.messages).toHaveLength(0);
    });

    it('should handle missing messages field', async () => {
      mockApi.get.mockResolvedValue({});

      const result = await loader.loadConversationHistory('conv123');

      expect(result.messages).toHaveLength(0);
    });

    it('should throw error when API not available', async () => {
      const loaderWithoutApi = new ConversationLoader({
        api: null,
        aiService: mockAiService,
      });

      await expect(
        loaderWithoutApi.loadConversationHistory('conv123')
      ).rejects.toThrow('API service not available');
    });

    it('should throw error on API failure', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      await expect(
        loader.loadConversationHistory('conv123')
      ).rejects.toThrow('Error loading conversation history');
    });
  });

  describe('loadConversationWithPersona', () => {
    const baseOptions: LoadConversationOptions = {
      conversationId: 'conv123',
      showPersonaSelection: true,
      models: [
        {
          name: 'gpt-4',
          serverName: 'openai',
          provider: 'OpenAI',
          providerId: '1',
          serverId: '1',
        },
      ],
      personas: [
        {
          id: 'persona1',
          name: 'Assistant',
        },
      ],
      selectedConversation: null,
    };

    it('should load conversation with persona and model', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
        model: 'gpt-4',
        server: 'openai',
        persona_id: 'persona1',
        persona: {
          id: 'persona1',
          name: 'Assistant',
        },
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({
        messages: [
          {
            sender: 'user',
            message: 'Hello',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.selectedModel).toEqual(baseOptions.models[0]);
      expect(result.selectedPersona).toEqual(baseOptions.personas[0]);
      expect(result.pendingModelKey).toBe('openai:::gpt-4');
      expect(result.messages).toHaveLength(1);
    });

    it('should create temporary model snapshot if model not found', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
        model: 'unknown-model',
        server: 'unknown-server',
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({ messages: [] });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.pendingModelSnapshot).toEqual({
        name: 'unknown-model',
        serverName: 'unknown-server',
        provider: 'ollama',
        providerId: 'ollama_servers_settings',
        serverId: 'unknown',
        isTemporary: true,
      });
      expect(result.selectedModel).toEqual(result.pendingModelSnapshot);
    });

    it('should add persona to list if not already present', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
        persona: {
          id: 'new-persona',
          name: 'New Persona',
        },
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({ messages: [] });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.personas).toHaveLength(2);
      expect(result.personas[1]).toEqual({
        id: 'new-persona',
        name: 'New Persona',
      });
      expect(result.selectedPersona).toEqual(result.personas[1]);
    });

    it('should use existing persona if already in list', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
        persona: {
          id: 'persona1',
          name: 'Different Name',
        },
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({ messages: [] });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.personas).toHaveLength(1);
      expect(result.selectedPersona).toEqual(baseOptions.personas[0]);
    });

    it('should handle persona_id without persona object', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
        persona_id: 'persona1',
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({ messages: [] });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.pendingPersonaId).toBe('persona1');
      expect(result.selectedPersona).toEqual(baseOptions.personas[0]);
    });

    it('should handle missing persona when showPersonaSelection is false', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
        persona_id: 'persona1',
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({ messages: [] });

      const options: LoadConversationOptions = {
        ...baseOptions,
        showPersonaSelection: false,
      };

      const result = await loader.loadConversationWithPersona(options);

      expect(result.selectedPersona).toBeNull();
      expect(result.pendingPersonaId).toBeNull();
    });

    it('should fallback to selectedConversation if API endpoint fails', async () => {
      const selectedConv: ConversationWithPersona = {
        id: 'conv123',
        model: 'gpt-4',
        server: 'openai',
      };

      mockAiService.loadConversationWithPersona.mockRejectedValue(
        new Error('Endpoint not found')
      );
      mockApi.get.mockResolvedValue({ messages: [] });

      const options: LoadConversationOptions = {
        ...baseOptions,
        selectedConversation: selectedConv,
      };

      const result = await loader.loadConversationWithPersona(options);

      expect(result.selectedModel).toEqual(baseOptions.models[0]);
    });

    it('should fallback to basic loading on complete failure', async () => {
      mockAiService.loadConversationWithPersona.mockRejectedValue(new Error('Failed'));
      mockApi.get.mockResolvedValue({
        messages: [
          {
            sender: 'user',
            message: 'Hello',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.messages).toHaveLength(1);
      expect(result.selectedModel).toBeNull();
      expect(result.selectedPersona).toBeNull();
      expect(result.pendingModelKey).toBeNull();
    });

    it('should handle missing model metadata', async () => {
      const mockConvWithPersona: ConversationWithPersona = {
        id: 'conv123',
      };

      mockAiService.loadConversationWithPersona.mockResolvedValue(mockConvWithPersona);
      mockApi.get.mockResolvedValue({ messages: [] });

      const result = await loader.loadConversationWithPersona(baseOptions);

      expect(result.pendingModelKey).toBeNull();
      expect(result.pendingModelSnapshot).toBeNull();
      expect(result.selectedModel).toBeNull();
    });

    it('should throw error when services not available', async () => {
      const loaderWithoutServices = new ConversationLoader({
        api: null,
        aiService: null,
      });

      await expect(
        loaderWithoutServices.loadConversationWithPersona(baseOptions)
      ).rejects.toThrow('API service not available');
    });
  });

  describe('updateConversationPersona', () => {
    it('should update conversation persona successfully', async () => {
      mockAiService.updateConversationPersona.mockResolvedValue(undefined);

      await loader.updateConversationPersona('conv123', 'persona1');

      expect(mockAiService.updateConversationPersona).toHaveBeenCalledWith(
        'conv123',
        'persona1'
      );
    });

    it('should handle null persona ID', async () => {
      mockAiService.updateConversationPersona.mockResolvedValue(undefined);

      await loader.updateConversationPersona('conv123', null);

      expect(mockAiService.updateConversationPersona).toHaveBeenCalledWith(
        'conv123',
        null
      );
    });

    it('should throw error when AI service not available', async () => {
      const loaderWithoutAi = new ConversationLoader({
        api: mockApi,
        aiService: null,
      });

      await expect(
        loaderWithoutAi.updateConversationPersona('conv123', 'persona1')
      ).rejects.toThrow('AI service not available');
    });

    it('should throw error on API failure', async () => {
      mockAiService.updateConversationPersona.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(
        loader.updateConversationPersona('conv123', 'persona1')
      ).rejects.toThrow();
    });
  });
});
