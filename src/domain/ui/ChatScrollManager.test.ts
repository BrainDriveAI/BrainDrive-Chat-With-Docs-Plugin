import { ChatScrollManager, ScrollMessage } from './ChatScrollManager';

describe('ChatScrollManager', () => {
  let manager: ChatScrollManager;
  let mockContainer: HTMLDivElement;
  let stateChanges: any[];

  beforeEach(() => {
    manager = new ChatScrollManager();
    stateChanges = [];

    // Mock container
    mockContainer = {
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
      scrollTo: jest.fn(),
      querySelector: jest.fn(() => null),
    } as any;

    manager.setContainer(mockContainer);
    manager.onStateChange((state) => {
      stateChanges.push({ ...state });
    });
  });

  afterEach(() => {
    manager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const state = manager.getState();
      expect(state).toEqual({
        isNearBottom: true,
        showScrollToBottom: false,
        isAutoScrollLocked: false,
      });
    });

    it('should accept custom config', () => {
      const customManager = new ChatScrollManager({
        scrollAnchorOffset: 200,
        minVisibleLastMessageHeight: 100,
        nearBottomEpsilon: 50,
        strictBottomThreshold: 10,
        userScrollIntentGraceMs: 500,
        scrollDebounceDelay: 200,
      });
      expect(customManager).toBeDefined();
    });
  });

  describe('isUserNearBottom', () => {
    it('should return true when at bottom', () => {
      mockContainer.scrollTop = 500; // scrollHeight (1000) - clientHeight (500)
      expect(manager.isUserNearBottom()).toBe(true);
    });

    it('should return true when within epsilon of bottom', () => {
      mockContainer.scrollTop = 480; // 20px from bottom (within 24px epsilon)
      expect(manager.isUserNearBottom()).toBe(true);
    });

    it('should return false when far from bottom', () => {
      mockContainer.scrollTop = 0;
      expect(manager.isUserNearBottom()).toBe(false);
    });

    it('should use threshold override when provided', () => {
      mockContainer.scrollTop = 450; // 50px from bottom
      expect(manager.isUserNearBottom(100)).toBe(true);
      expect(manager.isUserNearBottom(25)).toBe(false);
    });

    it('should return true when no container set', () => {
      manager.setContainer(null);
      expect(manager.isUserNearBottom()).toBe(true);
    });
  });

  describe('canAutoScroll', () => {
    it('should allow auto-scroll when near bottom and not locked', () => {
      mockContainer.scrollTop = 500;
      expect(manager.canAutoScroll()).toBe(true);
    });

    it('should prevent auto-scroll when locked', () => {
      mockContainer.scrollTop = 500;
      manager.handleUserScrollIntent('wheel');
      expect(manager.canAutoScroll()).toBe(false);
    });

    it('should prevent auto-scroll when not near bottom', () => {
      mockContainer.scrollTop = 0;
      expect(manager.canAutoScroll()).toBe(false);
    });

    it('should prevent auto-scroll if user scrolled after request time', () => {
      const requestedAt = Date.now();
      manager.handleUserScrollIntent('wheel');
      expect(manager.canAutoScroll(requestedAt - 100)).toBe(false);
    });
  });

  describe('scrollToBottom', () => {
    it('should scroll to bottom with default behavior', () => {
      manager.scrollToBottom();

      // requestAnimationFrame is async, so we need to wait
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockContainer.scrollTo).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    it('should use smooth behavior when specified', () => {
      manager.scrollToBottom({ behavior: 'smooth' });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockContainer.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ behavior: 'smooth' })
          );
          resolve();
        }, 10);
      });
    });

    it('should apply anchor offset by default', () => {
      const messages: ScrollMessage[] = [{ isStreaming: false }];
      manager.setMessages(messages);

      manager.scrollToBottom();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const call = (mockContainer.scrollTo as jest.Mock).mock.calls[0][0];
          // Anchor offset should reduce target scroll position
          expect(call.top).toBeLessThan(500);
          resolve();
        }, 10);
      });
    });

    it('should not apply anchor offset when manual=true', () => {
      manager.scrollToBottom({ manual: true });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const call = (mockContainer.scrollTo as jest.Mock).mock.calls[0][0];
          expect(call.top).toBe(500); // scrollHeight - clientHeight
          resolve();
        }, 10);
      });
    });

    it('should not apply anchor offset when force=true', () => {
      manager.scrollToBottom({ force: true });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const call = (mockContainer.scrollTo as jest.Mock).mock.calls[0][0];
          expect(call.top).toBe(500);
          resolve();
        }, 10);
      });
    });

    it('should fall back to scrollTop if scrollTo not available', () => {
      delete (mockContainer as any).scrollTo;

      manager.scrollToBottom();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockContainer.scrollTop).toBeGreaterThan(0);
          resolve();
        }, 10);
      });
    });

    it('should not scroll when streaming last message', () => {
      const messages: ScrollMessage[] = [{ isStreaming: true }];
      manager.setMessages(messages);

      manager.scrollToBottom();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const call = (mockContainer.scrollTo as jest.Mock).mock.calls[0][0];
          // No anchor offset when streaming
          expect(call.top).toBe(500);
          resolve();
        }, 10);
      });
    });
  });

  describe('handleScroll', () => {
    it('should lock auto-scroll when user scrolls up', () => {
      mockContainer.scrollTop = 0;
      manager.handleScroll();

      expect(manager.getState().isAutoScrollLocked).toBe(true);
      expect(manager.getState().showScrollToBottom).toBe(true);
    });

    it('should not lock when programmatic scroll', () => {
      mockContainer.scrollTop = 500;
      manager.scrollToBottom();

      // The scroll event during programmatic scroll should not lock
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(manager.getState().isAutoScrollLocked).toBe(false);
          resolve();
        }, 10);
      });
    });
  });

  describe('updateScrollState', () => {
    it('should update state based on scroll position', () => {
      mockContainer.scrollTop = 0;
      manager.updateScrollState();

      const state = manager.getState();
      expect(state.isNearBottom).toBe(false);
    });

    it('should unlock when at strict bottom with fromUser=true', () => {
      mockContainer.scrollTop = 498; // Within strict threshold (4px)
      manager.handleUserScrollIntent('wheel'); // Lock it first

      manager.updateScrollState({ fromUser: true });

      expect(manager.getState().isAutoScrollLocked).toBe(false);
    });

    it('should unlock with manualUnlock option', () => {
      manager.handleUserScrollIntent('wheel'); // Lock it

      manager.updateScrollState({ manualUnlock: true });

      expect(manager.getState().isAutoScrollLocked).toBe(false);
    });

    it('should not update if state unchanged', () => {
      // First set state to something different
      mockContainer.scrollTop = 0;
      manager.updateScrollState();

      stateChanges = [];
      mockContainer.scrollTop = 500;

      manager.updateScrollState();
      manager.updateScrollState(); // Second call with same position

      // Should only emit one change (from 0 to 500)
      expect(stateChanges.length).toBe(1);
    });
  });

  describe('handleScrollToBottomClick', () => {
    it('should scroll to bottom with smooth behavior', () => {
      manager.handleScrollToBottomClick();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockContainer.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ behavior: 'smooth' })
          );
          resolve();
        }, 10);
      });
    });

    it('should unlock auto-scroll', () => {
      manager.handleUserScrollIntent('wheel'); // Lock it first
      manager.handleScrollToBottomClick();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(manager.getState().isAutoScrollLocked).toBe(false);
          resolve();
        }, 10);
      });
    });
  });

  describe('followStreamIfAllowed', () => {
    it('should scroll when auto-scroll allowed', () => {
      mockContainer.scrollTop = 500;
      manager.followStreamIfAllowed();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockContainer.scrollTo).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    it('should only update state when auto-scroll locked', () => {
      mockContainer.scrollTop = 0;
      manager.handleUserScrollIntent('wheel'); // Lock it

      (mockContainer.scrollTo as jest.Mock).mockClear();
      manager.followStreamIfAllowed();

      expect(mockContainer.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('debouncedScrollToBottom', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce scroll calls', () => {
      mockContainer.scrollTop = 500;

      manager.debouncedScrollToBottom();
      manager.debouncedScrollToBottom();
      manager.debouncedScrollToBottom();

      expect(mockContainer.scrollTo).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      // Should only scroll once after debounce
      expect(mockContainer.scrollTo).toHaveBeenCalledTimes(1);
    });

    it('should not scroll if auto-scroll not allowed after delay', () => {
      mockContainer.scrollTop = 500;
      manager.debouncedScrollToBottom();

      // User scrolls up during debounce
      mockContainer.scrollTop = 0;
      manager.handleUserScrollIntent('wheel');

      jest.advanceTimersByTime(100);

      expect(mockContainer.scrollTo).not.toHaveBeenCalled();
    });

    it('should cancel previous timeout when called again', () => {
      mockContainer.scrollTop = 500;

      manager.debouncedScrollToBottom();
      jest.advanceTimersByTime(50);

      manager.debouncedScrollToBottom(); // Reset timer
      jest.advanceTimersByTime(50);

      expect(mockContainer.scrollTo).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(mockContainer.scrollTo).toHaveBeenCalledTimes(1);
    });
  });

  describe('state change callback', () => {
    it('should notify on state changes', () => {
      mockContainer.scrollTop = 0;
      manager.updateScrollState();

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1]).toHaveProperty('isNearBottom');
    });

    it('should not notify when state unchanged', () => {
      // First set state to something different
      mockContainer.scrollTop = 0;
      manager.updateScrollState();

      stateChanges = [];
      mockContainer.scrollTop = 500;

      manager.updateScrollState();
      manager.updateScrollState(); // Same position again

      // Should only notify once (from 0 to 500)
      expect(stateChanges.length).toBe(1);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cancel pending timeouts', () => {
      mockContainer.scrollTop = 500;
      manager.debouncedScrollToBottom();

      manager.cleanup();
      jest.advanceTimersByTime(100);

      expect(mockContainer.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('effective anchor offset', () => {
    it('should return 0 when streaming', () => {
      const messages: ScrollMessage[] = [{ isStreaming: true }];
      manager.setMessages(messages);
      mockContainer.scrollTop = 500;

      manager.scrollToBottom();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const call = (mockContainer.scrollTo as jest.Mock).mock.calls[0][0];
          expect(call.top).toBe(500); // Full scroll, no offset
          resolve();
        }, 10);
      });
    });

    it('should limit offset based on last message height', () => {
      const messages: ScrollMessage[] = [{ isStreaming: false }];
      manager.setMessages(messages);

      const mockMessageElement = {
        offsetHeight: 100,
      } as HTMLElement;

      (mockContainer.querySelector as jest.Mock).mockReturnValue(mockMessageElement);

      manager.scrollToBottom();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const call = (mockContainer.scrollTo as jest.Mock).mock.calls[0][0];
          // Offset should be limited to (100 - 64) = 36
          // Target = 500 - 36 = 464
          expect(call.top).toBe(464);
          resolve();
        }, 10);
      });
    });
  });
});
