import React from 'react';
import { PlayCircle, AlertCircle } from 'lucide-react';
import { AIService } from '../services/aiService';
import { EvaluationService } from './EvaluationService';
import { EvaluationPersistence } from './EvaluationPersistence';
import type { ModelInfo, PersonaInfo } from '../components/chat-header/types';
import type { EvaluationFeatureState, DetailedEvaluationResult } from './evaluationViewTypes';
import type { Services } from '../types';
import type { Collection } from '../braindrive-plugin/pluginTypes';
import { getEvaluationRuns, getEvaluationResults } from '../services';
import { RunEvaluationDialog } from './components/RunEvaluationDialog';
import { EvaluationProgressBanner } from './components/EvaluationProgressBanner';
import { EvaluationTabs, type TabType } from './components/EvaluationTabs';
import { StatsCards } from './components/StatsCards';
import { RunsTable } from './components/RunsTable';
import { ResultsSummary } from './components/ResultsSummary';
import { ResultItem } from './components/ResultItem';
import { FilterControls } from './components/FilterControls';
import { StatusFilter } from './components/StatusFilter';
import { ToastContainer, ToastManager } from './components/Toast';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { ModelConfigLoader, FallbackModelSelector } from '../domain/models';
import { PersonaResolver } from '../domain/personas/PersonaResolver';
import './EvaluationView.css';

interface EvaluationViewProps {
  services: Services;
  setError: (error: string | null) => void;
  collections: Collection[];
}

const initialState: EvaluationFeatureState = {
  activeRun: null,
  activeRunId: null,
  testCases: [],
  isRunning: false,
  isGenerating: false,
  progress: 0,
  error: null,
  currentResults: null,
  pastRuns: [],
  selectedHistoryRun: null,
};

export class EvaluationViewShell extends React.Component<
  EvaluationViewProps,
  EvaluationFeatureState & {
    selectedModel: ModelInfo | null;
    availableModels: ModelInfo[];
    availablePersonas: PersonaInfo[];
    isLoadingModels: boolean;
    isLoadingPersonas: boolean;
    activeTab: TabType;
    selectedRunId: string | null;
    detailedResults: DetailedEvaluationResult[];
    searchTerm: string;
    correctnessFilter: 'all' | 'correct' | 'incorrect';
    statusFilter: 'all' | 'pending' | 'running' | 'completed' | 'failed';
    expandedResultIds: Set<string>;
    showDialog: boolean;
    hasInProgressEvaluation: boolean;
    remainingQuestionsCount: number;
    lastUpdatedTimestamp: number | null;
  }
> {
  private evaluationService: EvaluationService;
  private aiService: AIService;
  private modelConfigLoader: ModelConfigLoader | null = null;
  private modelSelector: FallbackModelSelector;
  private personaResolver: PersonaResolver | null = null;

  constructor(props: EvaluationViewProps) {
    super(props);

    this.aiService = new AIService(props.services.api);

    // Initialize model configuration services
    if (props.services.api) {
      this.modelConfigLoader = new ModelConfigLoader(props.services.api);
    }
    this.modelSelector = new FallbackModelSelector();

    // Initialize PersonaResolver
    if (props.services.api) {
      this.personaResolver = new PersonaResolver({ api: props.services.api });
    }

    this.state = {
      ...initialState,
      selectedModel: null,
      availableModels: [],
      availablePersonas: [],
      isLoadingModels: false,
      isLoadingPersonas: false,
      activeTab: 'runs',
      selectedRunId: null,
      detailedResults: [],
      searchTerm: '',
      correctnessFilter: 'all',
      statusFilter: 'all',
      expandedResultIds: new Set(),
      showDialog: false,
      hasInProgressEvaluation: false,
      remainingQuestionsCount: 0,
      lastUpdatedTimestamp: null,
    };

    this.evaluationService = new EvaluationService(
      initialState,
      {
        aiService: this.aiService,
        setError: props.setError,
      },
      (newState) => this.setState((prev) => ({ ...prev, ...newState }))
    );
  }

  async componentDidMount() {
    // Get user ID from BrainDrive auth
    try {
      const userResponse: any = await this.props.services?.api?.get('/api/v1/auth/me');
      const userId = userResponse.id;
      if (userId) {
        this.evaluationService.setUserId(userId);
      }
    } catch (error) {
      // Silent failure - continue without backend sync
      console.warn('Could not fetch user ID:', error);
    }

    this.loadModels();
    this.loadPersonas();
    this.loadRuns();
    this.checkForInProgressEvaluation();
  }

  /**
   * Format timestamp to "time ago" string
   */
  formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    if (hours > 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (minutes > 0) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    return 'just now';
  };

  /**
   * Check for in-progress evaluation in localStorage
   */
  checkForInProgressEvaluation = async () => {
    const hasInProgress = EvaluationPersistence.hasInProgressEvaluation();
    if (!hasInProgress) return;

    const remaining = EvaluationPersistence.getRemainingQuestionsCount();

    // Clear stale state if no questions remaining
    if (remaining <= 0) {
      console.log('Found persisted evaluation with 0 remaining questions, clearing...');
      EvaluationPersistence.clearState();
      return;
    }

    // Verify backend status before showing resume banner
    const persistedState = EvaluationPersistence.loadState();
    if (!persistedState) return;

    try {
      const resultsData = await getEvaluationResults(persistedState.runId);

      // If backend shows evaluation is completed, clear localStorage
      if (resultsData.evaluation_run.is_completed || resultsData.evaluation_run.status === 'completed') {
        console.log('Backend shows evaluation completed, clearing persisted state');
        EvaluationPersistence.clearState();
        return;
      }

      // Evaluation is truly in progress, show resume banner
      this.setState({
        hasInProgressEvaluation: true,
        remainingQuestionsCount: remaining,
        lastUpdatedTimestamp: persistedState.timestamp,
      });
    } catch (error) {
      // If backend request fails (run not found, network error, etc.), don't show banner
      // Only show banner when backend explicitly confirms run is in progress
      console.warn('Failed to verify backend status, not showing resume banner:', error);
      // Optionally clear localStorage since we can't verify the run exists
      // EvaluationPersistence.clearState();
    }
  };

  /**
   * Load available models using ModelConfigLoader (refactored)
   * Replaces 45+ lines of duplicate logic with domain service
   */
  loadModels = async () => {
    this.setState({ isLoadingModels: true });

    if (!this.modelConfigLoader) {
      this.setState({ isLoadingModels: false });
      return;
    }

    try {
      const result = await this.modelConfigLoader.loadModels();
      const defaultModel = this.modelSelector.selectFirst(result.models);

      this.setState({
        availableModels: result.models,
        selectedModel: defaultModel,
        isLoadingModels: false,
      });
    } catch (error: any) {
      console.error('Error loading models:', error);
      this.setState({
        availableModels: [],
        selectedModel: null,
        isLoadingModels: false,
      });
    }
  };

  /**
   * Load personas (delegates to PersonaResolver)
   */
  loadPersonas = async () => {
    if (!this.personaResolver) {
      this.setState({ isLoadingPersonas: false });
      return;
    }

    this.setState({ isLoadingPersonas: true });

    try {
      const personas = await this.personaResolver.loadPersonas();
      this.setState({
        availablePersonas: personas,
        isLoadingPersonas: false,
      });
    } catch (error) {
      console.error('Error loading personas:', error);
      this.setState({
        availablePersonas: [],
        isLoadingPersonas: false,
      });
    }
  };

  /**
   * Load evaluation runs
   */
  loadRuns = async () => {
    try {
      const data = await getEvaluationRuns(50);
      this.setState({ pastRuns: data.runs || [] });
    } catch (error) {
      console.error('Failed to load evaluation runs:', error);
      this.props.setError('Failed to load evaluation runs');
    }
  };

  /**
   * Load detailed results for a run
   */
  loadResults = async (runId: string) => {
    try {
      const data = await getEvaluationResults(runId);
      this.setState({
        selectedRunId: runId,
        detailedResults: data.results || [],
        selectedHistoryRun: data.evaluation_run,
        activeTab: 'results',
      });
    } catch (error) {
      console.error('Failed to load evaluation results:', error);
      this.props.setError('Failed to load evaluation results');
    }
  };

  handleOpenDialog = () => {
    this.setState({ showDialog: true });
  };

  handleCloseDialog = () => {
    this.setState({ showDialog: false });
  };

  handleSubmitEvaluation = async (
    model: ModelInfo,
    persona: PersonaInfo | null,
    collectionId: string,
    questions: string[]
  ) => {
    this.setState({ showDialog: false });

    // Show toast notification
    ToastManager.success('Evaluation started');

    await this.evaluationService.runEvaluation(model, persona, collectionId, questions);

    // Clear in-progress banner and reload runs after completion
    this.setState({ hasInProgressEvaluation: false });
    await this.loadRuns();
  };

  handleResumeEvaluation = async () => {
    this.setState({ hasInProgressEvaluation: false });
    try {
      await this.evaluationService.resumeEvaluation();
      await this.loadRuns();
    } catch (error) {
      console.error('Failed to resume evaluation:', error);
      this.props.setError(error instanceof Error ? error.message : 'Failed to resume evaluation');
    }
  };

  handleStartFresh = () => {
    EvaluationPersistence.clearState();
    this.setState({
      hasInProgressEvaluation: false,
      remainingQuestionsCount: 0,
    });
    this.handleOpenDialog();
  };

  handleStopEvaluation = () => {
    this.evaluationService.stopEvaluation();
    ToastManager.info('Evaluation paused');
  };

  handleDismissResumeBanner = () => {
    this.setState({ hasInProgressEvaluation: false });
  };

  handleSelectRun = (runId: string) => {
    this.loadResults(runId);
  };

  handleTabChange = (tab: TabType) => {
    this.setState({ activeTab: tab });
  };

  handleSearchChange = (term: string) => {
    this.setState({ searchTerm: term });
  };

  handleFilterChange = (filter: 'all' | 'correct' | 'incorrect') => {
    this.setState({ correctnessFilter: filter });
  };

  handleStatusFilterChange = (status: 'all' | 'pending' | 'running' | 'completed' | 'failed') => {
    this.setState({ statusFilter: status });
  };

  toggleResultExpanded = (testCaseId: string) => {
    this.setState((prev) => {
      const newExpanded = new Set(prev.expandedResultIds);
      if (newExpanded.has(testCaseId)) {
        newExpanded.delete(testCaseId);
      } else {
        newExpanded.add(testCaseId);
      }
      return { expandedResultIds: newExpanded };
    });
  };

  getFilteredResults = (): DetailedEvaluationResult[] => {
    const { detailedResults, searchTerm, correctnessFilter } = this.state;

    return detailedResults.filter((result) => {
      const matchesSearch =
        result.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.llm_answer.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCorrectness =
        correctnessFilter === 'all' ||
        (correctnessFilter === 'correct' && result.judge_correct) ||
        (correctnessFilter === 'incorrect' && !result.judge_correct);

      return matchesSearch && matchesCorrectness;
    });
  };

  getFilteredRuns = () => {
    const { pastRuns, statusFilter } = this.state;

    if (statusFilter === 'all') {
      return pastRuns;
    }

    return pastRuns.filter((run) => run.status === statusFilter);
  };

  getStatusCounts = () => {
    const { pastRuns } = this.state;

    return {
      all: pastRuns.length,
      pending: pastRuns.filter((r) => r.status === 'pending').length,
      running: pastRuns.filter((r) => r.status === 'running').length,
      completed: pastRuns.filter((r) => r.status === 'completed').length,
      failed: pastRuns.filter((r) => r.status === 'failed').length,
    };
  };

  render() {
    const {
      availableModels,
      availablePersonas,
      isLoadingModels,
      isLoadingPersonas,
      activeTab,
      pastRuns,
      selectedHistoryRun,
      expandedResultIds,
      searchTerm,
      correctnessFilter,
      statusFilter,
      showDialog,
      hasInProgressEvaluation,
      remainingQuestionsCount,
      lastUpdatedTimestamp,
      isRunning,
      activeRun,
    } = this.state;

    const filteredResults = this.getFilteredResults();
    const filteredRuns = this.getFilteredRuns();
    const statusCounts = this.getStatusCounts();
    const latestRun = pastRuns.length > 0 ? pastRuns[0] : null;

    return (
      <div className="evaluation-view">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Resume Banner */}
          {hasInProgressEvaluation && (
            <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="ml-2 flex items-center justify-between">
                <div>
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      In-progress evaluation found
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 ml-2">
                      ({remainingQuestionsCount} questions remaining)
                    </span>
                  </div>
                  {lastUpdatedTimestamp && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Last updated: {this.formatTimeAgo(lastUpdatedTimestamp)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={this.handleResumeEvaluation}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Resume
                  </Button>
                  <Button
                    onClick={this.handleStartFresh}
                    variant="outline"
                    size="sm"
                    className="border-blue-600 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    Start Fresh
                  </Button>
                  <Button
                    onClick={this.handleDismissResumeBanner}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Banner */}
          {isRunning && activeRun && (
            <EvaluationProgressBanner
              processedCount={activeRun.evaluated_count || 0}
              totalCount={activeRun.total_questions || 0}
              accuracy={activeRun.accuracy || 0}
              startTime={activeRun.started_at || new Date().toISOString()}
              onAbort={this.handleStopEvaluation}
              currentStage={this.state.currentStage}
              stageProgress={this.state.stageProgress}
              generatedCount={this.evaluationService['processedQuestionIds']?.size || 0}
            />
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold dark:text-white">
                  Chat with Docs System Evaluation
                </h1>
                <p className="mt-2 text-sm dark:text-gray-400">
                  Test and measure the accuracy of your RAG system
                </p>
              </div>
              <button
                onClick={this.handleOpenDialog}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Run New Evaluation
              </button>
            </div>
          </div>

          {/* Tabs */}
          <EvaluationTabs
            activeTab={activeTab}
            onTabChange={this.handleTabChange}
            resultsEnabled={selectedHistoryRun !== null}
          />

          {/* Runs Tab */}
          {activeTab === 'runs' && (
            <>
              <StatsCards
                stats={
                  latestRun
                    ? {
                        accuracy: latestRun.accuracy,
                        correctCount: latestRun.correct_count,
                        incorrectCount: latestRun.incorrect_count,
                        totalQuestions: latestRun.total_questions,
                        duration: latestRun.duration_seconds,
                      }
                    : null
                }
              />
              <RunsTable
                runs={filteredRuns}
                onSelectRun={this.handleSelectRun}
                headerActions={
                  <StatusFilter
                    currentStatus={statusFilter}
                    onStatusChange={this.handleStatusFilterChange}
                    counts={statusCounts}
                  />
                }
              />
            </>
          )}

          {/* Results Details Tab */}
          {activeTab === 'results' && selectedHistoryRun && (
            <>
              <ResultsSummary run={selectedHistoryRun} />
              <FilterControls
                searchTerm={searchTerm}
                correctnessFilter={correctnessFilter}
                onSearchChange={this.handleSearchChange}
                onFilterChange={this.handleFilterChange}
              />
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Test Results
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredResults.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No results match your filters
                      </p>
                    </div>
                  ) : (
                    filteredResults.map((result) => (
                      <ResultItem
                        key={result.test_case_id}
                        result={result}
                        isExpanded={expandedResultIds.has(result.test_case_id)}
                        onToggle={() => this.toggleResultExpanded(result.test_case_id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Run Evaluation Dialog */}
          <RunEvaluationDialog
            isOpen={showDialog}
            onClose={this.handleCloseDialog}
            onSubmit={this.handleSubmitEvaluation}
            availableModels={availableModels}
            availablePersonas={availablePersonas}
            collections={this.props.collections}
            isLoadingModels={isLoadingModels}
            isLoadingPersonas={isLoadingPersonas}
          />

          {/* Toast Notifications */}
          <ToastContainer />
        </div>
      </div>
    );
  }
}
