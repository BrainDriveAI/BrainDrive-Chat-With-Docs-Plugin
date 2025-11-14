import React from 'react';

interface FilterControlsProps {
  searchTerm: string;
  correctnessFilter: 'all' | 'correct' | 'incorrect';
  onSearchChange: (term: string) => void;
  onFilterChange: (filter: 'all' | 'correct' | 'incorrect') => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchTerm,
  correctnessFilter,
  onSearchChange,
  onFilterChange,
}) => {
  return (
    <div className="eval-stats-card shadow rounded-lg p-4 mb-6">
      <div className="flex flex-row items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md eval-input shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          />
        </div>
        <div>
          <select
            value={correctnessFilter}
            onChange={(e) => onFilterChange(e.target.value as 'all' | 'correct' | 'incorrect')}
            className="rounded-md eval-input shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            <option value="all">All Results</option>
            <option value="correct">Correct Only</option>
            <option value="incorrect">Incorrect Only</option>
          </select>
        </div>
      </div>
    </div>
  );
};
