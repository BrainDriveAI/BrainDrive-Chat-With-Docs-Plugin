import { AIService } from '../services/aiService';
import {
  submitPluginEvaluation,
  startPluginEvaluationWithQuestions,
  getEvaluationResults,
} from '../services';
import type { ModelInfo, PersonaInfo } from '../components/chat-header/types';
import type {
  EvaluationFeatureState,
  EvaluationViewStateUpdater,
  TestCase,
  SubmissionItem,
  EvaluationRun,
  PersonaConfigRequest,
  PersonaModelSettings,
} from './evaluationViewTypes';
import { EvaluationPersistence, type PersistedEvaluationState } from './EvaluationPersistence';
import { calculateStageProgress, type EvaluationStage } from './evaluationStages';

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
  private currentLlmModel: string | null = null;
  private currentPersona: PersonaInfo | null = null;
  private currentCollectionId: string | null = null;
  private processedQuestionIds: Set<string> = new Set();
  private userId: string | undefined = undefined;

  constructor(
    initialState: EvaluationFeatureState,
    deps: ServiceDependencies,
    updateShellState: EvaluationViewStateUpdater
  ) {
    this.state = initialState;
    this.deps = deps;
    this.updateShellState = updateShellState;
  }

  /**
   * Set user ID for backend persistence
   */
  public setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  /**
   * Convert PersonaInfo to PersonaConfigRequest format for API
   */
  private convertPersonaToRequest(persona: PersonaInfo | null): PersonaConfigRequest | null {
    if (!persona) return null;

    return {
      id: persona.id || null,
      name: persona.name || null,
      description: (persona as any).description || null,
      system_prompt: persona.system_prompt || null,
      model_settings: {
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        context_window: 4000,
        stop_sequences: [],
        ...(persona.model_settings || {}),
      } as PersonaModelSettings,
      created_at: (persona as any).created_at || null,
      updated_at: (persona as any).updated_at || null,
    };
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
    collectionId: string,
    questions: string[]
  ): Promise<void> => {
    this.abortController = new AbortController();

    // Save current run config
    this.currentModel = selectedModel;
    this.currentLlmModel = selectedModel.name;
    this.currentPersona = selectedPersona;
    this.currentCollectionId = collectionId;
    this.processedQuestionIds.clear();

    let evaluation_run_id: string | undefined;

    try {
      // Stage 1: Retrieving context (90+ seconds)
      console.log('Starting evaluation - retrieving context...');
      this.updateState({
        isRunning: true,
        error: null,
        progress: 0,
        currentStage: 'retrieving_context',
        stageProgress: calculateStageProgress('retrieving_context', 0.1),
        activeRun: {
          id: 'pending',
          total_questions: questions.length,
          correct_count: 0,
          incorrect_count: 0,
          evaluated_count: 0,
          accuracy: 0,
          started_at: new Date().toISOString(),
          is_completed: false,
          progress: 0,
          status: 'running',
          duration_seconds: null,
          run_date: new Date().toISOString(),
        },
      });

      const response = await startPluginEvaluationWithQuestions({
        collection_id: collectionId,
        questions,
        llm_model: this.currentLlmModel,
        persona: this.convertPersonaToRequest(selectedPersona),
      });
      evaluation_run_id = response.evaluation_run_id;
      const test_data = response.test_data;
      console.log(`Context retrieved for ${test_data.length} questions`);

      // Stage 2: Preparing tests
      this.updateState({
        currentStage: 'preparing_tests',
        stageProgress: calculateStageProgress('preparing_tests', 0.5),
        activeRunId: evaluation_run_id,
        testCases: test_data,
        activeRun: {
          id: evaluation_run_id,
          total_questions: test_data.length,
          correct_count: 0,
          incorrect_count: 0,
          evaluated_count: 0,
          accuracy: 0,
          started_at: new Date().toISOString(),
          is_completed: false,
          progress: 0,
          status: 'running',
          duration_seconds: null,
          run_date: new Date().toISOString(),
        },
      });

      // Initial persistence save
      this.savePersistenceState(evaluation_run_id, test_data);

      // Stage 3: Generate answers for all questions
      const BATCH_SIZE = 3;
      const batches: TestCase[][] = [];

      for (let i = 0; i < test_data.length; i += BATCH_SIZE) {
        batches.push(test_data.slice(i, i + BATCH_SIZE));
      }

      console.log('Starting answer generation loop...');

      // Phase 1: Generate and submit ALL answers (no polling between batches)
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (this.abortController?.signal.aborted) {
          console.log('Evaluation aborted');
          this.updateState({ isRunning: false });
          return;
        }

        const batch = batches[batchIndex];
        const answeredSoFar = this.processedQuestionIds.size;

        console.log(`Generating answers for batch ${batchIndex + 1}/${batches.length}`);

        // Update to generating stage with progress
        this.updateState({
          isGenerating: true,
          currentStage: 'generating_answers',
          stageProgress: calculateStageProgress(
            'generating_answers',
            answeredSoFar / test_data.length
          ),
        });

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

          this.processedQuestionIds.add(testCase.test_case_id);

          // Update progress during generation
          this.updateState({
            stageProgress: calculateStageProgress(
              'generating_answers',
              this.processedQuestionIds.size / test_data.length
            ),
          });
        }

        this.updateState({ isGenerating: false });

        // Submit batch for judging (returns 202 immediately)
        console.log(`Submitting batch ${batchIndex + 1} (${submissions.length} answers)`);
        await submitPluginEvaluation({
          evaluation_run_id,
          submissions,
        });

        // Save progress
        this.savePersistenceState(evaluation_run_id, test_data);

        // Continue to next batch - NO POLLING
      }

      // Phase 2: All answers submitted - now wait and poll for judging
      console.log('All answers generated and submitted. Starting judging phase...');

      this.updateState({
        currentStage: 'judging',
        stageProgress: calculateStageProgress('judging', 0),
        isGenerating: false,
      });

      // Wait 30 seconds before polling
      console.log('Waiting 30 seconds before polling judge results...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      console.log('Starting polling for judge results...');

      // Poll until all judged
      const POLL_INTERVAL_MS = 10000; // 10 seconds between polls
      const MAX_POLL_ATTEMPTS = 60; // 10 minutes max (60 * 10s)
      let pollAttempts = 0;

      while (true) {
        if (this.abortController?.signal.aborted) {
          console.log('Evaluation aborted during judging');
          this.updateState({ isRunning: false });
          return;
        }

        if (pollAttempts++ >= MAX_POLL_ATTEMPTS) {
          throw new Error('Judging timeout after 10 minutes');
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

        const resultsData = await getEvaluationResults(evaluation_run_id);
        const evaluationRun = resultsData.evaluation_run;

        console.log(`Poll ${pollAttempts}: ${evaluationRun.evaluated_count}/${evaluationRun.total_questions} judged`);

        // Update UI with judge progress
        this.updateState({
          progress: evaluationRun.progress,
          stageProgress: calculateStageProgress('judging', evaluationRun.progress),
          activeRun: {
            ...this.state.activeRun!,
            evaluated_count: evaluationRun.evaluated_count,
            progress: evaluationRun.progress,
            correct_count: evaluationRun.correct_count,
            incorrect_count: evaluationRun.incorrect_count,
            accuracy: evaluationRun.accuracy,
          },
        });

        // Check if completed (either by status or all judged)
        if (
          evaluationRun.status === 'completed' ||
          evaluationRun.evaluated_count >= evaluationRun.total_questions
        ) {
          console.log('All questions judged or evaluation completed!');
          break;
        }
      }

      // Completed
      console.log('Evaluation completed!');
      const completedRun: EvaluationRun = {
        ...this.state.activeRun!,
        completed_at: new Date().toISOString(),
        is_completed: true,
        progress: 1.0,
      };

      this.updateState({
        isRunning: false,
        currentStage: 'completed',
        stageProgress: 100,
        activeRun: completedRun,
        pastRuns: [completedRun, ...this.state.pastRuns],
      });

      await EvaluationPersistence.clearStateWithBackend(evaluation_run_id, this.userId);
    } catch (error) {
      console.error('Evaluation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMsg, isRunning: false });
      this.deps.setError(errorMsg);

      // Clear persistence on error
      if (evaluation_run_id) {
        await EvaluationPersistence.clearStateWithBackend(evaluation_run_id, this.userId);
      } else {
        EvaluationPersistence.clearState();
      }
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
   * Save current evaluation state to persistence (localStorage + backend)
   */
  private async savePersistenceState(runId: string, testCases: TestCase[]): Promise<void> {
    if (!this.currentModel || !this.currentLlmModel) return;

    const persistedState: PersistedEvaluationState = {
      runId,
      model: this.currentModel,
      llmModel: this.currentLlmModel,
      persona: this.currentPersona,
      collectionId: this.currentCollectionId || undefined,
      testCases,
      processedQuestionIds: Array.from(this.processedQuestionIds),
      currentBatch: [],
      timestamp: Date.now(),
    };

    // Save to both localStorage and backend
    await EvaluationPersistence.saveStateWithBackend(persistedState, this.userId);
  }

  /**
   * Resume evaluation from persisted state (backend first, localStorage fallback)
   */
  public resumeEvaluation = async (): Promise<void> => {
    // First try localStorage to get runId
    const localState = EvaluationPersistence.loadState();
    if (!localState) {
      throw new Error('No persisted evaluation state found');
    }

    // Try to load from backend with runId (if userId available)
    let persistedState = localState;
    if (this.userId) {
      const backendState = await EvaluationPersistence.loadStateWithBackend(localState.runId, this.userId);
      if (backendState) {
        persistedState = backendState;
        console.log('Resuming from backend state');
      } else {
        console.log('Resuming from localStorage');
      }
    }

    if (EvaluationPersistence.isStale(persistedState)) {
      throw new Error('Persisted evaluation is too old (> 7 days)');
    }

    this.updateState({ isRunning: true, error: null });
    this.abortController = new AbortController();

    // Restore tracking state
    this.currentModel = persistedState.model;
    this.currentLlmModel = persistedState.llmModel;
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
      await EvaluationPersistence.clearStateWithBackend(evaluation_run_id, this.userId);
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
        evaluated_count: this.processedQuestionIds.size,
        accuracy: 0,
        started_at: new Date(persistedState.timestamp).toISOString(),
        is_completed: false,
        progress: this.processedQuestionIds.size / test_data.length,
        status: 'running',
        duration_seconds: null,
        run_date: new Date(persistedState.timestamp).toISOString(),
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

        // Submit batch for judging (returns 202 immediately)
        console.log(`Submitting ${submissions.length} answers...`);
        const submitResponse = await submitPluginEvaluation({
          evaluation_run_id,
          submissions,
        });

        console.log(`Batch ${batchIndex + 1} submitted:`, submitResponse.message);

        // Poll for results until batch is judged
        const previousEvaluatedCount = this.state.activeRun?.evaluated_count || 0;
        const targetCount = previousEvaluatedCount + submissions.length;

        console.log(`Waiting for judging... (target: ${targetCount})`);

        while (true) {
          // Check if aborted
          if (this.abortController?.signal.aborted) {
            console.log('Evaluation aborted during polling');
            this.updateState({ isRunning: false });
            return;
          }

          // Wait 2 seconds before polling
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Poll for results
          const resultsData = await getEvaluationResults(evaluation_run_id);
          const evaluationRun = resultsData.evaluation_run;

          console.log(`Poll result: evaluated ${evaluationRun.evaluated_count}/${evaluationRun.total_questions}`);

          // Update UI with latest progress
          this.updateState({
            progress: evaluationRun.progress,
            activeRun: {
              ...this.state.activeRun!,
              evaluated_count: evaluationRun.evaluated_count,
              progress: evaluationRun.progress,
              correct_count: evaluationRun.correct_count,
              incorrect_count: evaluationRun.incorrect_count,
              accuracy: evaluationRun.accuracy,
            },
          });

          // Check if batch is processed
          if (evaluationRun.evaluated_count >= targetCount) {
            console.log(`Batch ${batchIndex + 1} judged successfully`);
            break;
          }
        }

        // Save progress to persistence
        this.savePersistenceState(evaluation_run_id, test_data);

        // Check if completed
        const currentRun = this.state.activeRun!;
        if (currentRun.evaluated_count === currentRun.total_questions) {
          console.log('Evaluation completed!');
          const completedRun: EvaluationRun = {
            ...currentRun,
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
          await EvaluationPersistence.clearStateWithBackend(evaluation_run_id, this.userId);
          break;
        }
      }
    } catch (error) {
      console.error('Resume evaluation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({ error: errorMsg, isRunning: false });
      this.deps.setError(errorMsg);

      // Clear persistence on error
      await EvaluationPersistence.clearStateWithBackend(evaluation_run_id, this.userId);
    }
  };
}
