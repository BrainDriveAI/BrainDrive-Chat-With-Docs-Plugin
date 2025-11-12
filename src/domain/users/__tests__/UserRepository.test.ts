/**
 * @jest-environment jsdom
 */

import { UserRepository } from '../UserRepository';

describe('UserRepository', () => {
  let mockApi: any;
  let repository: UserRepository;

  beforeEach(() => {
    mockApi = {
      get: jest.fn()
    };
    repository = new UserRepository({ api: mockApi });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user from API', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockApi.get.mockResolvedValue(mockUser);

      const result = await repository.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user has no ID', async () => {
      mockApi.get.mockResolvedValue({ email: 'test@example.com' });

      await expect(repository.getCurrentUser()).rejects.toThrow('Could not get current user ID');
    });

    it('should throw error if API call fails', async () => {
      mockApi.get.mockRejectedValue(new Error('API error'));

      await expect(repository.getCurrentUser()).rejects.toThrow('API error');
    });
  });

  describe('getCurrentUserId', () => {
    it('should return user ID', async () => {
      mockApi.get.mockResolvedValue({ id: 'user-456' });

      const userId = await repository.getCurrentUserId();

      expect(userId).toBe('user-456');
    });

    it('should throw error if user has no ID', async () => {
      mockApi.get.mockResolvedValue({});

      await expect(repository.getCurrentUserId()).rejects.toThrow('Could not get current user ID');
    });
  });
});
