import type { PersonaInfo } from '../../types';

/**
 * Options for getting greeting
 */
export interface GetGreetingOptions {
  showPersonaSelection: boolean;
  selectedPersona: PersonaInfo | null;
  defaultGreeting?: string;
}

/**
 * Options for checking persona greeting usage
 */
export interface ShouldUsePersonaGreetingOptions {
  showPersonaSelection: boolean;
  selectedPersona: PersonaInfo | null;
}

/**
 * Options for getting effective persona
 */
export interface GetEffectivePersonaOptions {
  showPersonaSelection: boolean;
  selectedPersona: PersonaInfo | null;
}

/**
 * GreetingService consolidates greeting logic across the application.
 *
 * Responsibilities:
 * - Determine which greeting to use (persona vs default)
 * - Check if persona greeting should be used
 * - Get effective persona (respects persona selection toggle)
 *
 * This service eliminates duplicate greeting logic that appeared 7+ times
 * across CollectionChatViewShell and ConversationManager.
 */
export class GreetingService {
  /**
   * Get the appropriate greeting based on persona selection state.
   *
   * Priority:
   * 1. Persona greeting (if persona selection enabled AND persona selected AND has sample_greeting)
   * 2. Default greeting (if provided)
   * 3. undefined (if no greetings available)
   *
   * @param options - Greeting options
   * @returns The greeting to use, or undefined if none available
   */
  static getGreeting(options: GetGreetingOptions): string | undefined {
    const { showPersonaSelection, selectedPersona, defaultGreeting } = options;

    // Try to use persona greeting first
    const personaGreeting = showPersonaSelection && selectedPersona?.sample_greeting;

    // Fall back to default greeting
    return personaGreeting || defaultGreeting;
  }

  /**
   * Check if persona greeting should be used.
   *
   * @param options - Options for checking
   * @returns true if persona greeting should be used
   */
  static shouldUsePersonaGreeting(options: ShouldUsePersonaGreetingOptions): boolean {
    const { showPersonaSelection, selectedPersona } = options;
    return Boolean(showPersonaSelection && selectedPersona?.sample_greeting);
  }

  /**
   * Get the effective persona (null if persona selection disabled).
   *
   * This is useful when you need to ensure persona is null when
   * persona selection is disabled, even if a persona is technically selected.
   *
   * @param options - Options for getting effective persona
   * @returns The effective persona or null
   */
  static getEffectivePersona(options: GetEffectivePersonaOptions): PersonaInfo | null {
    const { showPersonaSelection, selectedPersona } = options;
    return showPersonaSelection ? selectedPersona : null;
  }
}
