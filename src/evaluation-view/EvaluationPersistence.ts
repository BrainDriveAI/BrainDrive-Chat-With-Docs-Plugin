import type { ModelInfo, PersonaInfo } from '../components/chat-header/types';
import type { TestCase, SubmissionItem } from './evaluationViewTypes';
import * as stateApi from './evaluationStateApiService';

const STORAGE_KEY = 'braindrive_evaluation_in_progress';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PersistedEvaluationState {
  runId: string;
  model: ModelInfo;
  llmModel: string;
  persona: PersonaInfo | null;
  collectionId?: string;
  testCases: TestCase[];
  processedQuestionIds: string[];
  currentBatch: SubmissionItem[];
  timestamp: number;
}

export class EvaluationPersistence {
  /**
   * Save evaluation state to localStorage
   */
  static saveState(state: PersistedEvaluationState): void {
    try {
      const stateWithTimestamp = {
        ...state,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp));
    } catch (error) {
      console.error('Failed to save evaluation state:', error);
    }
  }

  /**
   * Load evaluation state from localStorage
   */
  static loadState(): PersistedEvaluationState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as PersistedEvaluationState;

      // Check if state is stale
      if (this.isStale(state)) {
        this.clearState();
        return null;
      }

      return state;
    } catch (error) {
      console.error('Failed to load evaluation state:', error);
      return null;
    }
  }

  /**
   * Clear evaluation state from localStorage
   */
  static clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear evaluation state:', error);
    }
  }

  /**
   * Check if state is stale (older than 1 hour)
   */
  static isStale(state: PersistedEvaluationState): boolean {
    const age = Date.now() - state.timestamp;
    return age > MAX_AGE_MS;
  }

  /**
   * Check if there's an in-progress evaluation
   */
  static hasInProgressEvaluation(): boolean {
    const state = this.loadState();
    return state !== null;
  }

  /**
   * Get remaining questions count
   */
  static getRemainingQuestionsCount(): number {
    const state = this.loadState();
    if (!state) return 0;

    return state.testCases.length - state.processedQuestionIds.length;
  }

  /**
   * Save evaluation state to both localStorage AND backend
   * Dual persistence for reliability
   */
  static async saveStateWithBackend(state: PersistedEvaluationState, userId?: string): Promise<void> {
    // Always save to localStorage (fast, synchronous)
    this.saveState(state);

    // Also save to backend if userId available (durable, async)
    if (userId) {
      await stateApi.saveEvaluationState(state.runId, state, userId);
      // Errors are handled gracefully in API service (returns null)
    }
  }

  /**
   * Load evaluation state from backend first, fallback to localStorage
   * Provides cross-device and long-term persistence
   */
  static async loadStateWithBackend(runId: string, userId?: string): Promise<PersistedEvaluationState | null> {
    // Try backend first if userId available
    if (userId) {
      const backendResponse = await stateApi.loadEvaluationState(runId, userId);
      if (backendResponse?.state) {
        console.log('Loaded evaluation state from backend');
        return backendResponse.state;
      }
    }

    // Fallback to localStorage
    console.log('Loading evaluation state from localStorage');
    return this.loadState();
  }

  /**
   * Clear evaluation state from both localStorage AND backend
   */
  static async clearStateWithBackend(runId: string, userId?: string): Promise<void> {
    // Clear localStorage
    this.clearState();

    // Also clear backend if userId available
    if (userId) {
      await stateApi.deleteEvaluationState(runId, userId);
      // Errors are handled gracefully in API service
    }
  }

  /**
   * List all in-progress evaluations from backend
   */
  static async listInProgressEvaluations(userId: string): Promise<stateApi.StateSummary[]> {
    const response = await stateApi.listInProgressEvaluations(userId, false);
    return response?.evaluations || [];
  }
}
