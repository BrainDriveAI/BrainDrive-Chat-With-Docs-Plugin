import {
  PageSettingsService,
  PageContext,
  PageSettingsServiceDeps,
  PageContextChangeCallback,
} from './PageSettingsService';

describe('PageSettingsService', () => {
  let service: PageSettingsService;
  let mockSettings: any;
  let mockPageContext: any;
  let pageContextCallback: PageContextChangeCallback | null;

  beforeEach(() => {
    pageContextCallback = null;

    mockSettings = {
      getSetting: jest.fn(),
      setSetting: jest.fn(),
    };

    mockPageContext = {
      getCurrentPageContext: jest.fn(),
      onPageContextChange: jest.fn((callback: PageContextChangeCallback) => {
        pageContextCallback = callback;
        return jest.fn(); // unsubscribe function
      }),
    };

    service = new PageSettingsService({
      settings: mockSettings,
      pageContext: mockPageContext,
    });
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('getSettingKey', () => {
    it('should return page-specific key when page context exists', () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({
        pageId: 'page123',
      });

      const result = service.getSettingKey('streaming_enabled');

      expect(result).toBe('page_page123_streaming_enabled');
    });

    it('should return global key when page context is null', () => {
      mockPageContext.getCurrentPageContext.mockReturnValue(null);

      const result = service.getSettingKey('streaming_enabled');

      expect(result).toBe('streaming_enabled');
    });

    it('should return global key when page context has no pageId', () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({});

      const result = service.getSettingKey('streaming_enabled');

      expect(result).toBe('streaming_enabled');
    });

    it('should return global key when pageContext service not available', () => {
      const serviceWithoutPageContext = new PageSettingsService({
        settings: mockSettings,
        pageContext: null,
      });

      const result = serviceWithoutPageContext.getSettingKey('streaming_enabled');

      expect(result).toBe('streaming_enabled');
    });
  });

  describe('getSetting', () => {
    it('should return page-specific setting if exists', async () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({
        pageId: 'page123',
      });
      mockSettings.getSetting.mockResolvedValue(true);

      const result = await service.getSetting<boolean>('streaming_enabled');

      expect(result).toBe(true);
      expect(mockSettings.getSetting).toHaveBeenCalledWith(
        'page_page123_streaming_enabled'
      );
    });

    it('should fallback to global setting if page-specific is null', async () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({
        pageId: 'page123',
      });
      mockSettings.getSetting
        .mockResolvedValueOnce(null) // page-specific returns null
        .mockResolvedValueOnce(false); // global returns false

      const result = await service.getSetting<boolean>('streaming_enabled');

      expect(result).toBe(false);
      expect(mockSettings.getSetting).toHaveBeenCalledWith(
        'page_page123_streaming_enabled'
      );
      expect(mockSettings.getSetting).toHaveBeenCalledWith('streaming_enabled');
    });

    it('should fallback to global setting if page-specific is undefined', async () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({
        pageId: 'page123',
      });
      mockSettings.getSetting
        .mockResolvedValueOnce(undefined) // page-specific returns undefined
        .mockResolvedValueOnce(true); // global returns true

      const result = await service.getSetting<boolean>('streaming_enabled');

      expect(result).toBe(true);
    });

    it('should return null if settings service not available', async () => {
      const serviceWithoutSettings = new PageSettingsService({
        settings: null,
        pageContext: mockPageContext,
      });

      const result = await serviceWithoutSettings.getSetting<boolean>('streaming_enabled');

      expect(result).toBeNull();
    });

    it('should return null if settings service missing getSetting', async () => {
      const serviceWithInvalidSettings = new PageSettingsService({
        settings: {},
        pageContext: mockPageContext,
      });

      const result = await serviceWithInvalidSettings.getSetting<boolean>('streaming_enabled');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockSettings.getSetting.mockRejectedValue(new Error('Settings error'));

      const result = await service.getSetting<boolean>('streaming_enabled');

      expect(result).toBeNull();
    });

    it('should handle different value types', async () => {
      mockSettings.getSetting.mockResolvedValue('test-value');

      const result = await service.getSetting<string>('some_setting');

      expect(result).toBe('test-value');
    });

    it('should return null if both page-specific and global are null', async () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({
        pageId: 'page123',
      });
      mockSettings.getSetting.mockResolvedValue(null);

      const result = await service.getSetting<boolean>('streaming_enabled');

      expect(result).toBeNull();
    });
  });

  describe('setSetting', () => {
    it('should save to page-specific key when page context exists', async () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({
        pageId: 'page123',
      });
      mockSettings.setSetting.mockResolvedValue(undefined);

      await service.setSetting('streaming_enabled', true);

      expect(mockSettings.setSetting).toHaveBeenCalledWith(
        'page_page123_streaming_enabled',
        true
      );
    });

    it('should save to global key when page context is null', async () => {
      mockPageContext.getCurrentPageContext.mockReturnValue(null);
      mockSettings.setSetting.mockResolvedValue(undefined);

      await service.setSetting('streaming_enabled', false);

      expect(mockSettings.setSetting).toHaveBeenCalledWith(
        'streaming_enabled',
        false
      );
    });

    it('should not throw if settings service not available', async () => {
      const serviceWithoutSettings = new PageSettingsService({
        settings: null,
        pageContext: mockPageContext,
      });

      await expect(
        serviceWithoutSettings.setSetting('streaming_enabled', true)
      ).resolves.not.toThrow();
    });

    it('should not throw if settings service missing setSetting', async () => {
      const serviceWithInvalidSettings = new PageSettingsService({
        settings: {},
        pageContext: mockPageContext,
      });

      await expect(
        serviceWithInvalidSettings.setSetting('streaming_enabled', true)
      ).resolves.not.toThrow();
    });

    it('should not throw on error', async () => {
      mockSettings.setSetting.mockRejectedValue(new Error('Save error'));

      await expect(
        service.setSetting('streaming_enabled', true)
      ).resolves.not.toThrow();
    });

    it('should handle different value types', async () => {
      mockSettings.setSetting.mockResolvedValue(undefined);

      await service.setSetting('some_setting', 'test-value');

      expect(mockSettings.setSetting).toHaveBeenCalledWith(
        'some_setting',
        'test-value'
      );
    });
  });

  describe('initialize', () => {
    it('should get initial page context', () => {
      const mockContext: PageContext = { pageId: 'page123' };
      mockPageContext.getCurrentPageContext.mockReturnValue(mockContext);

      service.initialize();

      expect(mockPageContext.getCurrentPageContext).toHaveBeenCalled();
      expect(service.getCurrentPageContext()).toEqual(mockContext);
    });

    it('should subscribe to page context changes with callback', () => {
      const mockContext: PageContext = { pageId: 'page123' };
      mockPageContext.getCurrentPageContext.mockReturnValue(mockContext);
      const callback = jest.fn();

      service.initialize(callback);

      expect(mockPageContext.onPageContextChange).toHaveBeenCalled();

      // Simulate page context change
      const newContext: PageContext = { pageId: 'page456' };
      mockPageContext.getCurrentPageContext.mockReturnValue(newContext);
      if (pageContextCallback) {
        pageContextCallback(newContext);
      }

      expect(callback).toHaveBeenCalledWith(newContext);
      expect(service.getCurrentPageContext()).toEqual(newContext);
    });

    it('should not subscribe without callback', () => {
      mockPageContext.getCurrentPageContext.mockReturnValue({ pageId: 'page123' });

      service.initialize();

      expect(mockPageContext.onPageContextChange).not.toHaveBeenCalled();
    });

    it('should handle missing pageContext service', () => {
      const serviceWithoutPageContext = new PageSettingsService({
        settings: mockSettings,
        pageContext: null,
      });

      expect(() => serviceWithoutPageContext.initialize()).not.toThrow();
    });

    it('should handle initialization errors', () => {
      mockPageContext.getCurrentPageContext.mockImplementation(() => {
        throw new Error('Context error');
      });

      expect(() => service.initialize()).not.toThrow();
    });

    it('should update cached context on page change', () => {
      const initialContext: PageContext = { pageId: 'page123' };
      const newContext: PageContext = { pageId: 'page456' };

      mockPageContext.getCurrentPageContext.mockReturnValue(initialContext);
      const callback = jest.fn();

      service.initialize(callback);

      expect(service.getCurrentPageContext()).toEqual(initialContext);

      // Trigger page context change
      mockPageContext.getCurrentPageContext.mockReturnValue(newContext);
      if (pageContextCallback) {
        pageContextCallback(newContext);
      }

      expect(service.getCurrentPageContext()).toEqual(newContext);
    });
  });

  describe('getCurrentPageContext', () => {
    it('should return current page context from service', () => {
      const mockContext: PageContext = { pageId: 'page123' };
      mockPageContext.getCurrentPageContext.mockReturnValue(mockContext);

      const result = service.getCurrentPageContext();

      expect(result).toEqual(mockContext);
    });

    it('should return cached context on error', () => {
      const mockContext: PageContext = { pageId: 'page123' };
      mockPageContext.getCurrentPageContext.mockReturnValue(mockContext);

      service.initialize();

      // Now make getCurrentPageContext throw
      mockPageContext.getCurrentPageContext.mockImplementation(() => {
        throw new Error('Context error');
      });

      const result = service.getCurrentPageContext();

      // Should return cached value
      expect(result).toEqual(mockContext);
    });

    it('should return cached context when service not available', () => {
      const mockContext: PageContext = { pageId: 'page123' };
      mockPageContext.getCurrentPageContext.mockReturnValue(mockContext);

      service.initialize();

      // Create new service without pageContext but with cached state
      const deps: PageSettingsServiceDeps = {
        settings: mockSettings,
        pageContext: null,
      };
      const serviceWithoutContext = new PageSettingsService(deps);
      (serviceWithoutContext as any).currentPageContext = mockContext;

      const result = serviceWithoutContext.getCurrentPageContext();

      expect(result).toEqual(mockContext);
    });

    it('should return null if no context available', () => {
      mockPageContext.getCurrentPageContext.mockReturnValue(null);

      const result = service.getCurrentPageContext();

      expect(result).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from page context changes', () => {
      const unsubscribe = jest.fn();
      mockPageContext.onPageContextChange.mockReturnValue(unsubscribe);
      mockPageContext.getCurrentPageContext.mockReturnValue({ pageId: 'page123' });

      service.initialize(jest.fn());
      service.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should handle cleanup when not subscribed', () => {
      expect(() => service.cleanup()).not.toThrow();
    });

    it('should clear unsubscribe reference', () => {
      const unsubscribe = jest.fn();
      mockPageContext.onPageContextChange.mockReturnValue(unsubscribe);
      mockPageContext.getCurrentPageContext.mockReturnValue({ pageId: 'page123' });

      service.initialize(jest.fn());
      service.cleanup();

      // Second cleanup should not call unsubscribe again
      service.cleanup();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
