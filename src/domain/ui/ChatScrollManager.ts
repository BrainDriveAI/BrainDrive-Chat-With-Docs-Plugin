import { UI_CONFIG } from '../../constants';

/**
 * Scroll behavior options for scrolling operations
 */
export interface ScrollToBottomOptions {
  behavior?: ScrollBehavior;
  manual?: boolean;
  force?: boolean;
}

/**
 * Scroll state managed by ChatScrollManager
 */
export interface ScrollState {
  isNearBottom: boolean;
  showScrollToBottom: boolean;
  isAutoScrollLocked: boolean;
}

/**
 * Configuration for ChatScrollManager
 */
export interface ChatScrollConfig {
  /** Offset from bottom when auto-scrolling (prevents hiding content) */
  scrollAnchorOffset?: number;
  /** Minimum visible height of last message */
  minVisibleLastMessageHeight?: number;
  /** Distance threshold for "near bottom" detection */
  nearBottomEpsilon?: number;
  /** Strict threshold for "at bottom" detection */
  strictBottomThreshold?: number;
  /** Grace period for user scroll intent (ms) */
  userScrollIntentGraceMs?: number;
  /** Debounce delay for auto-scroll (ms) */
  scrollDebounceDelay?: number;
}

/**
 * Message interface for streaming detection
 */
export interface ScrollMessage {
  isStreaming?: boolean;
}

/**
 * ChatScrollManager manages scroll behavior, user intent tracking, and auto-scroll logic.
 *
 * Features:
 * - Smart auto-scroll during streaming (respects user intent)
 * - Anchor offset (keeps content visible above bottom)
 * - User scroll intent detection with grace period
 * - Debounced auto-scroll for performance
 * - State management for scroll indicators
 */
export class ChatScrollManager {
  // Configuration
  private readonly scrollAnchorOffset: number;
  private readonly minVisibleLastMessageHeight: number;
  private readonly nearBottomEpsilon: number;
  private readonly strictBottomThreshold: number;
  private readonly userScrollIntentGraceMs: number;
  private readonly scrollDebounceDelay: number;

  // State
  private isProgrammaticScroll = false;
  private pendingAutoScrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastUserScrollTs = 0;
  private containerRef: HTMLDivElement | null = null;
  private messages: ScrollMessage[] = [];
  private currentState: ScrollState = {
    isNearBottom: true,
    showScrollToBottom: false,
    isAutoScrollLocked: false,
  };

  // Callbacks
  private onStateChangeCallback?: (state: ScrollState) => void;

  constructor(config: ChatScrollConfig = {}) {
    this.scrollAnchorOffset = config.scrollAnchorOffset ?? 420;
    this.minVisibleLastMessageHeight = config.minVisibleLastMessageHeight ?? 64;
    this.nearBottomEpsilon = config.nearBottomEpsilon ?? 24;
    this.strictBottomThreshold = config.strictBottomThreshold ?? 4;
    this.userScrollIntentGraceMs = config.userScrollIntentGraceMs ?? 300;
    this.scrollDebounceDelay = config.scrollDebounceDelay ?? UI_CONFIG.SCROLL_DEBOUNCE_DELAY;
  }

  /**
   * Set the container element to manage scrolling for
   */
  setContainer(container: HTMLDivElement | null): void {
    this.containerRef = container;
  }

  /**
   * Update messages for streaming detection
   */
  setMessages(messages: ScrollMessage[]): void {
    this.messages = messages;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: ScrollState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Get current scroll state
   */
  getState(): ScrollState {
    return { ...this.currentState };
  }

  /**
   * Cleanup pending timeouts
   */
  cleanup(): void {
    this.cancelPendingAutoScroll();
  }

  /**
   * Determine how far above the live edge we should keep the viewport.
   * Ensures we never hide the entire final message when it's short.
   */
  private getEffectiveAnchorOffset(container: HTMLDivElement): number {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage?.isStreaming) {
      return 0;
    }

    const baseOffset = Math.max(this.scrollAnchorOffset, 0);
    if (baseOffset === 0) {
      return 0;
    }

    const lastMessageElement = container.querySelector('.message:last-of-type') as HTMLElement | null;
    if (!lastMessageElement) {
      return baseOffset;
    }

    const lastMessageHeight = lastMessageElement.offsetHeight;
    const maxAllowableOffset = Math.max(lastMessageHeight - this.minVisibleLastMessageHeight, 0);
    return Math.min(baseOffset, maxAllowableOffset);
  }

  /**
   * Get scroll metrics for current container
   */
  private getScrollMetrics() {
    const container = this.containerRef;
    if (!container) {
      return {
        distanceFromBottom: 0,
        dynamicOffset: 0
      };
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const dynamicOffset = this.getEffectiveAnchorOffset(container);

    return { distanceFromBottom, dynamicOffset };
  }

  /**
   * Check if user is near the bottom of the chat
   */
  isUserNearBottom(thresholdOverride?: number): boolean {
    if (!this.containerRef) return true;

    const { distanceFromBottom, dynamicOffset } = this.getScrollMetrics();
    const threshold = thresholdOverride ?? Math.max(dynamicOffset, this.nearBottomEpsilon);

    return distanceFromBottom <= threshold;
  }

  /**
   * Check if user has scrolled recently (within grace period)
   */
  private hasRecentUserIntent(): boolean {
    if (!this.lastUserScrollTs) {
      return false;
    }

    return Date.now() - this.lastUserScrollTs <= this.userScrollIntentGraceMs;
  }

  /**
   * Check if auto-scroll is allowed
   */
  canAutoScroll(requestedAt: number = Date.now()): boolean {
    if (this.currentState.isAutoScrollLocked) {
      return false;
    }

    if (this.lastUserScrollTs && this.lastUserScrollTs > requestedAt) {
      return false;
    }

    return this.isUserNearBottom();
  }

  /**
   * Cancel pending auto-scroll timeout
   */
  private cancelPendingAutoScroll(): void {
    if (this.pendingAutoScrollTimeout) {
      clearTimeout(this.pendingAutoScrollTimeout);
      this.pendingAutoScrollTimeout = null;
    }
  }

  /**
   * Register user scroll intent and update state
   */
  private registerUserScrollIntent(): void {
    this.lastUserScrollTs = Date.now();
    this.cancelPendingAutoScroll();

    const prevState = this.currentState;
    if (prevState.isAutoScrollLocked && prevState.showScrollToBottom) {
      return;
    }

    this.updateState({
      isAutoScrollLocked: true,
      showScrollToBottom: true
    });
  }

  /**
   * Update scroll state based on current position
   */
  updateScrollState(options: { fromUser?: boolean; manualUnlock?: boolean } = {}): void {
    if (!this.containerRef) return;

    const { fromUser = false, manualUnlock = false } = options;
    const { distanceFromBottom, dynamicOffset } = this.getScrollMetrics();
    const nearBottomThreshold = Math.max(dynamicOffset, this.nearBottomEpsilon);
    const isNearBottom = distanceFromBottom <= nearBottomThreshold;
    const isAtStrictBottom = distanceFromBottom <= this.strictBottomThreshold;

    let shouldClearUserIntent = false;
    let shouldSuppressManualIntent = false;

    const prevState = this.currentState;
    let isAutoScrollLocked = prevState.isAutoScrollLocked;

    if (manualUnlock) {
      if (isAutoScrollLocked) {
        shouldClearUserIntent = true;
      }
      isAutoScrollLocked = false;
    } else if (fromUser) {
      if (isAtStrictBottom) {
        if (isAutoScrollLocked) {
          shouldClearUserIntent = true;
        }
        isAutoScrollLocked = false;
        shouldSuppressManualIntent = true;
      } else {
        isAutoScrollLocked = true;
      }
    } else if (isAtStrictBottom && prevState.isAutoScrollLocked && !this.hasRecentUserIntent()) {
      isAutoScrollLocked = false;
      shouldClearUserIntent = true;
    }

    const nextShowScrollToBottom = isAutoScrollLocked ? true : !isAtStrictBottom;

    // Only update if state changed
    if (
      prevState.isNearBottom === isNearBottom &&
      prevState.showScrollToBottom === nextShowScrollToBottom &&
      prevState.isAutoScrollLocked === isAutoScrollLocked
    ) {
      // State callback for post-update actions
      if (shouldClearUserIntent && !isAutoScrollLocked) {
        this.lastUserScrollTs = 0;
      }
      if (shouldSuppressManualIntent) {
        this.lastUserScrollTs = 0;
      }
      return;
    }

    this.updateState({
      isNearBottom,
      showScrollToBottom: nextShowScrollToBottom,
      isAutoScrollLocked
    });

    // Post-update actions
    if (shouldClearUserIntent && !isAutoScrollLocked) {
      this.lastUserScrollTs = 0;
    }
    if (shouldSuppressManualIntent) {
      this.lastUserScrollTs = 0;
    }
  }

  /**
   * Handle scroll events to track user scroll position
   */
  handleScroll(): void {
    if (this.isProgrammaticScroll) {
      this.updateScrollState();
      return;
    }

    this.registerUserScrollIntent();
    this.updateScrollState({ fromUser: true });
  }

  /**
   * Handle user scroll intent from various sources
   */
  handleUserScrollIntent(_source: 'pointer' | 'wheel' | 'touch' | 'key'): void {
    this.registerUserScrollIntent();
  }

  /**
   * Handle scroll to bottom button click
   */
  handleScrollToBottomClick(): void {
    this.scrollToBottom({ behavior: 'smooth', manual: true });
  }

  /**
   * Follow stream if auto-scroll is allowed
   */
  followStreamIfAllowed(): void {
    if (this.canAutoScroll()) {
      this.scrollToBottom();
    } else {
      this.updateScrollState();
    }
  }

  /**
   * Scroll the chat history to the bottom while respecting the anchor offset
   */
  scrollToBottom(options: ScrollToBottomOptions = {}): void {
    if (!this.containerRef) return;

    this.cancelPendingAutoScroll();
    const { behavior = 'auto', manual = false, force = false } = options;
    const container = this.containerRef;

    const useAnchorOffset = !(manual || force);
    const dynamicOffset = useAnchorOffset ? this.getEffectiveAnchorOffset(container) : 0;
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    const targetTop = Math.max(maxScrollTop - dynamicOffset, 0);

    this.isProgrammaticScroll = true;

    if (typeof container.scrollTo === 'function') {
      try {
        container.scrollTo({ top: targetTop, behavior });
      } catch (_err) {
        container.scrollTop = targetTop;
      }
    } else {
      container.scrollTop = targetTop;
    }

    const finalize = () => {
      this.isProgrammaticScroll = false;
      if (manual || force) {
        this.lastUserScrollTs = 0;
        this.updateScrollState({ manualUnlock: true });
      } else {
        this.updateScrollState();
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(finalize);
    } else {
      setTimeout(finalize, 0);
    }
  }

  /**
   * Debounced scroll to bottom
   */
  debouncedScrollToBottom(options?: ScrollToBottomOptions): void {
    const requestedAt = Date.now();

    if (this.pendingAutoScrollTimeout) {
      clearTimeout(this.pendingAutoScrollTimeout);
    }

    this.pendingAutoScrollTimeout = setTimeout(() => {
      this.pendingAutoScrollTimeout = null;
      if (this.canAutoScroll(requestedAt)) {
        this.scrollToBottom(options);
      } else {
        this.updateScrollState();
      }
    }, this.scrollDebounceDelay);
  }

  /**
   * Update internal state and notify callback
   */
  private updateState(updates: Partial<ScrollState>): void {
    this.currentState = {
      ...this.currentState,
      ...updates
    };

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.currentState);
    }
  }
}
