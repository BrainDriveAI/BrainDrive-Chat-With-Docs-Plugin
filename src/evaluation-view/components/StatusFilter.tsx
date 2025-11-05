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
  const filters: { value: StatusFilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Running' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Filter by status:
      </span>
      <div className="inline-flex rounded-md shadow-sm" role="group">
        {filters.map((filter, index) => {
          const isActive = currentStatus === filter.value;
          const count = counts?.[filter.value];

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onStatusChange(filter.value)}
              className={`
                px-4 py-2 text-sm font-medium
                ${index === 0 ? 'rounded-l-lg' : ''}
                ${index === filters.length - 1 ? 'rounded-r-lg' : ''}
                ${
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }
                border border-gray-300 dark:border-gray-600
                ${index !== 0 ? 'border-l-0' : ''}
                focus:z-10 focus:ring-2 focus:ring-blue-500 focus:outline-none
                transition-colors duration-200
              `}
            >
              {filter.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
