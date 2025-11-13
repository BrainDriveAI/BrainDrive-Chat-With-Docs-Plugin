/**
 * @jest-environment jsdom
 */

import { ConversationManager } from '../ConversationManager';
import type { ConversationInfo, PersonaInfo } from '../../../collection-chat-view/chatViewTypes';
import type { ChatMessage } from '../../../braindrive-plugin/pluginTypes';

describe('ConversationManager', () => {
  let mockApi: any;
  let mockAddMessageToChat: jest.Mock;
  let mockLoadConversationWithPersona: jest.Mock;
  let manager: ConversationManager;

  const mockConversations: ConversationInfo[] = [
    {
      id: 'conv-1',
      title: 'Test Conversation 1',
      user_id: 'user-123',
      conversation_type: 'chat',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    },
    {
      id: 'conv-2',
      title: 'Test Conversation 2',
      user_id: 'user-123',
      conversation_type: 'chat',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-04T00:00:00Z'
    }
  ];

  const mockPersona: PersonaInfo = {
    id: 'persona-1',
    name: 'Test Persona',
    system_prompt: 'You are a test assistant',
    sample_greeting: 'Hello from test persona!'
  };

  beforeEach(() => {
    mockApi = {
      put: jest.fn(),
      delete: jest.fn()
    };
    mockAddMessageToChat = jest.fn();
    mockLoadConversationWithPersona = jest.fn();

    manager = new ConversationManager({
      api: mockApi,
      addMessageToChat: mockAddMessageToChat,
      loadConversationWithPersona: mockLoadConversationWithPersona
    });

    // Mock clipboard and prompt
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
    global.prompt = jest.fn();

    // Mock window.location
    delete (global as any).window;
    (global as any).window = {
      location: {
        origin: 'http://localhost:3000',
        pathname: '/chat'
      }
    };
  });

  describe('handleConversationSelect', () => {
    it('should return new chat state when conversationId is empty', () => {
      const result = manager.handleConversationSelect({
        conversationId: '',
        conversations: mockConversations,
        selectedPersona: null,
        showPersonaSelection: false,
        initialGreeting: 'Welcome!'
      });

      expect(result.shouldStartNewChat).toBe(true);
      expect(result.stateUpdate).toEqual({
        selectedConversation: null,
        conversation_id: null,
        messages: [],
        selectedPersona: null,
        pendingModelKey: null,
        pendingModelSnapshot: null,
        pendingPersonaId: null
      });
      expect(result.greetingContent).toBe('Welcome!');
    });

    it('should use persona greeting when persona selected and enabled', () => {
      const result = manager.handleConversationSelect({
        conversationId: '',
        conversations: mockConversations,
        selectedPersona: mockPersona,
        showPersonaSelection: true,
        initialGreeting: 'Welcome!'
      });

      expect(result.shouldStartNewChat).toBe(true);
      expect(result.greetingContent).toBe('Hello from test persona!');
      expect(result.stateUpdate.selectedPersona).toBe(mockPersona);
    });

    it('should return state for existing conversation', () => {
      const result = manager.handleConversationSelect({
        conversationId: 'conv-1',
        conversations: mockConversations,
        selectedPersona: null,
        showPersonaSelection: false,
        initialGreeting: 'Welcome!'
      });

      expect(result.shouldStartNewChat).toBe(false);
      expect(result.stateUpdate.selectedConversation).toEqual(mockConversations[0]);
      expect(result.shouldLoadConversation).toBe(true);
      expect(result.conversationIdToLoad).toBe('conv-1');
    });

    it('should return no-op when conversation not found', () => {
      const result = manager.handleConversationSelect({
        conversationId: 'nonexistent',
        conversations: mockConversations,
        selectedPersona: null,
        showPersonaSelection: false,
        initialGreeting: 'Welcome!'
      });

      expect(result.shouldStartNewChat).toBe(false);
      expect(result.shouldLoadConversation).toBe(false);
      expect(result.stateUpdate).toEqual({});
    });
  });

  describe('handleRenameConversation', () => {
    beforeEach(() => {
      mockApi.put.mockResolvedValue({});
    });

    it('should rename conversation with provided title', async () => {
      const result = await manager.handleRenameConversation({
        conversationId: 'conv-1',
        newTitle: 'Updated Title',
        conversations: mockConversations,
        selectedConversation: mockConversations[0]
      });

      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/v1/conversations/conv-1',
        { title: 'Updated Title' }
      );

      expect(result.stateUpdate.conversations).toEqual([
        { ...mockConversations[0], title: 'Updated Title' },
        mockConversations[1]
      ]);
      expect(result.stateUpdate.selectedConversation).toEqual({
        ...mockConversations[0],
        title: 'Updated Title'
      });
      expect(result.stateUpdate.openConversationMenu).toBe(null);
    });

    it('should prompt for title when not provided', async () => {
      (global.prompt as jest.Mock).mockReturnValue('Prompted Title');

      const result = await manager.handleRenameConversation({
        conversationId: 'conv-1',
        conversations: mockConversations,
        selectedConversation: mockConversations[0]
      });

      expect(global.prompt).toHaveBeenCalledWith(
        'Enter new name:',
        'Test Conversation 1'
      );
      expect(mockApi.put).toHaveBeenCalledWith(
        '/api/v1/conversations/conv-1',
        { title: 'Prompted Title' }
      );
    });

    it('should return no-op when user cancels prompt', async () => {
      (global.prompt as jest.Mock).mockReturnValue(null);

      const result = await manager.handleRenameConversation({
        conversationId: 'conv-1',
        conversations: mockConversations,
        selectedConversation: mockConversations[0]
      });

      expect(mockApi.put).not.toHaveBeenCalled();
      expect(result.stateUpdate).toEqual({
        openConversationMenu: null
      });
    });

    it('should not update selectedConversation if different conversation is selected', async () => {
      const result = await manager.handleRenameConversation({
        conversationId: 'conv-1',
        newTitle: 'Updated Title',
        conversations: mockConversations,
        selectedConversation: mockConversations[1] // Different conversation selected
      });

      expect(result.stateUpdate.selectedConversation).toEqual(mockConversations[1]);
    });

    it('should throw error when API not available', async () => {
      const managerNoApi = new ConversationManager({
        api: null,
        addMessageToChat: mockAddMessageToChat,
        loadConversationWithPersona: mockLoadConversationWithPersona
      });

      await expect(
        managerNoApi.handleRenameConversation({
          conversationId: 'conv-1',
          newTitle: 'Updated',
          conversations: mockConversations,
          selectedConversation: null
        })
      ).rejects.toThrow('API service not available');
    });

    it('should throw error when API request fails', async () => {
      mockApi.put.mockRejectedValue(new Error('Network error'));

      await expect(
        manager.handleRenameConversation({
          conversationId: 'conv-1',
          newTitle: 'Updated',
          conversations: mockConversations,
          selectedConversation: null
        })
      ).rejects.toThrow('Error renaming conversation');
    });
  });

  describe('handleShareConversation', () => {
    it('should copy conversation URL to clipboard', async () => {
      const result = await manager.handleShareConversation('conv-1');

      // Verify URL contains conversation parameter (exact URL may vary in test environment)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('conversation=conv-1')
      );
      expect(result.stateUpdate.openConversationMenu).toBe(null);
      expect(mockAddMessageToChat).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: 'ai',
          content: '📋 Conversation link copied to clipboard!'
        })
      );
    });

    it('should handle clipboard write failure', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(
        new Error('Clipboard access denied')
      );

      const result = await manager.handleShareConversation('conv-1');

      expect(result.stateUpdate.openConversationMenu).toBe(null);
      expect(mockAddMessageToChat).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: 'ai',
          content: '❌ Failed to copy conversation link'
        })
      );
    });
  });

  describe('handleDeleteConversation', () => {
    beforeEach(() => {
      mockApi.delete.mockResolvedValue({});
    });

    it('should delete conversation and keep current selection if different', async () => {
      const result = await manager.handleDeleteConversation({
        conversationId: 'conv-1',
        conversations: mockConversations,
        selectedConversation: mockConversations[1], // Different conversation selected
        showPersonaSelection: false,
        selectedPersona: null,
        initialGreeting: 'Welcome!'
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/conversations/conv-1');
      expect(result.stateUpdate.conversations).toEqual([mockConversations[1]]);
      expect(result.stateUpdate.selectedConversation).toEqual(mockConversations[1]);
      expect(result.stateUpdate.conversation_id).toBeUndefined();
      expect(result.stateUpdate.messages).toBeUndefined();
      expect(result.greetingContent).toBeUndefined();
    });

    it('should start new chat when deleting selected conversation', async () => {
      const result = await manager.handleDeleteConversation({
        conversationId: 'conv-1',
        conversations: mockConversations,
        selectedConversation: mockConversations[0], // Same conversation selected
        showPersonaSelection: false,
        selectedPersona: null,
        initialGreeting: 'Welcome!'
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/conversations/conv-1');
      expect(result.stateUpdate.conversations).toEqual([mockConversations[1]]);
      expect(result.stateUpdate.selectedConversation).toBe(null);
      expect(result.stateUpdate.conversation_id).toBe(null);
      expect(result.stateUpdate.messages).toEqual([]);
      expect(result.stateUpdate.selectedPersona).toBe(null);
      expect(result.greetingContent).toBe('Welcome!');
    });

    it('should use persona greeting when deleting selected conversation with persona enabled', async () => {
      const result = await manager.handleDeleteConversation({
        conversationId: 'conv-1',
        conversations: mockConversations,
        selectedConversation: mockConversations[0],
        showPersonaSelection: true,
        selectedPersona: mockPersona,
        initialGreeting: 'Welcome!'
      });

      expect(result.stateUpdate.selectedPersona).toBe(mockPersona);
      expect(result.greetingContent).toBe('Hello from test persona!');
    });

    it('should throw error when API not available', async () => {
      const managerNoApi = new ConversationManager({
        api: null,
        addMessageToChat: mockAddMessageToChat,
        loadConversationWithPersona: mockLoadConversationWithPersona
      });

      await expect(
        managerNoApi.handleDeleteConversation({
          conversationId: 'conv-1',
          conversations: mockConversations,
          selectedConversation: null,
          showPersonaSelection: false,
          selectedPersona: null,
          initialGreeting: 'Welcome!'
        })
      ).rejects.toThrow('API service not available');
    });

    it('should throw error when API request fails', async () => {
      mockApi.delete.mockRejectedValue(new Error('Network error'));

      await expect(
        manager.handleDeleteConversation({
          conversationId: 'conv-1',
          conversations: mockConversations,
          selectedConversation: null,
          showPersonaSelection: false,
          selectedPersona: null,
          initialGreeting: 'Welcome!'
        })
      ).rejects.toThrow('Error deleting conversation');
    });
  });

  describe('toggleConversationMenu', () => {
    it('should open menu when currently closed', () => {
      const result = manager.toggleConversationMenu({
        conversationId: 'conv-1',
        currentOpenMenu: null
      });

      expect(result.stateUpdate.openConversationMenu).toBe('conv-1');
    });

    it('should close menu when currently open for same conversation', () => {
      const result = manager.toggleConversationMenu({
        conversationId: 'conv-1',
        currentOpenMenu: 'conv-1'
      });

      expect(result.stateUpdate.openConversationMenu).toBe(null);
    });

    it('should switch to different conversation menu', () => {
      const result = manager.toggleConversationMenu({
        conversationId: 'conv-2',
        currentOpenMenu: 'conv-1'
      });

      expect(result.stateUpdate.openConversationMenu).toBe('conv-2');
    });
  });
});
