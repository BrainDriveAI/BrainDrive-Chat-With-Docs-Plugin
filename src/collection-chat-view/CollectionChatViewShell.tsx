import React from 'react';

import './CollectionChatViewShell.css';

import {
  CollectionChatProps,
  CollectionChatState,
  ChatMessage,
  ModelInfo,
  PersonaInfo,
  ConversationWithPersona,
} from './chatViewTypes';
import { DocumentProcessingResult } from '../services';

import { generateId } from '../utils';

// Import constants
import {
  SETTINGS_KEYS,
  UI_CONFIG,
  PROVIDER_SETTINGS_ID_MAP
} from '../constants';

// Import modular components
import {
  ChatHeader,
  ChatHistory,
  ChatInput,
  LoadingStates
} from './components';

// Import services
import { AIService, DocumentService } from '../services';
import { DocumentManagerModal } from '../document-view/DocumentManagerModal';
import { ModelConfigLoader, FallbackModelSelector } from '../domain/models';
import { UserRepository } from '../domain/users/UserRepository';
import { ConversationRepository } from '../domain/conversations/ConversationRepository';
import { ChatScrollManager } from '../domain/ui/ChatScrollManager';
import { ConversationLoader } from '../domain/conversations/ConversationLoader';
import { PersonaResolver } from '../domain/personas/PersonaResolver';

// Import icons
// Icons previously used in the bottom history panel are no longer needed here

/**
 * Unified CollectionChatViewShell component that combines AI chat, model selection, and conversation history
 */
export class CollectionChatViewShell extends React.Component<CollectionChatProps, CollectionChatState> {
  private chatHistoryRef = React.createRef<HTMLDivElement>();
  private inputRef = React.createRef<HTMLTextAreaElement>();
  private themeChangeListener: ((theme: string) => void) | null = null;
  private pageContextUnsubscribe: (() => void) | null = null;
  private currentPageContext: any = null;
  private readonly STREAMING_SETTING_KEY = SETTINGS_KEYS.STREAMING;
  private initialGreetingAdded = false;
  private aiService: AIService | null = null;
  private documentService: DocumentService | null = null;
  private modelConfigLoader: ModelConfigLoader | null = null;
  private modelSelector: FallbackModelSelector;
  private userRepository: UserRepository | null = null;
  private conversationRepository: ConversationRepository | null = null;
  private conversationLoader: ConversationLoader | null = null;
  private personaResolver: PersonaResolver | null = null;
  private currentStreamingAbortController: AbortController | null = null;
  private menuButtonRef: HTMLButtonElement | null = null;
  private scrollManager: ChatScrollManager;

  constructor(props: CollectionChatProps) {
    super(props);
    
    this.state = {
      // Chat state
      messages: [],
      inputText: '',
      isLoading: false,
      error: '',
      currentTheme: 'light',
      selectedModel: null,
      pendingModelKey: null,
      pendingModelSnapshot: null,
      useStreaming: true, // Always use streaming
      conversation_id: null,
      isLoadingHistory: false,
      currentUserId: null,
      isInitializing: true,
      
      // History state
      conversations: [],
      selectedConversation: null,
      isUpdating: false,
      
      // Model selection state
      models: [],
      isLoadingModels: true,
      
      // UI state
      showModelSelection: true,
      showConversationHistory: true,
      
      // Persona state
      personas: props.availablePersonas || [],
      selectedPersona: null, // Default to no persona
      pendingPersonaId: null,
      isLoadingPersonas: !props.availablePersonas,
      showPersonaSelection: true, // Always show persona selection
      
      // Web search state
      useWebSearch: false,
      isSearching: false,
      
      // User control state
      isStreaming: false,
      editingMessageId: null,
      editingContent: '',
      
      // Document processing state
      documentContext: '',
      isProcessingDocuments: false,
      
      // Scroll state
      isNearBottom: true,
      showScrollToBottom: false,
      isAutoScrollLocked: false,
      
      // History UI state
      showAllHistory: false,
      openConversationMenu: null,
      isHistoryExpanded: true, // History accordion state      
    };

    // Initialize ChatScrollManager
    this.scrollManager = new ChatScrollManager({
      scrollAnchorOffset: 420,
      minVisibleLastMessageHeight: 64,
      nearBottomEpsilon: 24,
      strictBottomThreshold: 4,
      userScrollIntentGraceMs: 300,
      scrollDebounceDelay: UI_CONFIG.SCROLL_DEBOUNCE_DELAY,
    });

    // Subscribe to scroll state changes
    this.scrollManager.onStateChange((scrollState) => {
      this.setState({
        isNearBottom: scrollState.isNearBottom,
        showScrollToBottom: scrollState.showScrollToBottom,
        isAutoScrollLocked: scrollState.isAutoScrollLocked,
      });
    });

    // Initialize AI service
    this.aiService = new AIService(props.services.api);

    // Initialize Document service with authenticated API service
    this.documentService = new DocumentService(props.services.api);

    // Initialize ConversationLoader
    if (props.services.api && this.aiService) {
      this.conversationLoader = new ConversationLoader({
        api: props.services.api,
        aiService: this.aiService,
      });
    }

    // Initialize PersonaResolver
    if (props.services.api) {
      this.personaResolver = new PersonaResolver({
        api: props.services.api,
      });
    }

    // Initialize model configuration services
    if (props.services.api) {
      this.modelConfigLoader = new ModelConfigLoader(props.services.api);
    }
    this.modelSelector = new FallbackModelSelector();
  }

  componentDidMount() {
    console.log(`🎭 ComponentDidMount - Initial persona state: selectedPersona=${this.state.selectedPersona?.name || 'null'}, showPersonaSelection=${this.state.showPersonaSelection}, availablePersonas=${this.props.availablePersonas?.length || 0}`);
    
    this.initializeThemeService();
    this.initializePageContextService();
    this.loadInitialData();
    this.loadSavedStreamingMode();
    this.loadPersonas();
    
    // Add global key event listener for ESC key
    document.addEventListener('keydown', this.handleGlobalKeyPress);
    
    // Add click outside listener to close conversation menu
    document.addEventListener('mousedown', this.handleClickOutside);

    // Initialize scroll manager with container ref
    this.scrollManager.setContainer(this.chatHistoryRef.current);
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.updateScrollState();

    // Set initialization timeout
    setTimeout(() => {
      if (!this.state.conversation_id) {
        // Only use persona greeting if persona selection is enabled and a persona is selected
        // Ensure persona is null when personas are disabled
        const effectivePersona = this.state.showPersonaSelection ? this.state.selectedPersona : null;
        const personaGreeting = this.state.showPersonaSelection && effectivePersona?.sample_greeting;
        const greetingContent = personaGreeting || this.props.initialGreeting;
        
        console.log(`🎭 Greeting logic: showPersonaSelection=${this.state.showPersonaSelection}, effectivePersona=${effectivePersona?.name || 'none'}, using=${personaGreeting ? 'persona' : 'default'} greeting`);
        
        if (greetingContent && !this.initialGreetingAdded) {
          this.initialGreetingAdded = true;
          
          const greetingMessage: ChatMessage = {
            id: generateId('greeting'),
            sender: 'ai',
            content: greetingContent,
            timestamp: new Date().toISOString()
          };
          
          this.setState(prevState => ({
            messages: [...prevState.messages, greetingMessage],
            isInitializing: false
          }));
        } else {
          this.setState({ isInitializing: false });
        }
      }
    }, UI_CONFIG.INITIAL_GREETING_DELAY);
  }

  componentDidUpdate(prevProps: CollectionChatProps, prevState: CollectionChatState) {
    if (
      prevState.models !== this.state.models ||
      prevState.pendingModelKey !== this.state.pendingModelKey ||
      prevState.pendingModelSnapshot !== this.state.pendingModelSnapshot ||
      prevState.selectedModel !== this.state.selectedModel
    ) {
      this.resolvePendingModelSelection();
    }

    if (
      prevState.personas !== this.state.personas ||
      prevState.pendingPersonaId !== this.state.pendingPersonaId ||
      prevState.selectedPersona !== this.state.selectedPersona ||
      prevState.showPersonaSelection !== this.state.showPersonaSelection
    ) {
      this.resolvePendingPersonaSelection();
    }

    const messagesChanged = prevState.messages !== this.state.messages;
    if (!messagesChanged) {
      return;
    }

    const messageCountIncreased = this.state.messages.length > prevState.messages.length;

    if (!this.state.isAutoScrollLocked && messageCountIncreased) {
      this.debouncedScrollToBottom();
    } else {
      this.updateScrollState();
    }
  }

  componentWillUnmount() {
    // Clean up scroll manager
    this.scrollManager.cleanup();

    // Clean up theme listener
    if (this.themeChangeListener && this.props.services?.theme) {
      this.props.services.theme.removeThemeChangeListener(this.themeChangeListener);
    }

    // Clean up page context subscription
    if (this.pageContextUnsubscribe) {
      this.pageContextUnsubscribe();
    }
    
    // Clean up global key event listener
    document.removeEventListener('keydown', this.handleGlobalKeyPress);
    
    // Clean up click outside listener
    document.removeEventListener('mousedown', this.handleClickOutside);
    
    // Clean up any ongoing streaming
    if (this.currentStreamingAbortController) {
      this.currentStreamingAbortController.abort();
    }
  }

  /**
   * Load initial data (models and conversations)
   */
  loadInitialData = async () => {
    // Initialize repositories
    if (this.props.services?.api) {
      this.userRepository = new UserRepository({ api: this.props.services.api });
      this.conversationRepository = new ConversationRepository({ api: this.props.services.api });
    }

    await Promise.all([
      this.loadProviderSettings(),
      this.fetchConversations()
    ]);
  }

  /**
   * Get page-specific setting key with fallback to global
   */
  private getSettingKey(baseSetting: string): string {
    const pageContext = this.getCurrentPageContext();
    if (pageContext?.pageId) {
      return `page_${pageContext.pageId}_${baseSetting}`;
    }
    return baseSetting; // Fallback to global
  }

  /**
   * Get saved streaming mode from settings (page-specific with global fallback)
   */
  getSavedStreamingMode = async (): Promise<boolean | null> => {
    try {
      if (this.props.services?.settings?.getSetting) {
        // Try page-specific setting first
        const pageSpecificKey = this.getSettingKey(this.STREAMING_SETTING_KEY);
        let savedValue = await this.props.services.settings.getSetting(pageSpecificKey);
        
        // Fallback to global setting if page-specific doesn't exist
        if (savedValue === null || savedValue === undefined) {
          savedValue = await this.props.services.settings.getSetting(this.STREAMING_SETTING_KEY);
        }
        
        if (typeof savedValue === 'boolean') {
          return savedValue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Load saved streaming mode from settings
   */
  loadSavedStreamingMode = async (): Promise<void> => {
    try {
      const savedStreamingMode = await this.getSavedStreamingMode();
      if (savedStreamingMode !== null) {
        this.setState({ useStreaming: savedStreamingMode });
      }
    } catch (error) {
      // Error loading streaming mode, use default
    }
  }

  /**
   * Save streaming mode to settings (page-specific)
   */
  saveStreamingMode = async (enabled: boolean): Promise<void> => {
    try {
      if (this.props.services?.settings?.setSetting) {
        // Save to page-specific setting key
        const pageSpecificKey = this.getSettingKey(this.STREAMING_SETTING_KEY);
        await this.props.services.settings.setSetting(pageSpecificKey, enabled);
      }
    } catch (error) {
      // Error saving streaming mode
    }
  }

  /**
   * Initialize the theme service to listen for theme changes
   */
  initializeThemeService = () => {
    if (this.props.services?.theme) {
      try {
        // Get the current theme
        const currentTheme = this.props.services.theme.getCurrentTheme();
        this.setState({ currentTheme });
        
        // Set up theme change listener
        this.themeChangeListener = (newTheme: string) => {
          this.setState({ currentTheme: newTheme });
        };
        
        // Add the listener to the theme service
        this.props.services.theme.addThemeChangeListener(this.themeChangeListener);
      } catch (error) {
        // Error initializing theme service
      }
    }
  }

  /**
   * Initialize the page context service to listen for page changes
   */
  initializePageContextService = () => {
    if (this.props.services?.pageContext) {
      try {
        // Get initial page context
        this.currentPageContext = this.props.services.pageContext.getCurrentPageContext();
        
        // Subscribe to page context changes
        this.pageContextUnsubscribe = this.props.services.pageContext.onPageContextChange(
          (context) => {
            this.currentPageContext = context;
            // Reload conversations when page changes to show page-specific conversations
            this.fetchConversations();
          }
        );
      } catch (error) {
        // Error initializing page context service
        console.warn('Failed to initialize page context service:', error);
      }
    }
  }

  /**
   * Helper method to get current page context
   */
  private getCurrentPageContext() {
    if (this.props.services?.pageContext) {
      return this.props.services.pageContext.getCurrentPageContext();
    }
    return this.currentPageContext;
  }

  /**
   * Load personas from API or use provided personas
   */
  /**
   * Load personas (delegates to PersonaResolver)
   */
  loadPersonas = async () => {
    if (!this.personaResolver) {
      this.setState({ isLoadingPersonas: false });
      return;
    }

    // If using provided personas, resolve immediately
    if (this.props.availablePersonas) {
      this.resolvePendingPersonaSelection();
      return;
    }

    this.setState({ isLoadingPersonas: true });

    try {
      const personas = await this.personaResolver.loadPersonas(this.props.availablePersonas);
      this.setState({
        personas,
        isLoadingPersonas: false
      }, () => {
        this.resolvePendingPersonaSelection();
      });
    } catch (error) {
      console.error('Error loading personas:', error);
      this.setState({
        personas: [],
        isLoadingPersonas: false
      }, () => {
        this.resolvePendingPersonaSelection();
      });
    }
  };

  /**
   * Load provider settings and models
   */
  /**
   * Load provider settings using ModelConfigLoader (refactored)
   * Replaces 160+ lines of duplicate logic with domain service
   */
  loadProviderSettings = async () => {
    this.setState({ isLoadingModels: true, error: '' });

    if (!this.modelConfigLoader) {
      this.setState({
        isLoadingModels: false,
        error: 'API service not available'
      });
      return;
    }

    try {
      // Use ModelConfigLoader with fallback logic
      const result = await this.modelConfigLoader.loadModelsWithFallback();

      if (result.error && result.models.length === 0) {
        this.setState({
          models: [],
          selectedModel: null,
          isLoadingModels: false,
          error: result.error,
        });
        return;
      }

      // Select default model using FallbackModelSelector
      const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;
      const defaultModel = this.modelSelector.selectFirst(result.models);

      this.setState(prevState => {
        const selectedModel = prevState.pendingModelKey || prevState.selectedModel
          ? prevState.selectedModel
          : defaultModel;

        return {
          models: result.models,
          isLoadingModels: false,
          selectedModel,
        };
      }, () => {
        if (this.state.pendingModelKey) {
          this.resolvePendingModelSelection();
        } else if (shouldBroadcastDefault && this.state.selectedModel) {
          this.broadcastModelSelection(this.state.selectedModel);
        }
      });
    } catch (error: any) {
      console.error('Error loading models:', error);
      this.setState({
        models: [],
        selectedModel: null,
        isLoadingModels: false,
        error: `Error loading models: ${error.message || 'Unknown error'}`,
      });
    }
  };

  /**
   * Refresh conversations list without interfering with current conversation
   */
  refreshConversationsList = async () => {
    if (!this.userRepository || !this.conversationRepository) {
      return;
    }

    try {
      // Get current user ID
      const userId = await this.userRepository.getCurrentUserId();

      // Get current page context for page-specific conversations
      const pageContext = this.getCurrentPageContext();

      // Fetch conversations
      const conversations = await this.conversationRepository.fetchConversations({
        userId,
        conversationType: this.props.conversationType || 'chat',
        pageId: pageContext?.pageId || null,
        skip: 0,
        limit: 50
      });

      if (conversations.length === 0) {
        this.setState({
          conversations: [],
          isLoadingHistory: false
        });
        return;
      }

      const sortedConversations = this.conversationRepository.sortByRecency(conversations);

      // Update conversations list and select current conversation if it exists
      const currentConversation = this.state.conversation_id
        ? sortedConversations.find(conv => conv.id === this.state.conversation_id)
        : null;

      this.setState({
        conversations: sortedConversations,
        selectedConversation: currentConversation || this.state.selectedConversation
      });

    } catch (error: any) {
      console.error('Error refreshing conversations list:', error);
    }
  };

  /**
   * Fetch conversations from the API
   */
  fetchConversations = async () => {
    if (!this.userRepository || !this.conversationRepository) {
      this.setState({
        isLoadingHistory: false,
        error: 'Repository services not available'
      });
      return;
    }

    try {
      this.setState({ isLoadingHistory: true, error: '' });

      // Get current user ID
      const userId = await this.userRepository.getCurrentUserId();

      // Get current page context for page-specific conversations
      const pageContext = this.getCurrentPageContext();

      // Fetch conversations
      const conversations = await this.conversationRepository.fetchConversations({
        userId,
        conversationType: this.props.conversationType || 'chat',
        pageId: pageContext?.pageId || null,
        skip: 0,
        limit: 50
      });

      if (conversations.length === 0) {
        this.setState({
          conversations: [],
          isLoadingHistory: false
        });
        return;
      }

      const sortedConversations = this.conversationRepository.sortByRecency(conversations);

      // Auto-select the most recent conversation if available
      const mostRecentConversation = sortedConversations.length > 0 ? sortedConversations[0] : null;

      this.setState({
        conversations: sortedConversations,
        selectedConversation: mostRecentConversation,
        isLoadingHistory: false
      }, () => {
        // Only auto-load the most recent conversation if we don't have an active conversation
        // This prevents interference with ongoing message exchanges
        if (mostRecentConversation && !this.state.conversation_id) {
          this.loadConversationWithPersona(mostRecentConversation.id);
        }
      });
    } catch (error: any) {
      // Check if it's a 403 Forbidden error
      if (error.status === 403 || (error.response && error.response.status === 403)) {
        // Show empty state for better user experience
        this.setState({
          isLoadingHistory: false,
          conversations: [],
          error: '' // Don't show an error message to the user
        });
      } else if (error.status === 404 || (error.response && error.response.status === 404)) {
        // Handle 404 errors (no conversations found)
        this.setState({
          isLoadingHistory: false,
          conversations: [],
          error: '' // Don't show an error message to the user
        });
      } else {
        // Handle other errors
        this.setState({
          isLoadingHistory: false,
          error: `Error loading conversations: ${error.message || 'Unknown error'}`
        });
      }
    }
  }

  /**
   * Handle model selection change
   */
  handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    const selectedModel = this.state.models.find(model => 
      `${model.provider}_${model.serverId}_${model.name}` === modelId
    );
    
    if (selectedModel) {
      this.setState({
        selectedModel,
        pendingModelKey: null,
        pendingModelSnapshot: null
      }, () => {
        this.broadcastModelSelection(selectedModel);
      });
    }
  };

  /**
   * Broadcast model selection event
   */
  broadcastModelSelection = (model: ModelInfo) => {
    if (!this.props.services?.event) {
      return;
    }

    // Create model selection message
    const modelInfo = {
      type: 'model.selection',
      content: {
        model: {
          name: model.name,
          provider: model.provider,
          providerId: model.providerId,
          serverName: model.serverName,
          serverId: model.serverId
        },
        timestamp: new Date().toISOString()
      }
    };
    
    // Send to event system
    this.props.services.event.sendMessage('ai-prompt-chat', modelInfo.content);
  };

  private getModelKey(modelName?: string | null, serverName?: string | null) {
    const safeModel = (modelName || '').trim();
    const safeServer = (serverName || '').trim();
    return `${safeServer}:::${safeModel}`;
  }

  private getModelKeyFromInfo(model: ModelInfo | null) {
    if (!model) {
      return '';
    }
    return this.getModelKey(model.name, model.serverName);
  }

  private resolvePendingModelSelection = () => {
    const { pendingModelKey, models, selectedModel, pendingModelSnapshot } = this.state;

    if (!pendingModelKey) {
      if (pendingModelSnapshot) {
        this.setState({ pendingModelSnapshot: null });
      }
      return;
    }

    const matchingModel = models.find(model => this.getModelKeyFromInfo(model) === pendingModelKey);

    if (matchingModel) {
      const selectedKey = this.getModelKeyFromInfo(selectedModel);
      const isSameKey = selectedKey === pendingModelKey;
      const selectedIsTemporary = Boolean(selectedModel?.isTemporary);
      const matchingIsTemporary = Boolean(matchingModel.isTemporary);

      if (!selectedModel || !isSameKey || (selectedIsTemporary && !matchingIsTemporary)) {
        this.setState({
          selectedModel: matchingModel,
          pendingModelKey: matchingIsTemporary ? pendingModelKey : null,
          pendingModelSnapshot: matchingIsTemporary ? pendingModelSnapshot : null
        }, () => {
          if (!matchingIsTemporary) {
            this.broadcastModelSelection(matchingModel);
          }
        });
        return;
      }

      if (!matchingIsTemporary) {
        this.setState({ pendingModelKey: null, pendingModelSnapshot: null });
      }

      return;
    }

    if (pendingModelSnapshot && !models.some(model => this.getModelKeyFromInfo(model) === pendingModelKey)) {
      this.setState(prevState => ({
        models: [...prevState.models, pendingModelSnapshot]
      }));
    }
  };

  /**
   * Resolve pending persona selection (delegates to PersonaResolver)
   */
  private resolvePendingPersonaSelection = async () => {
    if (!this.personaResolver) {
      return;
    }

    try {
      const result = await this.personaResolver.resolvePendingPersona({
        pendingPersonaId: this.state.pendingPersonaId,
        showPersonaSelection: this.state.showPersonaSelection,
        personas: this.state.personas,
        selectedPersona: this.state.selectedPersona,
      });

      // Only update if state changed
      if (result.persona !== this.state.selectedPersona ||
          result.pendingPersonaId !== this.state.pendingPersonaId ||
          result.personas !== this.state.personas) {
        this.setState({
          selectedPersona: result.persona,
          pendingPersonaId: result.pendingPersonaId,
          personas: result.personas,
        });
      }
    } catch (error) {
      console.error('Error resolving pending persona:', error);
    }
  };

  /**
   * Handle conversation selection
   */
  handleConversationSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const conversationId = event.target.value;
    
    console.log(`📋 Conversation selected: ${conversationId || 'new chat'}`);
    
    if (!conversationId) {
      // New chat selected
      this.handleNewChatClick();
      return;
    }
    
    const selectedConversation = this.state.conversations.find(
      conv => conv.id === conversationId
    );
    
    if (selectedConversation) {
      console.log(`📂 Loading conversation: ${conversationId}`);
      this.setState({ selectedConversation }, () => {
        // Use the new persona-aware conversation loading method
        this.loadConversationWithPersona(conversationId);
      });
    }
  };

  /**
   * Handle persona selection
   */
  handlePersonaChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const personaId = event.target.value;
    const selectedPersona = personaId
      ? this.state.personas.find(p => p.id === personaId) || null
      : null;
    
    console.log(`🎭 Persona changed: ${selectedPersona?.name || 'none'} (ID: ${personaId || 'none'})`);
    
    this.setState({ selectedPersona, pendingPersonaId: null }, () => {
      console.log(`🎭 Persona state after change: selectedPersona=${this.state.selectedPersona?.name || 'null'}, showPersonaSelection=${this.state.showPersonaSelection}`);
    });

    // If we have an active conversation, update its persona
    if (this.state.conversation_id) {
      try {
        await this.updateConversationPersona(this.state.conversation_id, personaId || null);
      } catch (error) {
        console.error('Failed to update conversation persona:', error);
        // Could show a user-friendly error message here
      }
    }
  };

  /**
   * Handle persona toggle (when turning personas on/off)
   */
  handlePersonaToggle = () => {
    // Reset to no persona when toggling off
    console.log('🎭 Persona toggled off - resetting to no persona');
    this.setState({ selectedPersona: null, pendingPersonaId: null }, () => {
      console.log(`🎭 Persona state after toggle: selectedPersona=${this.state.selectedPersona?.name || 'null'}, showPersonaSelection=${this.state.showPersonaSelection}`);
    });
  };

  /**
   * Handle new chat button click
   */
  handleNewChatClick = () => {
    console.log(`🆕 Starting new chat - clearing conversation_id`);
    this.setState({
      selectedConversation: null,
      conversation_id: null,
      messages: [],
      // Reset persona to null when starting new chat (respects persona toggle state)
      selectedPersona: this.state.showPersonaSelection ? this.state.selectedPersona : null,
      pendingModelKey: null,
      pendingModelSnapshot: null,
      pendingPersonaId: null
    }, () => {
      console.log(`✅ New chat started - conversation_id: ${this.state.conversation_id}`);
      // Only use persona greeting if persona selection is enabled and a persona is selected
      const personaGreeting = this.state.showPersonaSelection && this.state.selectedPersona?.sample_greeting;
      const greetingContent = personaGreeting || this.props.initialGreeting;
      
      console.log(`🎭 New chat greeting: showPersonaSelection=${this.state.showPersonaSelection}, selectedPersona=${this.state.selectedPersona?.name || 'none'}, using=${personaGreeting ? 'persona' : 'default'} greeting`);
      
      if (greetingContent) {
        this.initialGreetingAdded = true;
        this.addMessageToChat({
          id: generateId('greeting'),
          sender: 'ai',
          content: greetingContent,
          timestamp: new Date().toISOString()
        });
      }
    });
  };

  /**
   * Handle renaming a conversation
   */
  handleRenameConversation = async (conversationId: string, newTitle?: string) => {
    // Close menu first
    this.setState({ openConversationMenu: null });
    
    if (!newTitle) {
      const conversation = this.state.conversations.find(c => c.id === conversationId);
      const promptResult = prompt('Enter new name:', conversation?.title || 'Untitled');
      if (!promptResult) return; // User cancelled
      newTitle = promptResult;
    }
    
    if (!this.props.services?.api) {
      throw new Error('API service not available');
    }

    try {
      await this.props.services.api.put(
        `/api/v1/conversations/${conversationId}`,
        { title: newTitle }
      );

      // Update the conversation in state
      this.setState(prevState => {
        const updatedConversations = prevState.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: newTitle }
            : conv
        );

        const updatedSelectedConversation = prevState.selectedConversation?.id === conversationId
          ? { ...prevState.selectedConversation, title: newTitle }
          : prevState.selectedConversation;

        return {
          conversations: updatedConversations,
          selectedConversation: updatedSelectedConversation
        };
      });

    } catch (error: any) {
      throw new Error(`Error renaming conversation: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Toggle conversation menu
   */
  toggleConversationMenu = (conversationId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('🔍 toggleConversationMenu called:', { conversationId, hasEvent: !!event });
    
    const isOpening = this.state.openConversationMenu !== conversationId;
    console.log('🔍 isOpening:', isOpening);
    
    if (isOpening) {
      // Simple toggle - CSS handles all positioning
      this.setState({
        openConversationMenu: conversationId
      }, () => {
        console.log('🔍 Menu opened for conversation:', conversationId);
      });
    } else {
      console.log('🔍 Closing menu');
      this.setState({
        openConversationMenu: null
      });
    }
  };

  /**
   * Handle sharing a conversation
   */
  handleShareConversation = async (conversationId: string) => {
    // Close menu
    this.setState({ openConversationMenu: null });
    
    // For now, just copy the conversation URL to clipboard
    try {
      const url = `${window.location.origin}${window.location.pathname}?conversation=${conversationId}`;
      await navigator.clipboard.writeText(url);
      
      // Show a temporary success message
      this.addMessageToChat({
        id: generateId('share-success'),
        sender: 'ai',
        content: '📋 Conversation link copied to clipboard!',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.addMessageToChat({
        id: generateId('share-error'),
        sender: 'ai',
        content: '❌ Failed to copy conversation link',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle deleting a conversation
   */
  handleDeleteConversation = async (conversationId: string) => {
    // Close menu first
    this.setState({ openConversationMenu: null });
    
    if (!this.props.services?.api) {
      throw new Error('API service not available');
    }

    try {
      await this.props.services.api.delete(`/api/v1/conversations/${conversationId}`);

      // Update state to remove the conversation
      this.setState(prevState => {
        const updatedConversations = prevState.conversations.filter(
          conv => conv.id !== conversationId
        );

        // If the deleted conversation was selected, clear selection and start new chat
        const wasSelected = prevState.selectedConversation?.id === conversationId;

        return {
          conversations: updatedConversations,
          selectedConversation: wasSelected ? null : prevState.selectedConversation,
          conversation_id: wasSelected ? null : prevState.conversation_id,
          messages: wasSelected ? [] : prevState.messages,
          // Reset persona to null when starting new chat (respects persona toggle state)
          selectedPersona: wasSelected ? (prevState.showPersonaSelection ? prevState.selectedPersona : null) : prevState.selectedPersona
        };
      }, () => {
        // If we deleted the selected conversation, add greeting if available
        if (this.state.selectedConversation === null) {
          // Only use persona greeting if persona selection is enabled and a persona is selected
          // Ensure persona is null when personas are disabled
          const effectivePersona = this.state.showPersonaSelection ? this.state.selectedPersona : null;
          const greetingContent = (this.state.showPersonaSelection && effectivePersona?.sample_greeting) 
            || this.props.initialGreeting;
          
          if (greetingContent) {
            this.initialGreetingAdded = true;
            this.addMessageToChat({
              id: generateId('greeting'),
              sender: 'ai',
              content: greetingContent,
              timestamp: new Date().toISOString()
            });
          }
        }
      });

    } catch (error: any) {
      throw new Error(`Error deleting conversation: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Load conversation history from the API (delegates to ConversationLoader)
   */
  loadConversationHistory = async (conversationId: string) => {
    if (!this.conversationLoader) {
      this.setState({ error: 'API service not available', isInitializing: false });
      return;
    }

    try {
      // Clear current conversation without showing initial greeting
      console.log(`🧹 Clearing messages for conversation load: ${conversationId}`);
      this.setState({
        messages: [],
        conversation_id: null,
        isLoadingHistory: true,
        error: ''
      });

      // Load conversation history using ConversationLoader
      const result = await this.conversationLoader.loadConversationHistory(conversationId);

      // Mark that we've loaded a conversation, so don't show initial greeting
      this.initialGreetingAdded = true;

      // Update state
      this.setState({
        messages: result.messages,
        conversation_id: result.conversationId,
        isLoadingHistory: false,
        isInitializing: false
      });

      // Scroll to bottom after loading history so the latest reply is visible
      setTimeout(() => {
        this.scrollToBottom({ force: true });
      }, 100);

    } catch (error) {
      // Error loading conversation history
      this.setState({
        isLoadingHistory: false,
        error: 'Error loading conversation history',
        isInitializing: false
      });
    }
  }

  /**
   * Load conversation history with persona and model auto-selection (delegates to ConversationLoader)
   */
  loadConversationWithPersona = async (conversationId: string) => {
    if (!this.conversationLoader) {
      this.setState({ error: 'API service not available', isInitializing: false });
      return;
    }

    try {
      // Clear current conversation without showing initial greeting
      this.setState({
        messages: [],
        conversation_id: null,
        isLoadingHistory: true,
        error: ''
      });

      // Load conversation using ConversationLoader
      const result = await this.conversationLoader.loadConversationWithPersona({
        conversationId,
        showPersonaSelection: this.state.showPersonaSelection,
        models: this.state.models,
        personas: this.state.personas,
        selectedConversation: this.state.selectedConversation,
      });

      // Mark that we've loaded a conversation, so don't show initial greeting
      this.initialGreetingAdded = true;

      // Track previous model key for broadcasting
      const previousSelectedModelKey = ModelKeyHelper.getModelKeyFromInfo(this.state.selectedModel);

      // Update state with loaded data
      this.setState({
        messages: result.messages,
        conversation_id: result.conversationId,
        pendingModelKey: result.pendingModelKey,
        pendingModelSnapshot: result.pendingModelSnapshot,
        selectedModel: result.selectedModel,
        pendingPersonaId: result.pendingPersonaId,
        selectedPersona: result.selectedPersona,
        personas: result.personas,
        isLoadingHistory: false,
        isInitializing: false,
      }, () => {
        // Broadcast model selection if changed
        const newSelectedModelKey = ModelKeyHelper.getModelKeyFromInfo(this.state.selectedModel);
        if (
          result.selectedModel &&
          newSelectedModelKey &&
          newSelectedModelKey !== previousSelectedModelKey
        ) {
          this.broadcastModelSelection(result.selectedModel);
        }

        // Resolve pending model/persona
        if (result.pendingModelKey) {
          this.resolvePendingModelSelection();
        }
        if (this.state.pendingPersonaId) {
          this.resolvePendingPersonaSelection();
        }
      });

      // Scroll to bottom after loading history
      setTimeout(() => {
        this.scrollToBottom({ force: true });
      }, 100);

    } catch (error) {
      console.error('Error loading conversation with persona:', error);
      // Fall back to regular conversation loading
      await this.loadConversationHistory(conversationId);
    }
  };

  /**
   * Update conversation's persona
   */
  /**
   * Update conversation persona (delegates to ConversationLoader)
   */
  updateConversationPersona = async (conversationId: string, personaId: string | null) => {
    if (!this.conversationLoader) {
      throw new Error('Conversation loader not available');
    }
    return this.conversationLoader.updateConversationPersona(conversationId, personaId);
  };

  /**
   * Stop ongoing generation
   */
  stopGeneration = async () => {
    console.log('🛑 stopGeneration called');
    
    // Abort the frontend request immediately
    if (this.currentStreamingAbortController) {
      this.currentStreamingAbortController.abort();
      this.currentStreamingAbortController = null;
    }
    
    // Try to cancel backend generation (best effort)
    if (this.aiService && this.state.conversation_id) {
      try {
        await this.aiService.cancelGeneration(this.state.conversation_id);
      } catch (error) {
        console.error('Error canceling backend generation:', error);
        // Continue anyway - the AbortController should handle the cancellation
      }
    }
    
    // Immediately update UI state - keep the partial response but mark it as stopped
    this.setState(prevState => {
      console.log('🛑 Updating message states, current messages:', prevState.messages.length);
      
      const updatedMessages = prevState.messages.map(message => {
        const shouldUpdate = message.isStreaming;
        if (shouldUpdate) {
          console.log(`🛑 Updating streaming message ${message.id} with canContinue: true, isCutOff: true`);
        }
        
        return {
          ...message,
          isStreaming: false,
          canRegenerate: true,
          // Only set canContinue and isCutOff for messages that are currently streaming
          canContinue: shouldUpdate ? true : message.canContinue,
          isCutOff: shouldUpdate ? true : message.isCutOff
        };
      });
      
      return {
        isStreaming: false,
        isLoading: false,
        messages: updatedMessages
      };
    }, () => {
      console.log('🛑 Message states updated, focusing input');
      // Focus the input after stopping
      this.focusInput();
    });
  };

  /**
   * Continue generation from where it left off by replacing the stopped message
   */
  continueGeneration = async () => {
    const lastAiMessage = this.state.messages
      .filter(msg => msg.sender === 'ai')
      .pop();
    
    if (lastAiMessage && lastAiMessage.canContinue) {
      // Find the last user message to get the original prompt
      const lastUserMessage = [...this.state.messages]
        .reverse()
        .find(msg => msg.sender === 'user');
      
      if (!lastUserMessage) return;
      
      // Remove the cut-off message
      this.setState(prevState => ({
        messages: prevState.messages.filter(msg => msg.id !== lastAiMessage.id)
      }), async () => {
        // Send the original prompt to continue generation
        await this.sendPromptToAI(lastUserMessage.content);
      });
    }
  };

  /**
   * Regenerate the last AI response
   */
  regenerateResponse = async () => {
    const lastUserMessage = this.state.messages
      .filter(msg => msg.sender === 'user')
      .pop();
    
    if (lastUserMessage) {
      // Remove the last AI response (all messages after the last user message)
      this.setState(prevState => {
        const lastUserIndex = prevState.messages.findIndex(msg => msg.id === lastUserMessage.id);
        return {
          messages: prevState.messages.slice(0, lastUserIndex + 1)
        };
      }, () => {
        // Regenerate the response
        this.sendPromptToAI(lastUserMessage.content);
      });
    }
  };

  /**
   * Start editing a user message
   */
  startEditingMessage = (messageId: string, content: string) => {
    this.setState({
      editingMessageId: messageId,
      editingContent: content
    });
  };

  /**
   * Cancel editing a message
   */
  cancelEditingMessage = () => {
    this.setState({
      editingMessageId: null,
      editingContent: ''
    });
  };

  /**
   * Toggle markdown view for a message
   */
  toggleMarkdownView = (messageId: string) => {
    this.setState(prevState => ({
      messages: prevState.messages.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            showRawMarkdown: !message.showRawMarkdown
          };
        }
        return message;
      })
    }));
  };

  /**
   * Save edited message and regenerate response
   */
  saveEditedMessage = async () => {
    const { editingMessageId, editingContent } = this.state;
    
    if (!editingMessageId || !editingContent.trim()) {
      return;
    }

    // Update the message content
    this.setState(prevState => ({
      messages: prevState.messages.map(message => {
        if (message.id === editingMessageId) {
          return {
            ...message,
            content: editingContent.trim(),
            isEdited: true,
            originalContent: message.originalContent || message.content
          };
        }
        return message;
      }),
      editingMessageId: null,
      editingContent: ''
    }), async () => {
      // Find the edited message and regenerate the response
      const editedMessage = this.state.messages.find(msg => msg.id === editingMessageId);
      if (editedMessage) {
        // Remove all messages after the edited message
        this.setState(prevState => ({
          messages: prevState.messages.slice(0, prevState.messages.findIndex(msg => msg.id === editingMessageId) + 1)
        }), () => {
          // Regenerate the response
          this.sendPromptToAI(editedMessage.content);
        });
      }
    });
  };

  /**
   * Handle file upload button click
   */
  handleFileUploadClick = () => {
    // Create a hidden file input and trigger it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.txt,.csv,.json,.xlsx,.xls,.md,.xml,.html';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      if (!this.documentService) {
        this.setState({ error: 'Document service not available' });
        return;
      }

      this.setState({ isProcessingDocuments: true });

      try {
        const fileArray = Array.from(files);
        const results: DocumentProcessingResult[] = [];

        // Process each file
        for (const file of fileArray) {
          try {
            // Validate file
            const validation = await this.documentService.validateFile(file);
            if (!validation.valid) {
              this.setState({ error: `File ${file.name}: ${validation.error}` });
              continue;
            }

            // Process file
            const result = await this.documentService.processDocument(file);
            if (result.processing_success) {
              results.push(result);
            } else {
              this.setState({ error: `Failed to process ${file.name}: ${result.error}` });
            }
          } catch (error) {
            this.setState({ error: `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` });
          }
        }

        if (results.length > 0) {
          this.handleDocumentsProcessed(results);
        }
      } catch (error) {
        this.setState({ error: `Error processing documents: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        this.setState({ isProcessingDocuments: false });
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  /**
   * Handle document processing
   */
  handleDocumentsProcessed = (results: DocumentProcessingResult[]) => {
    if (results.length === 0) return;

    // Format document context for chat
    let documentContext = '';
    if (results.length === 1) {
      documentContext = this.documentService!.formatTextForChatContext(results[0]);
    } else {
      documentContext = this.documentService!.formatMultipleTextsForChatContext(results);
    }

    // Add document context to state
    this.setState({ documentContext }, () => {
      // Add a message to show the documents were processed
      const documentMessage: ChatMessage = {
        id: generateId('documents'),
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isDocumentContext: true,
        documentData: {
          results,
          context: documentContext
        }
      };

      this.addMessageToChat(documentMessage);
    });
  };

  /**
   * Handle document processing errors
   */
  handleDocumentError = (error: string) => {
    this.setState({ error });
  };

  /**
   * Handle key press events for global shortcuts
   */
  handleGlobalKeyPress = (e: KeyboardEvent) => {
    // ESC key to stop generation
    if (e.key === 'Escape' && this.state.isStreaming) {
      e.preventDefault();
      this.stopGeneration();
    }
    
    // ESC key to close conversation menu
    if (e.key === 'Escape' && this.state.openConversationMenu) {
      e.preventDefault();
      this.setState({ openConversationMenu: null });
    }
  };

  /**
   * Handle click outside to close conversation menu
   */
  handleClickOutside = (e: MouseEvent) => {
    if (!this.state.openConversationMenu) return;
    
    const target = e.target as Element;
    
    // Don't close if clicking on the menu button or menu itself
    if (target.closest('.history-action-button') || target.closest('.conversation-menu')) {
      return;
    }
    
    // Close the menu
    this.setState({ openConversationMenu: null });
  };

  /**
   * Toggle history accordion
   */
  toggleHistoryAccordion = () => {
    this.setState(prevState => ({
      isHistoryExpanded: !prevState.isHistoryExpanded
    }));
  };

  /**
   * Auto-close accordions on first message
   */
  autoCloseAccordionsOnFirstMessage = () => {
    // Only close if this is the first user message in a new conversation
    const userMessages = this.state.messages.filter(msg => msg.sender === 'user');
    if (userMessages.length === 1 && !this.state.conversation_id) {
      this.setState({
        isHistoryExpanded: false
      });
    }
  };



  /**
   * Build comprehensive search context to inject into user prompt
   */
  buildSearchContextForPrompt = (searchResponse: any, scrapedContent: any): string => {
    let context = `Search Results for "${searchResponse.query}":\n\n`;
    
    // Add basic search results
    if (searchResponse.results && searchResponse.results.length > 0) {
      searchResponse.results.slice(0, 5).forEach((result: any, index: number) => {
        context += `${index + 1}. ${result.title}\n`;
        context += `   URL: ${result.url}\n`;
        if (result.content) {
          const cleanContent = result.content.replace(/\s+/g, ' ').trim().substring(0, 200);
          context += `   Summary: ${cleanContent}${result.content.length > 200 ? '...' : ''}\n`;
        }
        context += '\n';
      });
    }

    // Add detailed scraped content
    if (scrapedContent && scrapedContent.results && scrapedContent.results.length > 0) {
      context += '\nDetailed Content from Web Pages:\n\n';
      
      scrapedContent.results.forEach((result: any, index: number) => {
        if (result.success && result.content) {
          // Find the corresponding search result for title
          const searchResult = searchResponse.results.find((sr: any) => sr.url === result.url);
          const title = searchResult?.title || `Content from ${result.url}`;
          
          context += `Page ${index + 1}: ${title}\n`;
          context += `Source: ${result.url}\n`;
          context += `Full Content: ${result.content}\n\n`;
        }
      });
      
      context += `(Successfully scraped ${scrapedContent.summary.successful_scrapes} out of ${scrapedContent.summary.total_urls} pages)\n`;
    }

    context += '\nPlease use this web search and scraped content information to provide an accurate, up-to-date answer to the user\'s question.';
    
    return context;
  };

  /**
   * Clean up message content by removing excessive newlines and search/document context
   */
  /**
   * Clean message content for display (delegates to ConversationLoader)
   */
  cleanMessageContent = (content: string): string => {
    if (!this.conversationLoader) return content;
    return this.conversationLoader.cleanMessageContent(content);
  };

  /**
   * Add a new message to the chat history
   */
  addMessageToChat = (message: ChatMessage) => {
    // Clean up the message content
    const cleanedMessage = {
      ...message,
      content: this.cleanMessageContent(message.content)
    };
    
    console.log(`💬 Adding message to chat: ${cleanedMessage.sender} - ${cleanedMessage.content.substring(0, 50)}...`);
    this.setState(prevState => ({
      messages: [...prevState.messages, cleanedMessage]
    }), () => {
      console.log(`✅ Message added. Total messages: ${this.state.messages.length}`);
    });
  }

  // Scroll methods now delegated to ChatScrollManager
  isUserNearBottom = (thresholdOverride?: number) => {
    return this.scrollManager.isUserNearBottom(thresholdOverride);
  };

  updateScrollState = (options: { fromUser?: boolean; manualUnlock?: boolean } = {}) => {
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.updateScrollState(options);
  };

  handleScroll = () => {
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.handleScroll();
  };

  handleUserScrollIntent = (source: 'pointer' | 'wheel' | 'touch' | 'key') => {
    this.scrollManager.handleUserScrollIntent(source);
  };

  handleScrollToBottomClick = () => {
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.handleScrollToBottomClick();
  };

  private followStreamIfAllowed = () => {
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.followStreamIfAllowed();
  };

  scrollToBottom = (options?: { behavior?: ScrollBehavior; manual?: boolean; force?: boolean }) => {
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.scrollToBottom(options);
  };

  private debouncedScrollToBottom = (options?: { behavior?: ScrollBehavior; manual?: boolean; force?: boolean }) => {
    this.scrollManager.setMessages(this.state.messages);
    this.scrollManager.debouncedScrollToBottom(options);
  };

  /**
   * Focus the input field
   */
  focusInput = () => {
    if (this.inputRef.current) {
      // Small delay to ensure the UI has updated
      setTimeout(() => {
        if (this.inputRef.current) {
          this.inputRef.current.focus();
        }
      }, 100);
    }
  };

  /**
   * Handle input change
   */
  handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ inputText: e.target.value });
    
    // Auto-resize the textarea: 1 → 4 lines, then scroll
    if (this.inputRef.current) {
      const ta = this.inputRef.current;
      ta.style.height = 'auto';
      const computed = window.getComputedStyle(ta);
      const lineHeight = parseFloat(computed.lineHeight || '0') || 24; // fallback if not computable
      const maxHeight = lineHeight * 4; // 4 lines max
      ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
    }
  };

  /**
   * Handle key press in the input field
   */
  handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  };

  /**
   * Handle sending a message
   */
  handleSendMessage = () => {
    const { inputText } = this.state;
    
    // Don't send empty messages
    if (!inputText.trim() || this.state.isLoading) return;
    
    // Add user message to chat (will be updated with search context if web search is enabled)
    const userMessageId = generateId('user');
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      isEditable: true
    };
    
    this.addMessageToChat(userMessage);

    if (typeof window !== 'undefined') {
      const schedule = window.requestAnimationFrame || ((cb: FrameRequestCallback) => window.setTimeout(cb, 0));
      schedule(() => this.scrollToBottom({ behavior: 'smooth', manual: true }));
    } else {
      this.scrollToBottom({ manual: true });
    }
    
    // Clear input
    this.setState({ inputText: '' });
    
    // Reset textarea height
    if (this.inputRef.current) {
      this.inputRef.current.style.height = 'auto';
    }
    
    // Send to AI and get response
    this.sendPromptToAI(userMessage.content, userMessageId);
    
    // Auto-close accordions on first message
    this.autoCloseAccordionsOnFirstMessage();
  };

  /**
   * Send prompt to AI provider and handle response
   */
  sendPromptToAI = async (prompt: string, userMessageId?: string) => {
    if (!this.aiService || !this.props.services?.api) {
      this.setState({ error: 'API service not available' });
      return;
    }

    if (!this.state.selectedModel) {
      this.setState({ error: 'Please select a model first' });
      return;
    }
    
    console.log(`🚀 Sending prompt to AI with conversation_id: ${this.state.conversation_id || 'null (will create new)'}`);
    
    try {
      // Set loading and streaming state
      this.setState({ isLoading: true, isStreaming: true, error: '' });
      
      // Create abort controller for streaming
      this.currentStreamingAbortController = new AbortController();

      // Build recent chat history for contextualization (exclude system/context-only messages)
      const history = this.state.messages
        .filter(m => !m.isDocumentContext && !(m as any).isRetrievedContext)
        .slice(-6) // last ~3 turns (user+assistant pairs)
        .map(m => ({
          role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }));

      // ground to collection - relevance context search
      const contextRetrievalResult = await this.props.dataRepository.getRelevantContent(
        prompt,
        this.props.selectedCollection.id,
        history
      );

      // Perform context search
      let enhancedPrompt = prompt;

      let relevantContext = '';
      if (contextRetrievalResult && contextRetrievalResult.chunks) {
        relevantContext = contextRetrievalResult.chunks
          .map((result, idx) => {
            return `Excerpt: ${idx}\n${result.content}\n\n`;
          }).join(", ");
        if (relevantContext) {
          enhancedPrompt = `\n${relevantContext}\n\nUser Question: ${prompt}`;
          this.setState({ documentContext: relevantContext }, () => {
            // Add retrieved chunks preview message to UI
            const retrievedMessage: ChatMessage = {
              id: generateId('retrieval'),
              sender: 'ai',
              content: '',
              timestamp: new Date().toISOString(),
              isRetrievedContext: true,
              retrievalData: {
                chunks: contextRetrievalResult.chunks as any,
                context: relevantContext,
                intent: contextRetrievalResult.intent,
                metadata: contextRetrievalResult.metadata,
              },
            };
            this.addMessageToChat(retrievedMessage);
          });
        }
      }
      
      // Create placeholder for AI response
      const placeholderId = generateId('ai');
      
      this.addMessageToChat({
        id: placeholderId,
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });
      
      // Track the current response content for proper abort handling
      let currentResponseContent = '';
      
      // Handle streaming chunks
      const onChunk = (chunk: string) => {
        currentResponseContent += chunk;
        this.setState(prevState => {
          const updatedMessages = prevState.messages.map(message => {
            if (message.id === placeholderId) {
              return {
                ...message,
                content: this.cleanMessageContent(currentResponseContent)
              };
            }
            return message;
          });

          return { ...prevState, messages: updatedMessages };
        }, this.followStreamIfAllowed);
      };
      
      // Handle conversation ID updates
      const onConversationId = (id: string) => {
        console.log(`🔄 Conversation ID received: ${id}`);
        this.setState({ conversation_id: id }, () => {
          console.log(`✅ Conversation ID updated in state: ${this.state.conversation_id}`);
          // Refresh conversations list after a small delay to ensure backend has processed the conversation
          setTimeout(() => {
            this.refreshConversationsList();
          }, 1000);
        });
      };
      
      // Get current page context to pass to AI service
      const pageContext = this.getCurrentPageContext();
      
      // Send prompt to AI
      await this.aiService.sendPrompt(
        enhancedPrompt,
        this.state.selectedModel,
        this.state.useStreaming,
        this.state.conversation_id,
        this.props.conversationType || "chat",
        onChunk,
        onConversationId,
        pageContext,
        this.state.selectedPersona || undefined,
        this.currentStreamingAbortController
      );
      
      // Finalize the message
      this.setState(prevState => {
        console.log('✅ Finalizing message with ID:', placeholderId);
        
        const updatedMessages = prevState.messages.map(message => {
          if (message.id === placeholderId) {
            const shouldPreserveContinue = message.isCutOff;
            console.log(`✅ Finalizing message ${message.id}, isCutOff: ${message.isCutOff}, preserving canContinue: ${shouldPreserveContinue}`);
            
            return {
              ...message,
              isStreaming: false,
              canRegenerate: true,
              // Preserve canContinue state if message was cut off, otherwise set to false
              canContinue: shouldPreserveContinue ? true : false
            };
          }
          return message;
        });
        
        return {
          messages: updatedMessages,
          isLoading: false,
          isStreaming: false
        };
      }, () => {
        console.log(`✅ Message finalized. Total messages: ${this.state.messages.length}`);
        this.followStreamIfAllowed();
        // Focus the input box after response is completed
        this.focusInput();
        
        // Refresh conversations list after the message is complete to include the new conversation
        if (this.state.conversation_id) {
          this.refreshConversationsList();
        }
      });
      
      // Clear abort controller
      this.currentStreamingAbortController = null;
      
    } catch (error) {
      // Check if this was an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, keep the partial response and mark it as stopped
        this.setState(prevState => ({
          isLoading: false,
          isStreaming: false,
          messages: prevState.messages.map(message => ({
            ...message,
            isStreaming: false,
            canRegenerate: true,
            // Only set canContinue and isCutOff for messages that are currently streaming
            canContinue: message.isStreaming ? true : message.canContinue,
            isCutOff: message.isStreaming ? true : message.isCutOff
          }))
        }), () => {
          this.focusInput();
        });
      } else {
        // Real error occurred
        this.setState({
          isLoading: false,
          isStreaming: false,
          error: `Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, () => {
          // Focus input even on error so user can try again
          this.focusInput();
        });
      }
      
      // Clear abort controller
      this.currentStreamingAbortController = null;
    }
  };

  render() {
    const {
      inputText,
      messages,
      isLoading,
      isLoadingHistory,
      useStreaming,
      error,
      isInitializing,
      models,
      isLoadingModels,
      selectedModel,
      conversations,
      selectedConversation,
      showModelSelection,
      showConversationHistory,
      personas,
      selectedPersona,
      isLoadingPersonas,
      showPersonaSelection,
      useWebSearch,
      isSearching
    } = this.state;
    
    const { promptQuestion, selectedCollection, services } = this.props;
    const themeClass = this.state.currentTheme === 'dark' ? 'dark-theme' : '';
    
    return (
      <div className={`braindrive-chat-container ${themeClass}`}>
        <div className="chat-paper">
          {/* Chat header with controls and history dropdown */}
          <ChatHeader
            apiService={services.api}
            dataRepository={this.props.dataRepository}
            models={models}
            selectedModel={selectedModel}
            isLoadingModels={isLoadingModels}
            onModelChange={this.handleModelChange}
            showModelSelection={showModelSelection}
            selectedCollection={selectedCollection}
            personas={personas}
            selectedPersona={selectedPersona}
            onPersonaChange={this.handlePersonaChange}
            showPersonaSelection={showPersonaSelection}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onConversationSelect={this.handleConversationSelect}
            onNewChatClick={this.handleNewChatClick}
            showConversationHistory={true}
            onRenameSelectedConversation={(id) => this.handleRenameConversation(id)}
            onDeleteSelectedConversation={(id) => this.handleDeleteConversation(id)}
            isLoading={isLoading}
            isLoadingHistory={isLoadingHistory}
          />
          
          {/* Show initializing state or chat content */}
          {isInitializing ? (
            <LoadingStates isInitializing={isInitializing} />
          ) : (
            <>
              {/* Chat history area */}
              <div className="h-full max-h-96 overflow-y-auto">
                <ChatHistory
                  messages={messages}
                  isLoading={isLoading}
                  isLoadingHistory={isLoadingHistory}
                  error={error}
                  chatHistoryRef={this.chatHistoryRef}
                  editingMessageId={this.state.editingMessageId}
                  editingContent={this.state.editingContent}
                  onStartEditing={this.startEditingMessage}
                  onCancelEditing={this.cancelEditingMessage}
                  onSaveEditing={this.saveEditedMessage}
                  onEditingContentChange={(content) => this.setState({ editingContent: content })}
                  onRegenerateResponse={this.regenerateResponse}
                  onContinueGeneration={this.continueGeneration}
                  showScrollToBottom={this.state.showScrollToBottom}
                  onScrollToBottom={this.handleScrollToBottomClick}
                  onToggleMarkdown={this.toggleMarkdownView}
                  onScroll={this.handleScroll}
                  onUserScrollIntent={this.handleUserScrollIntent}
                />
              </div>
              
              
              {/* Chat input area */}
              {/* <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
                      <ChatInput />
                  </div>
                </div>
              </div> */}
                <ChatInput
                  inputText={inputText}
                  isLoading={isLoading}
                  isLoadingHistory={isLoadingHistory}
                  isStreaming={this.state.isStreaming}
                  selectedModel={selectedModel}
                  promptQuestion={promptQuestion}
                  onInputChange={this.handleInputChange}
                  onKeyPress={this.handleKeyPress}
                  onSendMessage={this.handleSendMessage}
                  onStopGeneration={this.stopGeneration}
                  onFileUpload={this.handleFileUploadClick}
                  inputRef={this.inputRef}
                  personas={personas}
                  selectedPersona={selectedPersona}
                  onPersonaChange={this.handlePersonaChange}
                  onPersonaToggle={this.handlePersonaToggle}
                  showPersonaSelection={false} // Moved to header
                />
                <div className="pl-4">
                  <DocumentManagerModal
                    apiService={services.api}
                    dataRepository={this.props.dataRepository}
                    collectionId={selectedCollection.id}
                    onDocumentListChange={() => console.log("document changed")}
                    documents={[]}
                    chatSessions={[]}
                  />
                </div>
            </>
          )}
          
          {/* Bottom history panel removed; history is now in header */}
        </div>
      </div>
    );
  }
}
