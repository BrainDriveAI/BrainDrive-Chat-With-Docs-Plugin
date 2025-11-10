import React from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

interface ToastState {
  isExiting: boolean;
}

/**
 * Individual Toast component (class-based, no hooks)
 */
export class Toast extends React.Component<ToastProps, ToastState> {
  private dismissTimer: NodeJS.Timeout | null = null;

  constructor(props: ToastProps) {
    super(props);
    this.state = {
      isExiting: false,
    };
  }

  componentDidMount() {
    const duration = this.props.toast.duration || 3000;
    this.dismissTimer = setTimeout(() => {
      this.handleDismiss();
    }, duration);
  }

  componentWillUnmount() {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  handleDismiss = () => {
    this.setState({ isExiting: true });
    setTimeout(() => {
      this.props.onDismiss(this.props.toast.id);
    }, 300); // Match animation duration
  };

  getIcon = () => {
    const { type } = this.props.toast;
    const iconProps = { size: 20, className: 'flex-shrink-0' };

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} style={{ color: '#10b981' }} />;
      case 'error':
        return <XCircle {...iconProps} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertCircle {...iconProps} style={{ color: '#f59e0b' }} />;
      case 'info':
      default:
        return <Info {...iconProps} style={{ color: '#3b82f6' }} />;
    }
  };

  getStyles = () => {
    const { type } = this.props.toast;
    const isDark = document.querySelector('.dark') !== null;

    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      minWidth: '320px',
      maxWidth: '420px',
      marginBottom: '8px',
      transition: 'all 0.3s ease-out',
      opacity: this.state.isExiting ? 0 : 1,
      transform: this.state.isExiting ? 'translateX(100%)' : 'translateX(0)',
    };

    const typeStyles: Record<ToastType, any> = {
      success: {
        backgroundColor: isDark ? '#064e3b' : '#d1fae5',
        border: `1px solid ${isDark ? '#059669' : '#10b981'}`,
        color: isDark ? '#d1fae5' : '#064e3b',
      },
      error: {
        backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
        border: `1px solid ${isDark ? '#dc2626' : '#ef4444'}`,
        color: isDark ? '#fee2e2' : '#7f1d1d',
      },
      warning: {
        backgroundColor: isDark ? '#78350f' : '#fef3c7',
        border: `1px solid ${isDark ? '#f59e0b' : '#fbbf24'}`,
        color: isDark ? '#fef3c7' : '#78350f',
      },
      info: {
        backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
        border: `1px solid ${isDark ? '#3b82f6' : '#60a5fa'}`,
        color: isDark ? '#dbeafe' : '#1e3a8a',
      },
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  render() {
    const { message } = this.props.toast;

    return (
      <div style={this.getStyles()}>
        {this.getIcon()}
        <span style={{ flex: 1, fontSize: '14px' }}>{message}</span>
        <button
          onClick={this.handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <X size={16} />
        </button>
      </div>
    );
  }
}

/**
 * Toast Container - manages multiple toasts (class-based)
 */
interface ToastContainerProps {}

interface ToastContainerState {
  toasts: ToastData[];
}

export class ToastContainer extends React.Component<ToastContainerProps, ToastContainerState> {
  constructor(props: ToastContainerProps) {
    super(props);
    this.state = {
      toasts: [],
    };

    // Register this instance with the ToastManager
    ToastManager.setInstance(this);
  }

  componentWillUnmount() {
    // Unregister when unmounting
    ToastManager.setInstance(null);
  }

  addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastData = { ...toast, id };

    this.setState((prev) => ({
      toasts: [...prev.toasts, newToast],
    }));

    return id;
  };

  removeToast = (id: string) => {
    this.setState((prev) => ({
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  };

  render() {
    const { toasts } = this.state;

    if (toasts.length === 0) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={this.removeToast} />
        ))}
      </div>
    );
  }
}

/**
 * Toast Manager - singleton to show toasts from anywhere
 */
class ToastManagerClass {
  private instance: ToastContainer | null = null;

  setInstance(instance: ToastContainer | null) {
    this.instance = instance;
  }

  show(message: string, type: ToastType = 'info', duration: number = 3000) {
    if (!this.instance) {
      console.warn('ToastContainer not mounted. Cannot show toast.');
      return;
    }

    return this.instance.addToast({ message, type, duration });
  }

  success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.show(message, 'error', duration);
  }

  info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration);
  }
}

export const ToastManager = new ToastManagerClass();
