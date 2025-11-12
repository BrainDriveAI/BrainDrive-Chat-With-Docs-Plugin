/**
 * UserRepository
 *
 * Domain repository responsible for user data operations.
 * Single Responsibility: User data access and management.
 */

export interface User {
  id: string;
  [key: string]: any;
}

export interface UserRepositoryDeps {
  api: any;
}

export class UserRepository {
  private api: any;

  constructor(deps: UserRepositoryDeps) {
    this.api = deps.api;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response: any = await this.api.get('/api/v1/auth/me');

    if (!response.id) {
      throw new Error('Could not get current user ID');
    }

    return response;
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string> {
    const user = await this.getCurrentUser();
    return user.id;
  }
}
