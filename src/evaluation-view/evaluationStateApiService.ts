import { CHAT_SERVICE_API_BASE } from '../constants';
import type { PersistedEvaluationState } from './EvaluationPersistence';

const EVALUATION_STATE_API_BASE = `${CHAT_SERVICE_API_BASE}/api/evaluation/state`;

/**
 * Response from save state API
 */
export interface SaveStateResponse {
  success: boolean;
  state_id: string;
  message?: string;
}

/**
 * Response from load state API
 */
export interface LoadStateResponse {
  state: PersistedEvaluationState;
  metadata: {
    age_hours: number;
    age_days: number;
    is_expired: boolean;
    will_expire_in_hours: number;
    backend_evaluation_status: string;
  };
}

/**
 * Summary of an in-progress evaluation
 */
export interface StateSummary {
  run_id: string;
  model_name: string;
  collection_id?: string;
  total_questions: number;
  processed_questions: number;
  remaining_questions: number;
  last_updated: string;
  age_hours: number;
  age_days: number;
  is_expired: boolean;
  progress_percentage: number;
}

/**
 * Response from list in-progress API
 */
export interface ListInProgressResponse {
  evaluations: StateSummary[];
  total_count: number;
}

/**
 * Error response from API
 */
export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

/**
 * Transform frontend state (camelCase) to backend format (snake_case)
 */
function transformStateToBackendFormat(state: PersistedEvaluationState) {
  return {
    user_id: '', // Will be set by caller
    model: {
      id: state.model.serverId || state.model.providerId || 'unknown',
      provider: state.model.provider,
      name: state.model.name,
    },
    llm_model: state.llmModel,
    persona: state.persona,
    collection_id: state.collectionId,
    test_cases: state.testCases,
    processed_question_ids: state.processedQuestionIds,
    current_batch: state.currentBatch,
    last_updated: new Date(state.timestamp).toISOString(),
  };
}

/**
 * Transform backend state (snake_case) to frontend format (camelCase)
 */
function transformStateFromBackendFormat(backendState: any, runId: string): PersistedEvaluationState {
  return {
    runId: runId, // Use runId from path parameter
    model: backendState.model,
    llmModel: backendState.llm_model || backendState.llmModel,
    persona: backendState.persona,
    collectionId: backendState.collection_id || backendState.collectionId,
    testCases: backendState.test_cases || backendState.testCases,
    processedQuestionIds: backendState.processed_question_ids || backendState.processedQuestionIds,
    currentBatch: backendState.current_batch || backendState.currentBatch,
    timestamp: backendState.last_updated
      ? new Date(backendState.last_updated).getTime()
      : backendState.timestamp || Date.now(),
  };
}

/**
 * Save evaluation state to backend
 * @param runId - Evaluation run ID
 * @param state - Persisted evaluation state
 * @param userId - User ID (extracted from BrainDrive auth)
 * @returns Promise<SaveStateResponse | null> - null on error (graceful degradation)
 */
export async function saveEvaluationState(
  runId: string,
  state: PersistedEvaluationState,
  userId: string
): Promise<SaveStateResponse | null> {
  try {
    // Transform state to backend format
    const backendState = transformStateToBackendFormat(state);
    backendState.user_id = userId;

    const response = await fetch(`${EVALUATION_STATE_API_BASE}/${runId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendState),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }));
      console.error('Failed to save evaluation state:', error);
      return null; // Graceful degradation
    }

    return response.json();
  } catch (error) {
    console.error('Error saving evaluation state:', error);
    return null; // Graceful degradation
  }
}

/**
 * Load evaluation state from backend
 * @param runId - Evaluation run ID
 * @param userId - User ID (extracted from BrainDrive auth)
 * @returns Promise<LoadStateResponse | null> - null if not found or error
 */
export async function loadEvaluationState(
  runId: string,
  userId: string
): Promise<LoadStateResponse | null> {
  try {
    const response = await fetch(`${EVALUATION_STATE_API_BASE}/${runId}?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Evaluation state not found in backend');
        return null;
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }));
      console.error('Failed to load evaluation state:', error);
      return null;
    }

    const data = await response.json();

    // If state is expired, return null (soft error)
    if (data.metadata?.is_expired) {
      console.log('Evaluation state expired in backend');
      return null;
    }

    // Transform backend state to frontend format
    const transformedData: LoadStateResponse = {
      state: transformStateFromBackendFormat(data.state, runId),
      metadata: data.metadata,
    };

    return transformedData;
  } catch (error) {
    console.error('Error loading evaluation state:', error);
    return null;
  }
}

/**
 * Delete evaluation state from backend
 * @param runId - Evaluation run ID
 * @param userId - User ID (extracted from BrainDrive auth)
 * @returns Promise<boolean> - true if successful or idempotent (already deleted)
 */
export async function deleteEvaluationState(
  runId: string,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${EVALUATION_STATE_API_BASE}/${runId}?user_id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 204 No Content is success
    if (response.status === 204 || response.ok) {
      return true;
    }

    console.error('Failed to delete evaluation state:', response.status);
    return false;
  } catch (error) {
    console.error('Error deleting evaluation state:', error);
    return false;
  }
}

/**
 * List all in-progress evaluations for current user
 * @param userId - User ID (extracted from BrainDrive auth)
 * @param includeExpired - Include expired states (default: false)
 * @returns Promise<ListInProgressResponse | null> - null on error
 */
export async function listInProgressEvaluations(
  userId: string,
  includeExpired: boolean = false
): Promise<ListInProgressResponse | null> {
  try {
    const params = new URLSearchParams({
      user_id: userId,
      include_expired: String(includeExpired),
    });

    const response = await fetch(`${EVALUATION_STATE_API_BASE}/in-progress?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }));
      console.error('Failed to list in-progress evaluations:', error);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error listing in-progress evaluations:', error);
    return null;
  }
}
