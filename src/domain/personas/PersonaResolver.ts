/**
 * Persona information
 */
export interface PersonaInfo {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

/**
 * Result of resolving a pending persona
 */
export interface ResolvePersonaResult {
  persona: PersonaInfo | null;
  personas: PersonaInfo[];
  pendingPersonaId: string | null;
}

/**
 * Options for resolving pending persona
 */
export interface ResolvePersonaOptions {
  pendingPersonaId: string | null;
  showPersonaSelection: boolean;
  personas: PersonaInfo[];
  selectedPersona: PersonaInfo | null;
}

/**
 * Dependencies for PersonaResolver
 */
export interface PersonaResolverDeps {
  api: any;
}

/**
 * PersonaResolver handles persona loading and resolution.
 *
 * Responsibilities:
 * - Load personas from API
 * - Resolve pending persona IDs to PersonaInfo objects
 * - Fetch individual personas by ID
 * - Manage persona deduplication
 * - Track pending requests to avoid duplicates
 */
export class PersonaResolver {
  private pendingPersonaRequestId: string | null = null;

  constructor(private deps: PersonaResolverDeps) {}

  /**
   * Load all personas from API.
   * If availablePersonas are provided, use those instead.
   */
  async loadPersonas(availablePersonas?: PersonaInfo[]): Promise<PersonaInfo[]> {
    console.log(`🎭 Loading personas - availablePersonas: ${availablePersonas?.length || 0}`);

    // Use provided personas if available
    if (availablePersonas) {
      console.log(`🎭 Using provided personas: ${availablePersonas.map(p => p.name).join(', ')}`);
      return availablePersonas;
    }

    // Load from API
    if (!this.deps.api) {
      console.warn('API service not available for loading personas');
      return [];
    }

    try {
      const response: any = await this.deps.api.get('/api/v1/personas');
      const personas = response.personas || [];
      console.log(`🎭 Loaded personas from API: ${personas.map((p: any) => p.name).join(', ')}`);
      return personas;
    } catch (error) {
      console.error('Error loading personas:', error);
      return [];
    }
  }

  /**
   * Fetch a single persona by ID from API.
   */
  async fetchPersonaById(personaId: string): Promise<PersonaInfo | null> {
    if (!this.deps.api) {
      return null;
    }

    try {
      const response: any = await this.deps.api.get(`/api/v1/personas/${personaId}`);
      const personaCandidate: any = response?.persona || response?.data || response;
      if (personaCandidate && personaCandidate.id) {
        return {
          ...personaCandidate,
          id: `${personaCandidate.id}`
        } as PersonaInfo;
      }
    } catch (error) {
      console.error('Error fetching persona by id:', error);
    }

    return null;
  }

  /**
   * Resolve a pending persona ID to a PersonaInfo object.
   * Fetches from API if not found in local personas list.
   * Returns updated persona list and selected persona.
   */
  async resolvePendingPersona(
    options: ResolvePersonaOptions
  ): Promise<ResolvePersonaResult> {
    const { pendingPersonaId, showPersonaSelection, personas, selectedPersona } = options;

    // If persona selection is disabled, clear pending
    if (!showPersonaSelection) {
      return {
        persona: null,
        personas,
        pendingPersonaId: null,
      };
    }

    // No pending ID to resolve
    if (!pendingPersonaId) {
      return {
        persona: selectedPersona,
        personas,
        pendingPersonaId: null,
      };
    }

    const normalizedPendingId = `${pendingPersonaId}`;

    // Already selected
    if (selectedPersona && `${selectedPersona.id}` === normalizedPendingId) {
      return {
        persona: selectedPersona,
        personas,
        pendingPersonaId: null,
      };
    }

    // Check if persona exists in local list
    const existingPersona = personas.find(
      persona => `${persona.id}` === normalizedPendingId
    );
    if (existingPersona) {
      return {
        persona: existingPersona,
        personas,
        pendingPersonaId: null,
      };
    }

    // Prevent duplicate requests
    if (this.pendingPersonaRequestId === normalizedPendingId) {
      return {
        persona: selectedPersona,
        personas,
        pendingPersonaId,
      };
    }

    // Fetch from API
    this.pendingPersonaRequestId = normalizedPendingId;

    try {
      const persona = await this.fetchPersonaById(normalizedPendingId);

      if (!persona) {
        return {
          persona: selectedPersona,
          personas,
          pendingPersonaId: null,
        };
      }

      const personaId = `${persona.id}`;

      // Add to personas list if not already present
      const alreadyExists = personas.some(p => `${p.id}` === personaId);
      const updatedPersonas = alreadyExists
        ? personas
        : [...personas, { ...persona, id: personaId }];

      const resolvedPersona = updatedPersonas.find(p => `${p.id}` === personaId) || null;

      return {
        persona: resolvedPersona,
        personas: updatedPersonas,
        pendingPersonaId: null,
      };
    } catch (error) {
      console.error('Error resolving pending persona:', error);
      return {
        persona: selectedPersona,
        personas,
        pendingPersonaId: null,
      };
    } finally {
      this.pendingPersonaRequestId = null;
    }
  }

  /**
   * Reset pending request tracking
   */
  reset(): void {
    this.pendingPersonaRequestId = null;
  }
}
