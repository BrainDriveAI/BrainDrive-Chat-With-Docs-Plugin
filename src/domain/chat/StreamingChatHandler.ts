/**
 * StreamingChatHandler
 *
 * Domain service responsible for streaming AI request lifecycle management.
 * Single Responsibility: Orchestrate streaming AI requests with abort control.
 */

import type { ModelInfo, PersonaInfo } from '../../collection-chat-view/chatViewTypes';
import type { AIService } from '../../services';

export interface StreamingRequest {
  prompt: string;
  conversationType: string;
  conversationId: string | null;
  selectedModel: ModelInfo;
  selectedPersona?: PersonaInfo;
  useStreaming: boolean;
  pageContext?: any;
}

export interface StreamingCallbacks {
  onChunk: (chunk: string) => void;
  onConversationId: (id: string) => void;
}

export interface StreamingChatHandlerDeps {
  aiService: AIService;
}

export class StreamingChatHandler {
  private aiService: AIService;
  private currentAbortController: AbortController | null = null;

  constructor(deps: StreamingChatHandlerDeps) {
    this.aiService = deps.aiService;
  }

  /**
   * Send prompt to AI with streaming support
   * @returns Promise that resolves when streaming completes
   * @throws AbortError if streaming is cancelled
   */
  async sendPrompt(
    request: StreamingRequest,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    // Create new abort controller
    this.currentAbortController = new AbortController();

    try {
      await this.aiService.sendPrompt(
        request.prompt,
        request.selectedModel,
        request.useStreaming,
        request.conversationId,
        request.conversationType,
        callbacks.onChunk,
        callbacks.onConversationId,
        request.pageContext,
        request.selectedPersona,
        this.currentAbortController
      );
    } finally {
      // Always clear abort controller
      this.currentAbortController = null;
    }
  }

  /**
   * Stop current streaming generation
   */
  async stopGeneration(conversationId: string | null): Promise<void> {
    console.log('🛑 StreamingChatHandler: stopGeneration called');

    // Abort the frontend request
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    // Try to cancel backend generation (best effort)
    if (conversationId) {
      try {
        await this.aiService.cancelGeneration(conversationId);
      } catch (error) {
        console.error('Error canceling backend generation:', error);
        // Continue anyway - abort controller handles frontend cancellation
      }
    }
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.currentAbortController !== null;
  }

  /**
   * Get current abort controller (for external abort management)
   */
  getAbortController(): AbortController | null {
    return this.currentAbortController;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}
