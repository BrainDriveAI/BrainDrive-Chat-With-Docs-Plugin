/**
 * @jest-environment jsdom
 */

import { ConversationRepository, Conversation } from '../ConversationRepository';

describe('ConversationRepository', () => {
  let mockApi: any;
  let repository: ConversationRepository;

  beforeEach(() => {
    mockApi = {
      get: jest.fn()
    };
    repository = new ConversationRepository({ api: mockApi });
  });

  describe('fetchConversations', () => {
    const mockConversations: Conversation[] = [
      {
        id: 'conv-1',
        user_id: 'user-123',
        conversation_type: 'chat',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      },
      {
        id: 'conv-2',
        user_id: 'user-123',
        conversation_type: 'chat',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z'
      }
    ];

    it('should fetch conversations with default params', async () => {
      mockApi.get.mockResolvedValue(mockConversations);

      const result = await repository.fetchConversations({
        userId: 'user-123'
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/v1/users/user-123/conversations',
        {
          params: {
            skip: 0,
            limit: 50,
            conversation_type: 'chat'
          }
        }
      );
      expect(result).toEqual(mockConversations);
    });

    it('should fetch conversations with custom params', async () => {
      mockApi.get.mockResolvedValue(mockConversations);

      const result = await repository.fetchConversations({
        userId: 'user-123',
        conversationType: 'direct',
        pageId: 'page-456',
        skip: 10,
        limit: 20
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/v1/users/user-123/conversations',
        {
          params: {
            skip: 10,
            limit: 20,
            conversation_type: 'direct',
            page_id: 'page-456'
          }
        }
      );
      expect(result).toEqual(mockConversations);
    });

    it('should handle array response', async () => {
      mockApi.get.mockResolvedValue(mockConversations);

      const result = await repository.fetchConversations({ userId: 'user-123' });

      expect(result).toEqual(mockConversations);
    });

    it('should handle nested data property response', async () => {
      mockApi.get.mockResolvedValue({ data: mockConversations });

      const result = await repository.fetchConversations({ userId: 'user-123' });

      expect(result).toEqual(mockConversations);
    });

    it('should handle single conversation object response', async () => {
      const singleConv = mockConversations[0];
      mockApi.get.mockResolvedValue(singleConv);

      const result = await repository.fetchConversations({ userId: 'user-123' });

      expect(result).toEqual([singleConv]);
    });

    it('should return empty array for empty response', async () => {
      mockApi.get.mockResolvedValue([]);

      const result = await repository.fetchConversations({ userId: 'user-123' });

      expect(result).toEqual([]);
    });

    it('should filter out invalid conversations', async () => {
      const mixedData = [
        { id: 'conv-1', user_id: 'user-123', conversation_type: 'chat', created_at: '2024-01-01T00:00:00Z' },
        { id: 'conv-2' }, // Missing user_id
        { user_id: 'user-123' }, // Missing id
        null,
        undefined,
        'invalid',
        { id: 'conv-3', user_id: 'user-123', conversation_type: 'chat', created_at: '2024-01-01T00:00:00Z' }
      ];

      mockApi.get.mockResolvedValue(mixedData);

      const result = await repository.fetchConversations({ userId: 'user-123' });

      expect(result).toEqual([
        { id: 'conv-1', user_id: 'user-123', conversation_type: 'chat', created_at: '2024-01-01T00:00:00Z' },
        { id: 'conv-3', user_id: 'user-123', conversation_type: 'chat', created_at: '2024-01-01T00:00:00Z' }
      ]);
    });

    it('should not include page_id param when pageId is null', async () => {
      mockApi.get.mockResolvedValue([]);

      await repository.fetchConversations({
        userId: 'user-123',
        pageId: null
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/v1/users/user-123/conversations',
        {
          params: {
            skip: 0,
            limit: 50,
            conversation_type: 'chat'
          }
        }
      );
    });
  });

  describe('sortByRecency', () => {
    it('should sort by last_message_at (highest priority)', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z'
        },
        {
          id: 'conv-2',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      const sorted = repository.sortByRecency(conversations);

      expect(sorted[0].id).toBe('conv-2'); // More recent last_message_at
      expect(sorted[1].id).toBe('conv-1');
    });

    it('should fall back to updated_at when last_message_at missing', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'conv-2',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z'
        }
      ];

      const sorted = repository.sortByRecency(conversations);

      expect(sorted[0].id).toBe('conv-2');
      expect(sorted[1].id).toBe('conv-1');
    });

    it('should fall back to created_at when other fields missing', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-05T00:00:00Z'
        },
        {
          id: 'conv-2',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const sorted = repository.sortByRecency(conversations);

      expect(sorted[0].id).toBe('conv-1'); // More recent created_at
      expect(sorted[1].id).toBe('conv-2');
    });

    it('should handle conversations with no timestamp fields', () => {
      const conversations: Conversation[] = [
        { id: 'conv-1', user_id: 'user-123', conversation_type: 'chat', created_at: '2024-01-01T00:00:00Z' },
        { id: 'conv-2', user_id: 'user-123', conversation_type: 'chat', created_at: '2024-01-01T00:00:00Z' }
      ];

      const sorted = repository.sortByRecency(conversations);

      expect(sorted).toHaveLength(2);
      // Order is preserved when timestamps are equal (0)
    });

    it('should not mutate original array', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-03T00:00:00Z'
        },
        {
          id: 'conv-2',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const original = [...conversations];
      const sorted = repository.sortByRecency(conversations);

      expect(conversations).toEqual(original); // Original unchanged
      expect(sorted).not.toBe(conversations); // New array returned
    });

    it('should handle invalid date strings', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: 'invalid-date'
        },
        {
          id: 'conv-2',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const sorted = repository.sortByRecency(conversations);

      expect(sorted[0].id).toBe('conv-2'); // Valid date comes first
      expect(sorted[1].id).toBe('conv-1'); // Invalid date treated as 0
    });

    it('should handle mixed timestamp scenarios', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z',
          last_message_at: '2024-01-05T00:00:00Z'
        },
        {
          id: 'conv-2',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z'
        },
        {
          id: 'conv-3',
          user_id: 'user-123',
          conversation_type: 'chat',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const sorted = repository.sortByRecency(conversations);

      expect(sorted[0].id).toBe('conv-1'); // last_message_at takes priority
      expect(sorted[1].id).toBe('conv-2'); // updated_at second priority
      expect(sorted[2].id).toBe('conv-3'); // created_at lowest priority
    });
  });
});
