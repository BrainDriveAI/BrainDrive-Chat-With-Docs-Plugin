import { CHAT_SERVICE_API_BASE } from '../constants';
import type {
  StartEvaluationResponse,
  SubmitEvaluationRequest,
  SubmitEvaluationResponse,
  GetEvaluationRunsResponse,
  GetEvaluationResultsResponse,
  StartWithQuestionsRequest,
} from '../evaluation-view/evaluationViewTypes';

const EVALUATION_API_BASE = `${CHAT_SERVICE_API_BASE}/api/evaluation`;

/**
 * Start plugin evaluation
 * Returns test questions with pre-fetched context
 */
export async function startPluginEvaluation(): Promise<StartEvaluationResponse> {
  const response = await fetch(`${EVALUATION_API_BASE}/plugin/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to start evaluation');
  }

  return response.json();
}

/**
 * Submit plugin evaluation answers
 * Backend queues judging as background task and returns 202 Accepted
 */
export async function submitPluginEvaluation(
  request: SubmitEvaluationRequest
): Promise<SubmitEvaluationResponse> {
  const response = await fetch(`${EVALUATION_API_BASE}/plugin/submit-with-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  // Accept both 200 and 202 status codes
  if (!response.ok && response.status !== 202) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to submit evaluation');
  }

  return response.json();
}

/**
 * Get evaluation runs
 * Returns list of past evaluation runs
 */
export async function getEvaluationRuns(limit = 50): Promise<GetEvaluationRunsResponse> {
  const response = await fetch(`${EVALUATION_API_BASE}/runs?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to fetch evaluation runs');
  }

  return response.json();
}

/**
 * Get evaluation results for a specific run
 * Returns detailed results with judge feedback
 */
export async function getEvaluationResults(
  evaluationId: string
): Promise<GetEvaluationResultsResponse> {
  const response = await fetch(`${EVALUATION_API_BASE}/results/${evaluationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to fetch evaluation results');
  }

  return response.json();
}

/**
 * Start plugin evaluation with custom questions from a collection
 * Returns test questions with pre-fetched context from specified collection
 */
export async function startPluginEvaluationWithQuestions(
  request: StartWithQuestionsRequest
): Promise<StartEvaluationResponse> {
  const response = await fetch(`${EVALUATION_API_BASE}/plugin/start-with-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to start evaluation with questions');
  }

  return response.json();
}
