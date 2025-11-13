/**
 * @jest-environment jsdom
 */

import { GreetingService } from '../GreetingService';
import type { PersonaInfo } from '../../../types';

describe('GreetingService', () => {
  const mockPersona: PersonaInfo = {
    id: 'persona-1',
    name: 'Test Persona',
    system_prompt: 'You are a test assistant',
    sample_greeting: 'Hello from test persona!'
  };

  describe('getGreeting', () => {
    it('should return default greeting when persona selection disabled', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: false,
        selectedPersona: mockPersona,
        defaultGreeting: 'Welcome to chat!'
      });

      expect(greeting).toBe('Welcome to chat!');
    });

    it('should return default greeting when persona selection enabled but no persona selected', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: true,
        selectedPersona: null,
        defaultGreeting: 'Welcome to chat!'
      });

      expect(greeting).toBe('Welcome to chat!');
    });

    it('should return persona greeting when enabled and persona selected', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: true,
        selectedPersona: mockPersona,
        defaultGreeting: 'Welcome to chat!'
      });

      expect(greeting).toBe('Hello from test persona!');
    });

    it('should return persona greeting over default when both available', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: true,
        selectedPersona: mockPersona,
        defaultGreeting: 'Default greeting'
      });

      expect(greeting).toBe('Hello from test persona!');
    });

    it('should return default greeting when persona has no sample_greeting', () => {
      const personaWithoutGreeting: PersonaInfo = {
        id: 'persona-2',
        name: 'Silent Persona',
        system_prompt: 'You are silent'
      };

      const greeting = GreetingService.getGreeting({
        showPersonaSelection: true,
        selectedPersona: personaWithoutGreeting,
        defaultGreeting: 'Welcome!'
      });

      expect(greeting).toBe('Welcome!');
    });

    it('should return undefined when no greetings available', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: false,
        selectedPersona: null
      });

      expect(greeting).toBeUndefined();
    });

    it('should handle empty string default greeting', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: false,
        selectedPersona: null,
        defaultGreeting: ''
      });

      expect(greeting).toBe('');
    });

    it('should prefer persona greeting even if persona selection just enabled', () => {
      const greeting = GreetingService.getGreeting({
        showPersonaSelection: true,
        selectedPersona: mockPersona,
        defaultGreeting: 'Default'
      });

      expect(greeting).toBe('Hello from test persona!');
    });
  });

  describe('shouldUsePersonaGreeting', () => {
    it('should return true when conditions met', () => {
      const shouldUse = GreetingService.shouldUsePersonaGreeting({
        showPersonaSelection: true,
        selectedPersona: mockPersona
      });

      expect(shouldUse).toBe(true);
    });

    it('should return false when persona selection disabled', () => {
      const shouldUse = GreetingService.shouldUsePersonaGreeting({
        showPersonaSelection: false,
        selectedPersona: mockPersona
      });

      expect(shouldUse).toBe(false);
    });

    it('should return false when no persona selected', () => {
      const shouldUse = GreetingService.shouldUsePersonaGreeting({
        showPersonaSelection: true,
        selectedPersona: null
      });

      expect(shouldUse).toBe(false);
    });

    it('should return false when persona has no greeting', () => {
      const personaWithoutGreeting: PersonaInfo = {
        id: 'persona-2',
        name: 'Silent Persona',
        system_prompt: 'You are silent'
      };

      const shouldUse = GreetingService.shouldUsePersonaGreeting({
        showPersonaSelection: true,
        selectedPersona: personaWithoutGreeting
      });

      expect(shouldUse).toBe(false);
    });
  });

  describe('getEffectivePersona', () => {
    it('should return persona when selection enabled', () => {
      const effective = GreetingService.getEffectivePersona({
        showPersonaSelection: true,
        selectedPersona: mockPersona
      });

      expect(effective).toBe(mockPersona);
    });

    it('should return null when selection disabled', () => {
      const effective = GreetingService.getEffectivePersona({
        showPersonaSelection: false,
        selectedPersona: mockPersona
      });

      expect(effective).toBe(null);
    });

    it('should return null when no persona selected', () => {
      const effective = GreetingService.getEffectivePersona({
        showPersonaSelection: true,
        selectedPersona: null
      });

      expect(effective).toBe(null);
    });
  });
});
