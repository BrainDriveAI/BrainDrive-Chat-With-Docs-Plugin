/**
 * Evaluation stage definitions and utilities
 * Keeps stage management logic separate for maintainability
 */

export type EvaluationStage =
  | 'retrieving_context'
  | 'preparing_tests'
  | 'generating_answers'
  | 'judging'
  | 'completed';

export interface StageInfo {
  name: string;
  description: string;
  progressRange: [number, number]; // [start%, end%]
}

/**
 * Stage metadata for display and progress calculation
 */
export const STAGE_INFO: Record<EvaluationStage, StageInfo> = {
  retrieving_context: {
    name: 'Retrieving Context',
    description: 'Retrieving context from documents',
    progressRange: [0, 65],
  },
  preparing_tests: {
    name: 'Preparing Tests',
    description: 'Preparing test cases',
    progressRange: [65, 70],
  },
  generating_answers: {
    name: 'Generating Answers',
    description: 'Generating AI answers',
    progressRange: [70, 90],
  },
  judging: {
    name: 'Judging',
    description: 'Judging responses',
    progressRange: [90, 100],
  },
  completed: {
    name: 'Completed',
    description: 'Evaluation complete',
    progressRange: [100, 100],
  },
};

/**
 * Get display text for a stage
 */
export function getStageDisplayText(
  stage: EvaluationStage,
  generatedCount?: number,
  evaluatedCount?: number,
  totalCount?: number
): string {
  switch (stage) {
    case 'retrieving_context':
      return totalCount
        ? `Retrieving context from documents... (${totalCount} questions)`
        : 'Retrieving context from documents...';
    case 'preparing_tests':
      return 'Preparing test cases...';
    case 'generating_answers':
      return generatedCount !== undefined && totalCount !== undefined
        ? `Generating answers... (${generatedCount}/${totalCount} completed)`
        : 'Generating answers...';
    case 'judging':
      return evaluatedCount !== undefined && totalCount !== undefined
        ? `Judging responses... (${evaluatedCount}/${totalCount} evaluated)`
        : 'Judging responses...';
    case 'completed':
      return 'Evaluation complete!';
    default:
      return 'Evaluation in progress';
  }
}

/**
 * Calculate stage progress percentage based on sub-progress
 */
export function calculateStageProgress(
  stage: EvaluationStage,
  subProgress: number // 0-1 within the stage
): number {
  const [start, end] = STAGE_INFO[stage].progressRange;
  return start + (end - start) * subProgress;
}
