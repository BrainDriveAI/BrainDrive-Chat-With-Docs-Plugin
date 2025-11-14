import React from 'react';
import type { EvaluationRun } from '../evaluationViewTypes';

interface ResultsSummaryProps {
  run: EvaluationRun;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ run }) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';

    // Less than 60 seconds - show seconds only
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    // Less than 60 minutes - show minutes and seconds
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }

    // 60 minutes or more - show hours and minutes
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="eval-stats-card shadow rounded-lg overflow-hidden mb-6">
      <div className="px-4 py-5 sm:px-6 border-b eval-table-row">
        <h3 className="text-lg leading-6 font-medium eval-table-cell">
          Evaluation Summary
        </h3>
        <p className="mt-1 text-sm eval-table-cell-secondary">
          {formatDate(run.run_date)}
        </p>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="eval-result-content rounded-lg p-4">
            <dt className="text-sm font-medium eval-stats-label">
              Accuracy
            </dt>
            <dd className={`mt-1 text-3xl font-semibold ${getAccuracyColor(run.accuracy)}`}>
              {run.accuracy.toFixed(1)}%
            </dd>
          </div>
          <div className="eval-result-content rounded-lg p-4">
            <dt className="text-sm font-medium eval-stats-label">
              Total Questions
            </dt>
            <dd className="mt-1 text-3xl font-semibold eval-stats-value">
              {run.total_questions}
            </dd>
          </div>
          <div className="eval-result-content rounded-lg p-4">
            <dt className="text-sm font-medium eval-stats-label">
              Correct / Incorrect
            </dt>
            <dd className="mt-1 text-3xl font-semibold eval-stats-value">
              <span className="text-green-600 dark-theme:text-green-400">{run.correct_count}</span> /{' '}
              <span className="text-red-600 dark-theme:text-red-400">{run.incorrect_count}</span>
            </dd>
          </div>
          <div className="eval-result-content rounded-lg p-4">
            <dt className="text-sm font-medium eval-stats-label">Duration</dt>
            <dd className="mt-1 text-3xl font-semibold eval-stats-value">
              {formatDuration(run.duration_seconds)}
            </dd>
          </div>
        </dl>
        {run.config_snapshot && Object.keys(run.config_snapshot).length > 0 && (
          <div className="mt-5 pt-5 border-t eval-table-row">
            <h4 className="text-sm font-medium eval-table-cell mb-2">
              Configuration
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(run.config_snapshot).map(([key, value]) => {
                // Handle persona object - show only the name
                if (key === 'persona' && value && typeof value === 'object' && 'name' in value) {
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark-theme:bg-blue-900 dark-theme:text-blue-200"
                    >
                      {key}: {value.name}
                    </span>
                  );
                }

                return (
                  <span
                    key={key}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark-theme:bg-blue-900 dark-theme:text-blue-200"
                  >
                    {key}: {String(value)}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
