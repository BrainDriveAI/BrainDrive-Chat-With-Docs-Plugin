import type { ConversationInfo, PersonaInfo } from '../../collection-chat-view/chatViewTypes';
import type { ChatMessage } from '../../braindrive-plugin/pluginTypes';
import { generateId } from '../../utils';

/**
 * Options for selecting a conversation
 */
export interface ConversationSelectOptions {
  conversationId: string;
  conversations: ConversationInfo[];
  selectedPersona: PersonaInfo | null;
  showPersonaSelection: boolean;
  initialGreeting?: string;
}

/**
 * Result of conversation selection
 */
export interface ConversationSelectResult {
  shouldStartNewChat: boolean;
  shouldLoadConversation: boolean;
  conversationIdToLoad?: string;
  stateUpdate: Partial<{
    selectedConversation: ConversationInfo | null;
    conversation_id: string | null;
    messages: ChatMessage[];
    selectedPersona: PersonaInfo | null;
    pendingModelKey: string | null;
    pendingModelSnapshot: any;
    pendingPersonaId: string | null;
  }>;
  greetingContent?: string;
}

/**
 * Options for renaming a conversation
 */
export interface RenameConversationOptions {
  conversationId: string;
  newTitle?: string;
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
}

/**
 * Result of conversation rename
 */
export interface RenameConversationResult {
  stateUpdate: Partial<{
    conversations: ConversationInfo[];
    selectedConversation: ConversationInfo | null;
    openConversationMenu: string | null;
  }>;
}

/**
 * Options for deleting a conversation
 */
export interface DeleteConversationOptions {
  conversationId: string;
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  showPersonaSelection: boolean;
  selectedPersona: PersonaInfo | null;
  initialGreeting?: string;
}

/**
 * Result of conversation deletion
 */
export interface DeleteConversationResult {
  stateUpdate: Partial<{
    conversations: ConversationInfo[];
    selectedConversation: ConversationInfo | null;
    conversation_id: string | null;
    messages: ChatMessage[];
    selectedPersona: PersonaInfo | null;
    openConversationMenu: string | null;
  }>;
  greetingContent?: string;
}

/**
 * Options for toggling conversation menu
 */
export interface ToggleConversationMenuOptions {
  conversationId: string;
  currentOpenMenu: string | null;
}

/**
 * Result of toggling conversation menu
 */
export interface ToggleConversationMenuResult {
  stateUpdate: {
    openConversationMenu: string | null;
  };
}

/**
 * Dependencies for ConversationManager
 */
export interface ConversationManagerDeps {
  api: any;
  addMessageToChat: (message: ChatMessage) => void;
  loadConversationWithPersona: (conversationId: string) => void;
}

/**
 * ConversationManager handles conversation CRUD operations.
 *
 * Responsibilities:
 * - Handle conversation selection
 * - Rename conversations
 * - Share conversations (copy URL to clipboard)
 * - Delete conversations
 * - Toggle conversation menu
 * - Manage greeting messages when starting new chats
 */
export class ConversationManager {
  constructor(private deps: ConversationManagerDeps) {}

  /**
   * Handle conversation selection from dropdown.
   * Returns state update and flags for what actions to take.
   */
  handleConversationSelect(options: ConversationSelectOptions): ConversationSelectResult {
    const {
      conversationId,
      conversations,
      selectedPersona,
      showPersonaSelection,
      initialGreeting
    } = options;

    console.log(`📋 Conversation selected: ${conversationId || 'new chat'}`);

    // Empty conversationId means "new chat" option selected
    if (!conversationId) {
      const personaGreeting = showPersonaSelection && selectedPersona?.sample_greeting;
      const greetingContent = personaGreeting || initialGreeting;

      return {
        shouldStartNewChat: true,
        shouldLoadConversation: false,
        stateUpdate: {
          selectedConversation: null,
          conversation_id: null,
          messages: [],
          selectedPersona: showPersonaSelection ? selectedPersona : null,
          pendingModelKey: null,
          pendingModelSnapshot: null,
          pendingPersonaId: null
        },
        greetingContent
      };
    }

    // Find the selected conversation
    const selectedConversation = conversations.find(
      conv => conv.id === conversationId
    );

    if (!selectedConversation) {
      console.warn(`Conversation ${conversationId} not found`);
      return {
        shouldStartNewChat: false,
        shouldLoadConversation: false,
        stateUpdate: {}
      };
    }

    console.log(`📂 Loading conversation: ${conversationId}`);
    return {
      shouldStartNewChat: false,
      shouldLoadConversation: true,
      conversationIdToLoad: conversationId,
      stateUpdate: {
        selectedConversation
      }
    };
  }

  /**
   * Rename a conversation.
   * If newTitle not provided, prompts user for input.
   */
  async handleRenameConversation(
    options: RenameConversationOptions
  ): Promise<RenameConversationResult> {
    const { conversationId, newTitle: providedTitle, conversations, selectedConversation } = options;

    let newTitle = providedTitle;

    // Prompt for title if not provided
    if (!newTitle) {
      const conversation = conversations.find(c => c.id === conversationId);
      const promptResult = prompt('Enter new name:', conversation?.title || 'Untitled');

      // User cancelled
      if (!promptResult) {
        return {
          stateUpdate: {
            openConversationMenu: null
          }
        };
      }

      newTitle = promptResult;
    }

    if (!this.deps.api) {
      throw new Error('API service not available');
    }

    try {
      await this.deps.api.put(
        `/api/v1/conversations/${conversationId}`,
        { title: newTitle }
      );

      // Update the conversation in state
      const updatedConversations = conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, title: newTitle }
          : conv
      );

      const updatedSelectedConversation = selectedConversation?.id === conversationId
        ? { ...selectedConversation, title: newTitle }
        : selectedConversation;

      return {
        stateUpdate: {
          conversations: updatedConversations,
          selectedConversation: updatedSelectedConversation,
          openConversationMenu: null
        }
      };
    } catch (error: any) {
      throw new Error(`Error renaming conversation: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Share a conversation by copying its URL to clipboard.
   */
  async handleShareConversation(conversationId: string): Promise<RenameConversationResult> {
    try {
      const url = `${window.location.origin}${window.location.pathname}?conversation=${conversationId}`;
      await navigator.clipboard.writeText(url);

      // Show success message
      this.deps.addMessageToChat({
        id: generateId('share-success'),
        sender: 'ai',
        content: '📋 Conversation link copied to clipboard!',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Show error message
      this.deps.addMessageToChat({
        id: generateId('share-error'),
        sender: 'ai',
        content: '❌ Failed to copy conversation link',
        timestamp: new Date().toISOString()
      });
    }

    return {
      stateUpdate: {
        openConversationMenu: null
      }
    };
  }

  /**
   * Delete a conversation.
   * If the deleted conversation was selected, starts a new chat with greeting.
   */
  async handleDeleteConversation(
    options: DeleteConversationOptions
  ): Promise<DeleteConversationResult> {
    const {
      conversationId,
      conversations,
      selectedConversation,
      showPersonaSelection,
      selectedPersona,
      initialGreeting
    } = options;

    if (!this.deps.api) {
      throw new Error('API service not available');
    }

    try {
      await this.deps.api.delete(`/api/v1/conversations/${conversationId}`);

      // Remove conversation from list
      const updatedConversations = conversations.filter(
        conv => conv.id !== conversationId
      );

      // Check if deleted conversation was selected
      const wasSelected = selectedConversation?.id === conversationId;

      if (wasSelected) {
        // Start new chat with greeting
        const effectivePersona = showPersonaSelection ? selectedPersona : null;
        const personaGreeting = showPersonaSelection && effectivePersona?.sample_greeting;
        const greetingContent = personaGreeting || initialGreeting;

        return {
          stateUpdate: {
            conversations: updatedConversations,
            selectedConversation: null,
            conversation_id: null,
            messages: [],
            selectedPersona: effectivePersona,
            openConversationMenu: null
          },
          greetingContent
        };
      }

      // Deleted conversation was not selected, just update list
      return {
        stateUpdate: {
          conversations: updatedConversations,
          selectedConversation,
          openConversationMenu: null
        }
      };
    } catch (error: any) {
      throw new Error(`Error deleting conversation: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Toggle conversation menu open/closed.
   */
  toggleConversationMenu(options: ToggleConversationMenuOptions): ToggleConversationMenuResult {
    const { conversationId, currentOpenMenu } = options;

    const isOpening = currentOpenMenu !== conversationId;

    console.log('🔍 toggleConversationMenu:', {
      conversationId,
      isOpening,
      currentOpenMenu
    });

    return {
      stateUpdate: {
        openConversationMenu: isOpening ? conversationId : null
      }
    };
  }
}
