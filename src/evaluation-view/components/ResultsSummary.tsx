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
    return `${seconds.toFixed(1)}s`;
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-6">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Evaluation Summary
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatDate(run.run_date)}
        </p>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Accuracy
            </dt>
            <dd className={`mt-1 text-3xl font-semibold ${getAccuracyColor(run.accuracy)}`}>
              {run.accuracy.toFixed(1)}%
            </dd>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Questions
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {run.total_questions}
            </dd>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Correct / Incorrect
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              <span className="text-green-600 dark:text-green-400">{run.correct_count}</span> /{' '}
              <span className="text-red-600 dark:text-red-400">{run.incorrect_count}</span>
            </dd>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {formatDuration(run.duration_seconds)}
            </dd>
          </div>
        </dl>
        {run.config_snapshot && Object.keys(run.config_snapshot).length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Configuration
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(run.config_snapshot).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
