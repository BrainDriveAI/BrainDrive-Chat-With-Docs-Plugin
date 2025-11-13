import { generateId } from '../../utils';
import { ModelKeyHelper } from '../../utils/ModelKeyHelper';
import type { PersonaInfo } from '../../types';

export type { PersonaInfo };

/**
 * Message from API format
 */
interface ApiMessage {
  id?: string;
  sender: string;
  message: string;
  created_at: string;
}

/**
 * Chat message in application format
 */
export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

/**
 * Model information
 */
export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
  isTemporary?: boolean;
}

/**
 * Conversation with persona data
 */
export interface ConversationWithPersona {
  id: string;
  model?: string;
  server?: string;
  persona_id?: string | number;
  persona?: PersonaInfo;
}

/**
 * Result of loading a conversation
 */
export interface LoadConversationResult {
  messages: ChatMessage[];
  conversationId: string;
  pendingModelKey: string | null;
  pendingModelSnapshot: ModelInfo | null;
  selectedModel: ModelInfo | null;
  pendingPersonaId: string | null;
  selectedPersona: PersonaInfo | null;
  personas: PersonaInfo[];
}

/**
 * Options for loading conversation with persona
 */
export interface LoadConversationOptions {
  conversationId: string;
  showPersonaSelection: boolean;
  models: ModelInfo[];
  personas: PersonaInfo[];
  selectedConversation: ConversationWithPersona | null;
}

/**
 * Dependencies for ConversationLoader
 */
export interface ConversationLoaderDeps {
  api: any;
  aiService: any;
}

/**
 * ConversationLoader handles loading conversation history and metadata.
 *
 * Responsibilities:
 * - Load conversation messages from API
 * - Load conversation with persona/model metadata
 * - Resolve model and persona from conversation data
 * - Update conversation persona
 * - Clean message content for display
 */
export class ConversationLoader {
  constructor(private deps: ConversationLoaderDeps) {}

  /**
   * Clean message content for display.
   * Normalizes line endings, removes excessive whitespace, and cleans legacy context.
   */
  cleanMessageContent(content: string): string {
    if (!content) return content;

    let cleanedContent = content
      .replace(/\r\n/g, '\n')      // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2 (paragraph break)
      .trim();                     // Remove leading/trailing whitespace

    // Remove web search context that might have been stored in old messages
    cleanedContent = cleanedContent.replace(/\n\n\[WEB SEARCH CONTEXT[^]*$/, '');

    // Remove document context that might have been stored in old messages
    cleanedContent = cleanedContent.replace(/^Document Context:[^]*?\n\nUser Question: /, '');
    cleanedContent = cleanedContent.replace(/^[^]*?\n\nUser Question: /, '');

    return cleanedContent.trim();
  }

  /**
   * Load conversation history messages from API.
   * Returns the messages and conversation ID.
   */
  async loadConversationHistory(conversationId: string): Promise<{
    messages: ChatMessage[];
    conversationId: string;
  }> {
    console.log(`📚 Loading conversation history: ${conversationId}`);

    if (!this.deps.api) {
      throw new Error('API service not available');
    }

    try {
      // Fetch conversation with messages
      const response: any = await this.deps.api.get(
        `/api/v1/conversations/${conversationId}/with-messages`
      );

      // Process messages
      const messages: ChatMessage[] = [];

      if (response && response.messages && Array.isArray(response.messages)) {
        // Convert API message format to ChatMessage format
        messages.push(...response.messages.map((msg: ApiMessage) => ({
          id: msg.id || generateId('history'),
          sender: msg.sender === 'llm' ? 'ai' : 'user' as 'ai' | 'user',
          content: this.cleanMessageContent(msg.message),
          timestamp: msg.created_at
        })));
      }

      console.log(`✅ Conversation history loaded: ${conversationId}, ${messages.length} messages`);

      return {
        messages,
        conversationId
      };
    } catch (error) {
      console.error('Error loading conversation history:', error);
      throw new Error('Error loading conversation history');
    }
  }

  /**
   * Load conversation with persona and model metadata.
   * Resolves model and persona from conversation data.
   */
  async loadConversationWithPersona(
    options: LoadConversationOptions
  ): Promise<LoadConversationResult> {
    console.log(`🔄 Loading conversation with persona: ${options.conversationId}`);

    if (!this.deps.api || !this.deps.aiService) {
      throw new Error('API service not available');
    }

    try {
      // Try to fetch conversation with persona details first
      let conversationWithPersona: ConversationWithPersona | null = null;
      try {
        conversationWithPersona = await this.deps.aiService.loadConversationWithPersona(
          options.conversationId
        );
      } catch (error) {
        // If the new endpoint doesn't exist yet, fall back to using selected conversation
        console.warn('Persona-aware conversation loading not available, falling back');
        conversationWithPersona = options.selectedConversation;
      }

      // Extract persona data
      const personaFromConversation = options.showPersonaSelection && conversationWithPersona?.persona
        ? { ...conversationWithPersona.persona, id: `${conversationWithPersona.persona.id}` }
        : null;

      const personaIdFromConversation = options.showPersonaSelection
        ? (personaFromConversation?.id
          || (conversationWithPersona?.persona_id ? `${conversationWithPersona.persona_id}` : null))
        : null;

      const pendingPersonaId = personaIdFromConversation && personaIdFromConversation.trim() !== ''
        ? personaIdFromConversation
        : null;

      // Extract model data
      const modelName = conversationWithPersona?.model?.trim();
      const serverName = conversationWithPersona?.server?.trim();
      const hasModelMetadata = Boolean(modelName && serverName);

      const pendingModelKey = hasModelMetadata
        ? ModelKeyHelper.getModelKey(modelName, serverName)
        : null;

      const matchingModel = pendingModelKey
        ? options.models.find(model => ModelKeyHelper.getModelKeyFromInfo(model) === pendingModelKey)
        : null;

      const pendingModelSnapshot = pendingModelKey && !matchingModel && hasModelMetadata
        ? {
            name: modelName!,
            provider: 'ollama',
            providerId: 'ollama_servers_settings',
            serverName: serverName!,
            serverId: 'unknown',
            isTemporary: true
          } as ModelInfo
        : null;

      // Resolve selected model
      let selectedModel: ModelInfo | null = null;
      if (matchingModel) {
        selectedModel = matchingModel;
      } else if (pendingModelSnapshot) {
        selectedModel = pendingModelSnapshot;
      }

      // Resolve selected persona and update personas list
      let selectedPersona: PersonaInfo | null = null;
      let updatedPersonas = [...options.personas];

      if (options.showPersonaSelection) {
        if (personaFromConversation) {
          const existingPersona = options.personas.find(
            p => `${p.id}` === personaFromConversation.id
          );
          if (existingPersona) {
            selectedPersona = existingPersona;
          } else {
            updatedPersonas = [...options.personas, personaFromConversation];
            selectedPersona = personaFromConversation;
          }
        } else if (pendingPersonaId) {
          const existingPersona = options.personas.find(
            p => `${p.id}` === pendingPersonaId
          );
          selectedPersona = existingPersona || null;
        }
      }

      // Load conversation messages
      const { messages, conversationId } = await this.loadConversationHistory(
        options.conversationId
      );

      console.log(`✅ Conversation loaded successfully: ${conversationId}`);

      return {
        messages,
        conversationId,
        pendingModelKey,
        pendingModelSnapshot,
        selectedModel,
        pendingPersonaId,
        selectedPersona,
        personas: updatedPersonas,
      };
    } catch (error) {
      console.error('Error loading conversation with persona:', error);
      // Fall back to regular conversation loading
      const { messages, conversationId } = await this.loadConversationHistory(
        options.conversationId
      );

      return {
        messages,
        conversationId,
        pendingModelKey: null,
        pendingModelSnapshot: null,
        selectedModel: null,
        pendingPersonaId: null,
        selectedPersona: null,
        personas: options.personas,
      };
    }
  }

  /**
   * Update conversation's associated persona
   */
  async updateConversationPersona(
    conversationId: string,
    personaId: string | null
  ): Promise<void> {
    if (!this.deps.aiService) {
      throw new Error('AI service not available');
    }

    try {
      await this.deps.aiService.updateConversationPersona(conversationId, personaId);
    } catch (error) {
      console.error('Error updating conversation persona:', error);
      throw error;
    }
  }
}
