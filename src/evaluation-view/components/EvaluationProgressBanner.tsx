import React from 'react';
import { Loader2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EvaluationProgressBannerProps {
  processedCount: number;
  totalCount: number;
  accuracy: number;
  startTime: string;
  onAbort: () => void;
}

interface EvaluationProgressBannerState {
  elapsedSeconds: number;
}

/**
 * Progress banner shown during active evaluation
 * Displays real-time progress, accuracy, time elapsed, ETA
 */
export class EvaluationProgressBanner extends React.Component<
  EvaluationProgressBannerProps,
  EvaluationProgressBannerState
> {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(props: EvaluationProgressBannerProps) {
    super(props);
    this.state = {
      elapsedSeconds: this.calculateElapsedSeconds(),
    };
  }

  componentDidMount() {
    // Update elapsed time every second
    this.intervalId = setInterval(() => {
      this.setState({
        elapsedSeconds: this.calculateElapsedSeconds(),
      });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  calculateElapsedSeconds = (): number => {
    const { startTime } = this.props;
    if (!startTime) return 0;

    const start = new Date(startTime).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 1000);
  };

  formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  calculateETA = (): string => {
    const { processedCount, totalCount } = this.props;
    const { elapsedSeconds } = this.state;

    if (processedCount === 0) return 'Calculating...';

    const remainingQuestions = totalCount - processedCount;
    if (remainingQuestions === 0) return 'Finishing...';

    const avgTimePerQuestion = elapsedSeconds / processedCount;
    const estimatedRemainingSeconds = Math.ceil(avgTimePerQuestion * remainingQuestions);

    const minutes = Math.ceil(estimatedRemainingSeconds / 60);

    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '~1 min';
    return `~${minutes} min`;
  };

  isDarkMode = (): boolean => {
    return document.querySelector('.dark') !== null;
  };

  render() {
    const { processedCount, totalCount, accuracy, onAbort } = this.props;
    const { elapsedSeconds } = this.state;
    const isDark = this.isDarkMode();

    const progressPercentage = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
    const eta = this.calculateETA();

    return (
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: isDark ? '#1e40af' : '#dbeafe',
          borderBottom: `2px solid ${isDark ? '#3b82f6' : '#2563eb'}`,
          padding: '12px 16px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {/* Left: Animated loader icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Loader2
              className="animate-spin"
              size={20}
              style={{ color: isDark ? '#93c5fd' : '#1e40af' }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isDark ? '#e0e7ff' : '#1e3a8a',
              }}
            >
              Evaluation in progress
            </span>
          </div>

          {/* Middle: Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flex: 1,
              flexWrap: 'wrap',
            }}
          >
            {/* Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: isDark ? '#93c5fd' : '#1e40af',
                  fontWeight: 500,
                }}
              >
                Progress
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#e0e7ff' : '#1e3a8a',
                }}
              >
                {processedCount}/{totalCount} ({progressPercentage}%)
              </span>
            </div>

            {/* Accuracy */}
            {processedCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: isDark ? '#93c5fd' : '#1e40af',
                    fontWeight: 500,
                  }}
                >
                  Accuracy
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#e0e7ff' : '#1e3a8a',
                  }}
                >
                  {(accuracy * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {/* Time Elapsed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: isDark ? '#93c5fd' : '#1e40af',
                  fontWeight: 500,
                }}
              >
                Time Elapsed
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#e0e7ff' : '#1e3a8a',
                }}
              >
                {this.formatTime(elapsedSeconds)}
              </span>
            </div>

            {/* ETA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: isDark ? '#93c5fd' : '#1e40af',
                  fontWeight: 500,
                }}
              >
                ETA
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#e0e7ff' : '#1e3a8a',
                }}
              >
                {eta}
              </span>
            </div>
          </div>

          {/* Right: Abort button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAbort}
            style={{
              backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
              borderColor: isDark ? '#dc2626' : '#ef4444',
              color: isDark ? '#fee2e2' : '#7f1d1d',
            }}
          >
            <Pause size={16} style={{ marginRight: '6px' }} />
            Pause
          </Button>
        </div>
      </div>
    );
  }
}
