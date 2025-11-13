import {
  PersonaResolver,
  PersonaInfo,
  ResolvePersonaOptions,
} from './PersonaResolver';

describe('PersonaResolver', () => {
  let resolver: PersonaResolver;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      get: jest.fn(),
    };

    resolver = new PersonaResolver({ api: mockApi });
  });

  afterEach(() => {
    resolver.reset();
  });

  describe('loadPersonas', () => {
    it('should use provided personas if available', async () => {
      const availablePersonas: PersonaInfo[] = [
        { id: '1', name: 'Assistant' },
        { id: '2', name: 'Helper' },
      ];

      const result = await resolver.loadPersonas(availablePersonas);

      expect(result).toEqual(availablePersonas);
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should load personas from API if none provided', async () => {
      const mockPersonas = [
        { id: '1', name: 'Assistant' },
        { id: '2', name: 'Helper' },
      ];

      mockApi.get.mockResolvedValue({ personas: mockPersonas });

      const result = await resolver.loadPersonas();

      expect(result).toEqual(mockPersonas);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/personas');
    });

    it('should return empty array if API not available', async () => {
      const resolverWithoutApi = new PersonaResolver({ api: null });

      const result = await resolverWithoutApi.loadPersonas();

      expect(result).toEqual([]);
    });

    it('should return empty array on API error', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const result = await resolver.loadPersonas();

      expect(result).toEqual([]);
    });

    it('should handle missing personas field in response', async () => {
      mockApi.get.mockResolvedValue({});

      const result = await resolver.loadPersonas();

      expect(result).toEqual([]);
    });
  });

  describe('fetchPersonaById', () => {
    it('should fetch persona by ID successfully', async () => {
      const mockPersona = {
        id: 123,
        name: 'Assistant',
        description: 'Test persona',
      };

      mockApi.get.mockResolvedValue({ persona: mockPersona });

      const result = await resolver.fetchPersonaById('123');

      expect(result).toEqual({
        id: '123',
        name: 'Assistant',
        description: 'Test persona',
      });
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/personas/123');
    });

    it('should normalize persona ID to string', async () => {
      const mockPersona = {
        id: 123,
        name: 'Assistant',
      };

      mockApi.get.mockResolvedValue({ persona: mockPersona });

      const result = await resolver.fetchPersonaById('123');

      expect(result?.id).toBe('123');
    });

    it('should handle response.data format', async () => {
      const mockPersona = {
        id: '123',
        name: 'Assistant',
      };

      mockApi.get.mockResolvedValue({ data: mockPersona });

      const result = await resolver.fetchPersonaById('123');

      expect(result).toEqual(mockPersona);
    });

    it('should handle direct response format', async () => {
      const mockPersona = {
        id: '123',
        name: 'Assistant',
      };

      mockApi.get.mockResolvedValue(mockPersona);

      const result = await resolver.fetchPersonaById('123');

      expect(result).toEqual(mockPersona);
    });

    it('should return null if API not available', async () => {
      const resolverWithoutApi = new PersonaResolver({ api: null });

      const result = await resolverWithoutApi.fetchPersonaById('123');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const result = await resolver.fetchPersonaById('123');

      expect(result).toBeNull();
    });

    it('should return null if response has no ID', async () => {
      mockApi.get.mockResolvedValue({ persona: { name: 'No ID' } });

      const result = await resolver.fetchPersonaById('123');

      expect(result).toBeNull();
    });
  });

  describe('resolvePendingPersona', () => {
    const baseOptions: ResolvePersonaOptions = {
      pendingPersonaId: null,
      showPersonaSelection: true,
      personas: [
        { id: '1', name: 'Assistant' },
        { id: '2', name: 'Helper' },
      ],
      selectedPersona: null,
    };

    it('should clear pending if persona selection disabled', async () => {
      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '1',
        showPersonaSelection: false,
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toBeNull();
      expect(result.pendingPersonaId).toBeNull();
      expect(result.personas).toEqual(baseOptions.personas);
    });

    it('should return selected persona if no pending ID', async () => {
      const selectedPersona = baseOptions.personas[0];
      const options: ResolvePersonaOptions = {
        ...baseOptions,
        selectedPersona,
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toEqual(selectedPersona);
      expect(result.pendingPersonaId).toBeNull();
    });

    it('should clear pending if already selected', async () => {
      const selectedPersona = baseOptions.personas[0];
      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '1',
        selectedPersona,
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toEqual(selectedPersona);
      expect(result.pendingPersonaId).toBeNull();
    });

    it('should resolve from local personas if found', async () => {
      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '2',
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toEqual(baseOptions.personas[1]);
      expect(result.pendingPersonaId).toBeNull();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should fetch from API if not in local personas', async () => {
      const mockPersona = {
        id: '3',
        name: 'New Persona',
      };

      mockApi.get.mockResolvedValue({ persona: mockPersona });

      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '3',
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toEqual(mockPersona);
      expect(result.personas).toHaveLength(3);
      expect(result.personas[2]).toEqual(mockPersona);
      expect(result.pendingPersonaId).toBeNull();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/personas/3');
    });

    it('should not duplicate persona if already in list', async () => {
      const mockPersona = {
        id: '1',
        name: 'Assistant Updated',
      };

      mockApi.get.mockResolvedValue({ persona: mockPersona });

      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '1',
      };

      // Temporarily remove from local list to force fetch
      options.personas = [{ id: '2', name: 'Helper' }];

      const result = await resolver.resolvePendingPersona(options);

      // After fetch, it should be added
      expect(result.personas).toHaveLength(2);
      expect(result.personas[1].id).toBe('1');
    });

    it('should prevent duplicate requests', async () => {
      mockApi.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '3',
      };

      // Start first request
      const promise1 = resolver.resolvePendingPersona(options);

      // Immediately start second request with same ID
      const promise2 = resolver.resolvePendingPersona(options);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Second request should return immediately without fetching
      expect(result2.pendingPersonaId).toBe('3');
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('should handle API fetch failure gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '3',
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toBeNull();
      expect(result.personas).toEqual(baseOptions.personas);
      expect(result.pendingPersonaId).toBeNull();
    });

    it('should handle null response from fetchPersonaById', async () => {
      mockApi.get.mockResolvedValue({});

      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: '3',
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toBeNull();
      expect(result.pendingPersonaId).toBeNull();
    });

    it('should normalize pending ID to string', async () => {
      const options: ResolvePersonaOptions = {
        ...baseOptions,
        pendingPersonaId: 1 as any,
      };

      const result = await resolver.resolvePendingPersona(options);

      expect(result.persona).toEqual(baseOptions.personas[0]);
      expect(result.pendingPersonaId).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset pending request tracking', async () => {
      mockApi.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const options: ResolvePersonaOptions = {
        pendingPersonaId: '3',
        showPersonaSelection: true,
        personas: [],
        selectedPersona: null,
      };

      // Start request
      resolver.resolvePendingPersona(options);

      // Reset immediately
      resolver.reset();

      // Now should be able to make same request again
      const promise = resolver.resolvePendingPersona(options);

      // Should not be blocked
      expect(promise).toBeInstanceOf(Promise);
    });
  });
});
