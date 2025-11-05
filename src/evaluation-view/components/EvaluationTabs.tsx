import React from 'react';
import { List, BarChart3 } from 'lucide-react';

export type TabType = 'runs' | 'results';

interface EvaluationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  resultsEnabled: boolean;
}

export const EvaluationTabs: React.FC<EvaluationTabsProps> = ({
  activeTab,
  onTabChange,
  resultsEnabled,
}) => {
  const tabClass = (tab: TabType, isActive: boolean) => {
    const baseClasses =
      'flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors';
    if (isActive) {
      return `${baseClasses} border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400`;
    }
    return `${baseClasses} border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600`;
  };

  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => onTabChange('runs')}
          className={tabClass('runs', activeTab === 'runs')}
        >
          <List className="h-4 w-4" />
          Evaluation Runs
        </button>
        <button
          onClick={() => onTabChange('results')}
          className={tabClass('results', activeTab === 'results')}
          disabled={!resultsEnabled}
          style={!resultsEnabled ? { cursor: 'not-allowed', opacity: 0.5 } : undefined}
        >
          <BarChart3 className="h-4 w-4" />
          Results Details
        </button>
      </nav>
    </div>
  );
};
