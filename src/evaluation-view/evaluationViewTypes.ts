// Evaluation view types based on plugin evaluation API

export interface TestCase {
  test_case_id: string;
  question: string;
  category: string;
  retrieved_context: string;
  ground_truth?: string;
}

export interface StartEvaluationResponse {
  evaluation_run_id: string;
  test_data: TestCase[];
}

export interface SubmissionItem {
  test_case_id: string;
  llm_answer: string;
  retrieved_context: string;
}

export interface SubmitEvaluationRequest {
  evaluation_run_id: string;
  submissions: SubmissionItem[];
}

export interface SubmitEvaluationResponse {
  evaluation_run_id: string;
  processed_count: number;
  skipped_count: number;
  total_evaluated: number;
  total_questions: number;
  progress: number;
  is_completed: boolean;
  correct_count: number;
  incorrect_count: number;
}

export interface EvaluationRun {
  id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  started_at: string;
  completed_at?: string;
  is_completed: boolean;
  progress: number;
  status: 'completed' | 'running' | 'failed' | 'pending';
  duration_seconds: number | null;
  run_date: string;
  config_snapshot?: Record<string, any>;
}

export interface EvaluationFeatureState {
  // Current active run
  activeRun: EvaluationRun | null;
  activeRunId: string | null;
  testCases: TestCase[];

  // UI state
  isRunning: boolean;
  isGenerating: boolean;
  progress: number;
  error: string | null;

  // Results
  currentResults: SubmitEvaluationResponse | null;

  // History (store locally for now)
  pastRuns: EvaluationRun[];
  selectedHistoryRun: EvaluationRun | null;
}

export type EvaluationViewStateUpdater = (newState: Partial<EvaluationFeatureState>) => void;

// For tracking generation progress
export interface GenerationProgress {
  currentQuestion: number;
  totalQuestions: number;
  currentBatch: number;
  totalBatches: number;
}

// Detailed result for individual test case
export interface DetailedEvaluationResult {
  test_case_id: string;
  question: string;
  llm_answer: string;
  judge_correct: boolean;
  judge_reasoning: string;
  judge_factual_errors?: string[];
  judge_missing_info?: string[];
  retrieved_context: string;
  ground_truth?: string;
  category?: string;
}

// API response types
export interface GetEvaluationRunsResponse {
  runs: EvaluationRun[];
  total: number;
}

export interface GetEvaluationResultsResponse {
  evaluation_run: EvaluationRun;
  results: DetailedEvaluationResult[];
}

// Request for starting evaluation with custom questions
export interface StartWithQuestionsRequest {
  collection_id: string;
  questions: string[];
}
