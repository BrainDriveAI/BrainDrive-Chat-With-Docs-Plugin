// Evaluation view types based on plugin evaluation API
import type { EvaluationStage } from './evaluationStages';

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
  message: string;
  evaluation_run_id: string;
  submitted_count: number;
}

export interface EvaluationRun {
  id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  evaluated_count: number;
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

  // Stage tracking
  currentStage?: EvaluationStage;
  stageProgress?: number; // 0-100 overall progress

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

// Model settings for persona
export interface PersonaModelSettings {
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  context_window: number;
  stop_sequences: string[];
}

// Persona configuration for API requests (all fields optional)
export interface PersonaConfigRequest {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  system_prompt?: string | null;
  model_settings: PersonaModelSettings;
  created_at?: string | null;
  updated_at?: string | null;
}

// Request for starting evaluation with custom questions
export interface StartWithQuestionsRequest {
  collection_id: string;
  questions: string[];
  llm_model: string;
  persona?: PersonaConfigRequest | null;
}
