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
      return `${baseClasses} eval-tab-active`;
    }
    return `${baseClasses} eval-tab`;
  };

  return (
    <div className="mb-6 border-b eval-table-row">
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
