/**
 * Page settings information
 */
export interface PageContext {
  pageId: string;
  [key: string]: any;
}

/**
 * Dependencies for PageSettingsService
 */
export interface PageSettingsServiceDeps {
  settings: any;
  pageContext: any;
}

/**
 * Callback for page context changes
 */
export type PageContextChangeCallback = (context: PageContext | null) => void;

/**
 * PageSettingsService handles page-specific settings with global fallbacks.
 *
 * Responsibilities:
 * - Get page-specific setting keys
 * - Load settings with page-specific and global fallback
 * - Save settings to page-specific keys
 * - Subscribe to page context changes
 * - Get current page context
 */
export class PageSettingsService {
  private currentPageContext: PageContext | null = null;
  private pageContextUnsubscribe: (() => void) | null = null;

  constructor(private deps: PageSettingsServiceDeps) {}

  /**
   * Get page-specific setting key with fallback to global
   */
  getSettingKey(baseSetting: string): string {
    const pageContext = this.getCurrentPageContext();
    if (pageContext?.pageId) {
      return `page_${pageContext.pageId}_${baseSetting}`;
    }
    return baseSetting; // Fallback to global
  }

  /**
   * Get setting value with page-specific and global fallback
   */
  async getSetting<T>(baseSetting: string): Promise<T | null> {
    try {
      if (!this.deps.settings?.getSetting) {
        return null;
      }

      // Try page-specific setting first
      const pageSpecificKey = this.getSettingKey(baseSetting);
      let savedValue = await this.deps.settings.getSetting(pageSpecificKey);

      // Fallback to global setting if page-specific doesn't exist
      if (savedValue === null || savedValue === undefined) {
        savedValue = await this.deps.settings.getSetting(baseSetting);
      }

      return savedValue ?? null;
    } catch (error) {
      console.error('Error getting setting:', error);
      return null;
    }
  }

  /**
   * Save setting to page-specific key
   */
  async setSetting<T>(baseSetting: string, value: T): Promise<void> {
    try {
      if (!this.deps.settings?.setSetting) {
        return;
      }

      // Save to page-specific setting key
      const pageSpecificKey = this.getSettingKey(baseSetting);
      await this.deps.settings.setSetting(pageSpecificKey, value);
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }

  /**
   * Initialize page context service and subscribe to changes
   */
  initialize(onPageContextChange?: PageContextChangeCallback): void {
    if (!this.deps.pageContext) {
      return;
    }

    try {
      // Get initial page context
      this.currentPageContext = this.deps.pageContext.getCurrentPageContext();

      // Subscribe to page context changes
      if (onPageContextChange) {
        this.pageContextUnsubscribe = this.deps.pageContext.onPageContextChange(
          (context: PageContext | null) => {
            this.currentPageContext = context;
            onPageContextChange(context);
          }
        );
      }
    } catch (error) {
      console.warn('Failed to initialize page context service:', error);
    }
  }

  /**
   * Get current page context
   */
  getCurrentPageContext(): PageContext | null {
    if (this.deps.pageContext) {
      try {
        return this.deps.pageContext.getCurrentPageContext();
      } catch (error) {
        // Fallback to cached context
      }
    }
    return this.currentPageContext;
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    if (this.pageContextUnsubscribe) {
      this.pageContextUnsubscribe();
      this.pageContextUnsubscribe = null;
    }
  }
}
