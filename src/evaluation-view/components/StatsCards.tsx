import React from 'react';
import { Percent, CheckCircle, XCircle, Clock } from 'lucide-react';

interface StatsData {
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  duration: number | null;
}

interface StatsCardsProps {
  stats: StatsData | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* Latest Accuracy */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Percent className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Latest Accuracy
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.accuracy.toFixed(1)}%
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Correct Answers */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Correct Answers
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.correctCount} / {stats.totalQuestions}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Incorrect Answers */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Incorrect Answers
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {stats.incorrectCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Duration
                </dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatDuration(stats.duration)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
