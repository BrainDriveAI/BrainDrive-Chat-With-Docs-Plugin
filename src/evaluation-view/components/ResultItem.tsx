import React from 'react';
import { CheckCircle, XCircle, ChevronDown, FileText } from 'lucide-react';
import type { DetailedEvaluationResult } from '../evaluationViewTypes';

interface ResultItemProps {
  result: DetailedEvaluationResult;
  isExpanded: boolean;
  onToggle: () => void;
}

interface ResultItemState {
  showContext: boolean;
}

export class ResultItem extends React.Component<ResultItemProps, ResultItemState> {
  constructor(props: ResultItemProps) {
    super(props);
    this.state = {
      showContext: false
    };
  }

  handleToggleContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    this.setState(prevState => ({ showContext: !prevState.showContext }));
  };

  render() {
    const { result, isExpanded, onToggle } = this.props;
    const { showContext } = this.state;

    const borderColor = result.judge_correct
      ? 'border-green-500'
      : 'border-red-500';

    const iconColor = result.judge_correct
      ? 'text-green-500'
      : 'text-red-500';

    const badgeClass = result.judge_correct
      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';

    return (
    <div className={`border-l-4 ${borderColor}`}>
      <div
        className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              {result.judge_correct ? (
                <CheckCircle className={`h-5 w-5 ${iconColor} mr-2`} />
              ) : (
                <XCircle className={`h-5 w-5 ${iconColor} mr-2`} />
              )}
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {result.question}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Test Case: {result.test_case_id}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-900">
          <div className="space-y-4">
            {/* Question */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Question
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.question}</p>
            </div>

            {/* LLM Answer */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                LLM Answer
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                {result.llm_answer}
              </div>
            </div>

            {/* Judge Verdict */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Judge Verdict
              </h4>
              <div className="flex items-start">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                  {result.judge_correct ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {result.judge_reasoning}
              </p>
            </div>

            {/* Factual Errors */}
            {result.judge_factual_errors && result.judge_factual_errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Factual Errors
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {result.judge_factual_errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Information */}
            {result.judge_missing_info && result.judge_missing_info.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                  Missing Information
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {result.judge_missing_info.map((info, idx) => (
                    <li key={idx}>{info}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Retrieved Context (Collapsible) */}
            <div>
              <button
                onClick={this.handleToggleContext}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                <FileText className="h-4 w-4 mr-1" />
                {showContext ? 'Hide' : 'View'} Retrieved Context
              </button>
              {showContext && (
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{result.retrieved_context}</pre>
                </div>
              )}
            </div>

            {/* Ground Truth */}
            {result.ground_truth && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Expected Answer (Ground Truth)
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.ground_truth}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    );
  }
}
