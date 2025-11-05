import { AIService } from '../services/aiService';
import {
  startPluginEvaluation,
  submitPluginEvaluation,
  startPluginEvaluationWithQuestions,
} from '../services';
import type { ModelInfo, PersonaInfo } from '../components/chat-header/types';
import type {
  EvaluationFeatureState,
  EvaluationViewStateUpdater,
  TestCase,
  SubmissionItem,
  EvaluationRun,
} from './evaluationViewTypes';
import { EvaluationPersistence, type PersistedEvaluationState } from './EvaluationPersistence';

interface ServiceDependencies {
  aiService: AIService;
  setError: (error: string | null) => void;
}

export class EvaluationService {
  private state: EvaluationFeatureState;
  private updateShellState: EvaluationViewStateUpdater;
  private deps: ServiceDependencies;
  private abortController: AbortController | null = null;
  private currentModel: ModelInfo | null = null;
  private currentPersona: PersonaInfo | null = null;
  private currentCollectionId: string | null = null;
  private processedQuestionIds: Set<string> = new Set();

  constructor(
    initialState: EvaluationFeatureState,
    deps: ServiceDependencies,
    updateShellState: EvaluationViewStateUpdater
  ) {
    this.state = initialState;
    this.deps = deps;
    this.updateShellState = updateShellState;
  }

  private updateState(newState: Partial<EvaluationFeatureState>): void {
    this.state = { ...this.state, ...newState };
    this.updateShellState(newState);
  }

  /**
   * Run complete evaluation workflow
   */
  public runEvaluation = async (
    selectedModel: ModelInfo,
    selectedPersona: PersonaInfo | null = null,
    collectionId?: string | null,
    questions?: string[] | null
  ): Promise<void> => {
    this.updateState({ isRunning: true, error: null, progress: 0 });
    this.abortController = new AbortController();

    // Save current run config
    this.currentModel = selectedModel;
    this.currentPersona = selectedPersona;
    this.currentCollectionId = collectionId || null;
    this.processedQuestionIds.clear();

    try {
      // Step 1: Start evaluation - get test questions with context
      console.log('Starting evaluation...');

      const { evaluation_run_id, test_data } = collectionId && questions
        ? await startPluginEvaluationWithQuestions({ collection_id: collectionId, questions })
        : await startPluginEvaluation();
      console.log(`Evaluation started: ${evaluation_run_id}`);
      console.log(`Total questions: ${test_data.length}`);

      this.updateState({
        activeRunId: evaluation_run_id,
        testCases: test_data,
        activeRun: {
          id: evaluation_run_id,
          total_questions: test_data.length,
          correct_count: 0,
          incorrect_count: 0,
          accuracy: 0,
          started_at: new Date().toISOString(),
          is_completed: false,
          progress: 0,
        },
      });

      // Initial persistence save
      this.savePersistenceState(evaluation_run_id, test_data);

      // Step 2: Process questions in batches
      const BATCH_SIZE = 3;
      const batches: TestCase[][] = [];

      for (let i = 0; i < test_data.length; i += BATCH_SIZE) {
        batches.push(test_data.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check if aborted
        if (this.abortController?.signal.aborted) {
          console.log('Evaluation aborted by user');
          this.updateState({ isRunning: false });
          // Keep persistence on abort (allows resume)
          return;
        }

        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

        // Step 3: Generate LLM answers for this batch
        this.updateState({ isGenerating: true });
        const submissions: SubmissionItem[] = [];

        for (const testCase of batch) {
          const answer = await this.generateAnswerForQuestion(
            testCase,
            selectedModel,
            selectedPersona
          );
          submissions.push({
            test_case_id: testCase.test_case_id,
            llm_answer: answer,
            retrieved_context: testCase.retrieved_context,
          });

          // Mark question as processed
          this.processedQuestionIds.add(testCase.test_case_id);
        }

        this.updateState({ isGenerating: false });

        // Step 4: Submit batch for judging
        console.log(`Submitting ${submissions.length} answers...`);
        const result = await submitPluginEvaluation({
          evaluation_run_id,
          submissions,
        });

        console.log(`Batch ${batchIndex + 1} results:`, result);

        // Update progress and results
        this.updateState({
          progress: result.progress,
          currentResults: result,
          activeRun: {
            ...this.state.activeRun!,
            progress: result.progress,
            correct_count: result.correct_count,
            incorrect_count: result.incorrect_count,
            accuracy: (result.correct_count / result.total_questions) * 100,
          },
        });

        // Save progress to persistence
        this.savePersistenceState(evaluation_run_id, test_data);

        // Check if completed
        if (result.is_completed) {
          console.log('Evaluation completed!');
          const completedRun: EvaluationRun = {
            id: evaluation_run_id,
            total_questions: result.total_questions,
            correct_count: result.correct_count,
            incorrect_count: result.incorrect_count,
            accuracy: (result.correct_count / result.total_questions) * 100,
            started_at: this.state.activeRun!.started_at,
            completed_at: new Date().toISOString(),
            is_completed: true,
            progress: 1.0,
          };

          this.updateState({
            isRunning: false,
            activeRun: completedRun,
            pastRuns: [completedRun, ...this.state.pastRuns],
          });

          // Clear persistence on completion
          EvaluationPersistence.clearState();
          break;
        }
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMsg, isRunning: false });
      this.deps.setError(errorMsg);

      // Clear persistence on error
      EvaluationPersistence.clearState();
    }
  };

  /**
   * Generate answer for single question using AIService
   */
  private async generateAnswerForQuestion(
    testCase: TestCase,
    selectedModel: ModelInfo,
    selectedPersona: PersonaInfo | null
  ): Promise<string> {
    console.log(`Generating answer for: ${testCase.question}`);

    // Build prompt with context (context already provided from backend)
    const prompt = `Context:\n${testCase.retrieved_context}\n\nQuestion: ${testCase.question}\n\nAnswer:`;

    let answer = '';

    // Use AIService to generate answer (non-streaming for evaluation)
    await this.deps.aiService.sendPrompt(
      prompt,
      selectedModel,
      false, // non-streaming
      null, // no conversation_id
      'evaluation', // conversationType
      (chunk: string) => {
        answer += chunk;
      },
      () => {}, // onConversationId - not needed
      undefined, // pageContext
      undefined, // persona
      this.abortController || undefined
    );

    return answer.trim();
  }

  /**
   * Stop running evaluation
   */
  public stopEvaluation = (): void => {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.updateState({ isRunning: false, isGenerating: false });
  };

  /**
   * Clear error
   */
  public clearError = (): void => {
    this.updateState({ error: null });
    this.deps.setError(null);
  };

  /**
   * View history run details
   */
  public selectHistoryRun = (run: EvaluationRun): void => {
    this.updateState({ selectedHistoryRun: run });
  };

  /**
   * Start new evaluation (reset state)
   */
  public startNewEvaluation = (): void => {
    this.updateState({
      activeRun: null,
      activeRunId: null,
      testCases: [],
      currentResults: null,
      selectedHistoryRun: null,
      error: null,
    });
    // Clear any stale persistence
    EvaluationPersistence.clearState();
  };

  /**
   * Save current evaluation state to persistence
   */
  private savePersistenceState(runId: string, testCases: TestCase[]): void {
    if (!this.currentModel) return;

    const persistedState: PersistedEvaluationState = {
      runId,
      model: this.currentModel,
      persona: this.currentPersona,
      collectionId: this.currentCollectionId,
      testCases,
      processedQuestionIds: Array.from(this.processedQuestionIds),
      currentBatch: [],
      timestamp: Date.now(),
    };

    EvaluationPersistence.saveState(persistedState);
  }

  /**
   * Resume evaluation from persisted state
   */
  public resumeEvaluation = async (): Promise<void> => {
    const persistedState = EvaluationPersistence.loadState();
    if (!persistedState) {
      throw new Error('No persisted evaluation state found');
    }

    if (EvaluationPersistence.isStale(persistedState)) {
      throw new Error('Persisted evaluation is too old (> 1 hour)');
    }

    this.updateState({ isRunning: true, error: null });
    this.abortController = new AbortController();

    // Restore tracking state
    this.currentModel = persistedState.model;
    this.currentPersona = persistedState.persona;
    this.currentCollectionId = persistedState.collectionId || null;
    this.processedQuestionIds = new Set(persistedState.processedQuestionIds);

    const evaluation_run_id = persistedState.runId;
    const test_data = persistedState.testCases;

    console.log(`Resuming evaluation: ${evaluation_run_id}`);
    console.log(`Already processed: ${this.processedQuestionIds.size}/${test_data.length}`);

    // Filter out already processed questions
    const remainingQuestions = test_data.filter(
      (tc) => !this.processedQuestionIds.has(tc.test_case_id)
    );

    console.log(`Remaining questions: ${remainingQuestions.length}`);

    if (remainingQuestions.length === 0) {
      console.log('All questions already processed');
      this.updateState({ isRunning: false });
      EvaluationPersistence.clearState();
      return;
    }

    // Restore UI state
    this.updateState({
      activeRunId: evaluation_run_id,
      testCases: test_data,
      activeRun: {
        id: evaluation_run_id,
        total_questions: test_data.length,
        correct_count: 0,
        incorrect_count: 0,
        accuracy: 0,
        started_at: new Date(persistedState.timestamp).toISOString(),
        is_completed: false,
        progress: this.processedQuestionIds.size / test_data.length,
      },
    });

    try {
      // Process remaining questions in batches
      const BATCH_SIZE = 3;
      const batches: TestCase[][] = [];

      for (let i = 0; i < remainingQuestions.length; i += BATCH_SIZE) {
        batches.push(remainingQuestions.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check if aborted
        if (this.abortController?.signal.aborted) {
          console.log('Evaluation aborted by user');
          this.updateState({ isRunning: false });
          // Keep persistence on abort (allows resume)
          return;
        }

        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

        // Generate LLM answers for this batch
        this.updateState({ isGenerating: true });
        const submissions: SubmissionItem[] = [];

        for (const testCase of batch) {
          const answer = await this.generateAnswerForQuestion(
            testCase,
            this.currentModel!,
            this.currentPersona
          );
          submissions.push({
            test_case_id: testCase.test_case_id,
            llm_answer: answer,
            retrieved_context: testCase.retrieved_context,
          });

          // Mark question as processed
          this.processedQuestionIds.add(testCase.test_case_id);
        }

        this.updateState({ isGenerating: false });

        // Submit batch for judging
        console.log(`Submitting ${submissions.length} answers...`);
        const result = await submitPluginEvaluation({
          evaluation_run_id,
          submissions,
        });

        console.log(`Batch ${batchIndex + 1} results:`, result);

        // Update progress and results
        this.updateState({
          progress: result.progress,
          currentResults: result,
          activeRun: {
            ...this.state.activeRun!,
            progress: result.progress,
            correct_count: result.correct_count,
            incorrect_count: result.incorrect_count,
            accuracy: (result.correct_count / result.total_questions) * 100,
          },
        });

        // Save progress to persistence
        this.savePersistenceState(evaluation_run_id, test_data);

        // Check if completed
        if (result.is_completed) {
          console.log('Evaluation completed!');
          const completedRun: EvaluationRun = {
            id: evaluation_run_id,
            total_questions: result.total_questions,
            correct_count: result.correct_count,
            incorrect_count: result.incorrect_count,
            accuracy: (result.correct_count / result.total_questions) * 100,
            started_at: this.state.activeRun!.started_at,
            completed_at: new Date().toISOString(),
            is_completed: true,
            progress: 1.0,
          };

          this.updateState({
            isRunning: false,
            activeRun: completedRun,
            pastRuns: [completedRun, ...this.state.pastRuns],
          });

          // Clear persistence on completion
          EvaluationPersistence.clearState();
          break;
        }
      }
    } catch (error) {
      console.error('Resume evaluation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMsg, isRunning: false });
      this.deps.setError(errorMsg);

      // Clear persistence on error
      EvaluationPersistence.clearState();
    }
  };
}
