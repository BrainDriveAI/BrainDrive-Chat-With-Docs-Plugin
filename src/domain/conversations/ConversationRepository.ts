/**
 * ConversationRepository
 *
 * Domain repository responsible for conversation data operations.
 * Single Responsibility: Conversation data access and sorting.
 */

export interface Conversation {
  id: string;
  user_id: string;
  conversation_type: string;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  title?: string;
  persona_id?: string;
  model?: string;
  server?: string;
  [key: string]: any;
}

export interface FetchConversationsParams {
  userId: string;
  conversationType?: string;
  pageId?: string | null;
  skip?: number;
  limit?: number;
}

export interface ConversationRepositoryDeps {
  api: any;
}

export class ConversationRepository {
  private api: any;

  constructor(deps: ConversationRepositoryDeps) {
    this.api = deps.api;
  }

  /**
   * Fetch conversations from API
   */
  async fetchConversations(params: FetchConversationsParams): Promise<Conversation[]> {
    const {
      userId,
      conversationType = 'chat',
      pageId = null,
      skip = 0,
      limit = 50
    } = params;

    const queryParams: any = {
      skip,
      limit,
      conversation_type: conversationType
    };

    if (pageId) {
      queryParams.page_id = pageId;
    }

    const response: any = await this.api.get(
      `/api/v1/users/${userId}/conversations`,
      { params: queryParams }
    );

    return this.extractConversationsFromResponse(response);
  }

  /**
   * Extract conversations array from various API response formats
   */
  private extractConversationsFromResponse(response: any): Conversation[] {
    // Array response
    if (Array.isArray(response)) {
      return this.validateConversations(response);
    }

    // Nested data property
    if (response && response.data && Array.isArray(response.data)) {
      return this.validateConversations(response.data);
    }

    // Single conversation object
    if (response && typeof response === 'object' && response.id && response.user_id) {
      return [response];
    }

    return [];
  }

  /**
   * Validate conversation objects
   */
  private validateConversations(conversations: any[]): Conversation[] {
    return conversations.filter((conv: any) => {
      return conv && typeof conv === 'object' && conv.id && conv.user_id;
    });
  }

  /**
   * Sort conversations by recency (most recent first)
   */
  sortByRecency(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort((a, b) => {
      const timeA = this.getSortTimestamp(a);
      const timeB = this.getSortTimestamp(b);
      return timeB - timeA;
    });
  }

  /**
   * Get sort timestamp from conversation
   * Checks multiple candidate fields in priority order
   */
  private getSortTimestamp(conversation: Conversation): number {
    if (!conversation || typeof conversation !== 'object') {
      return 0;
    }

    const candidateFields = [
      'last_message_at',
      'updated_at',
      'created_at',
      'lastMessageAt',
      'updatedAt',
      'createdAt'
    ];

    for (const field of candidateFields) {
      const value = conversation[field];
      if (value) {
        const timestamp = new Date(value).getTime();
        if (!isNaN(timestamp)) {
          return timestamp;
        }
      }
    }

    return 0;
  }
}
