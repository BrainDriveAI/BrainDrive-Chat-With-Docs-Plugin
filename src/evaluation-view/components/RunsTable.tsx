import React from 'react';
import { Inbox } from 'lucide-react';
import type { EvaluationRun } from '../evaluationViewTypes';

interface RunsTableProps {
  runs: EvaluationRun[];
  onSelectRun: (runId: string) => void;
  headerActions?: React.ReactNode;
}

export const RunsTable: React.FC<RunsTableProps> = ({ runs, onSelectRun, headerActions }) => {
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
    if (seconds === null || seconds === undefined || isNaN(seconds)) return 'N/A';
    return `${seconds.toFixed(1)}s`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      completed: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
          Completed
        </span>
      ),
      running: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
          Running
        </span>
      ),
      failed: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
          Failed
        </span>
      ),
      pending: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          Pending
        </span>
      ),
    };
    return badges[status] || badges.pending;
  };

  const getProgressBarColor = (accuracy: number): string => {
    if (accuracy >= 80) return 'bg-green-500';
    if (accuracy >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (runs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Evaluation Runs
          </h3>
          {headerActions}
        </div>
        <div className="px-6 py-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No evaluation runs
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by running your first evaluation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
          Recent Evaluation Runs
        </h3>
        {headerActions}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Accuracy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Correct / Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {runs.map((run) => (
              <tr
                key={run.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onSelectRun(run.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(run.run_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(run.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                      <div
                        className={`${getProgressBarColor(run.accuracy)} h-2 rounded-full`}
                        style={{ width: `${run.accuracy}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {run.accuracy.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {run.correct_count}
                  </span>{' '}
                  / {run.total_questions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDuration(run.duration_seconds)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRun(run.id);
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
