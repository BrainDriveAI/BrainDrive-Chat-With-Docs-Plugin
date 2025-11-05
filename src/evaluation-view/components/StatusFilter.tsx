import React from 'react';

type StatusFilterValue = 'all' | 'pending' | 'running' | 'completed' | 'failed';

interface StatusFilterProps {
  currentStatus: StatusFilterValue;
  onStatusChange: (status: StatusFilterValue) => void;
  counts?: {
    all: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  currentStatus,
  onStatusChange,
  counts,
}) => {
  const formatLabel = (value: StatusFilterValue): string => {
    if (value === 'all') {
      return `All Runs${counts ? ` (${counts.all})` : ''}`;
    }

    const labels: Record<Exclude<StatusFilterValue, 'all'>, string> = {
      pending: 'Pending',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
    };

    const label = labels[value as Exclude<StatusFilterValue, 'all'>];
    const count = counts?.[value];

    return count !== undefined ? `${label} (${count})` : label;
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Status:
      </label>
      <select
        id="status-filter"
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as StatusFilterValue)}
        className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
      >
        <option value="all">{formatLabel('all')}</option>
        <option value="pending">{formatLabel('pending')}</option>
        <option value="running">{formatLabel('running')}</option>
        <option value="completed">{formatLabel('completed')}</option>
        <option value="failed">{formatLabel('failed')}</option>
      </select>
    </div>
  );
};
