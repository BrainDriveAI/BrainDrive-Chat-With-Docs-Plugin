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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      completed: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark-theme:bg-green-900 dark-theme:text-green-200">
          Completed
        </span>
      ),
      running: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark-theme:bg-yellow-900 dark-theme:text-yellow-200">
          Running
        </span>
      ),
      failed: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark-theme:bg-red-900 dark-theme:text-red-200">
          Failed
        </span>
      ),
      pending: (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark-theme:bg-gray-700 dark-theme:text-gray-200">
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
      <div className="eval-stats-card shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 eval-table-row flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium eval-table-cell">
            Recent Evaluation Runs
          </h3>
          {headerActions}
        </div>
        <div className="px-6 py-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium eval-table-cell">
            No evaluation runs
          </h3>
          <p className="mt-1 text-sm eval-table-cell-secondary">
            Get started by running your first evaluation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="eval-stats-card shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b eval-table-row flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium eval-table-cell">
          Recent Evaluation Runs
        </h3>
        {headerActions}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 eval-table-row">
          <thead className="eval-result-header">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium eval-table-cell-secondary uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium eval-table-cell-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium eval-table-cell-secondary uppercase tracking-wider">
                Accuracy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium eval-table-cell-secondary uppercase tracking-wider">
                Correct / Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium eval-table-cell-secondary uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium eval-table-cell-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="eval-stats-card divide-y eval-table-row">
            {runs.map((run) => (
              <tr
                key={run.id}
                className="eval-table-row cursor-pointer"
                onClick={() => onSelectRun(run.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm eval-table-cell">
                  {formatDate(run.run_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(run.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 eval-result-content rounded-full h-2 mr-2">
                      <div
                        className={`${getProgressBarColor(run.accuracy)} h-2 rounded-full`}
                        style={{ width: `${run.accuracy}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium eval-table-cell">
                      {run.accuracy.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm eval-table-cell">
                  <span className="text-green-600 dark-theme:text-green-400 font-medium">
                    {run.correct_count}
                  </span>{' '}
                  / {run.total_questions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm eval-table-cell-secondary">
                  {formatDuration(run.duration_seconds)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 dark-theme:text-blue-400 dark-theme:hover:text-blue-300"
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
