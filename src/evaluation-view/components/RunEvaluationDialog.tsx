import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ModelInfo, PersonaInfo } from '../../components/chat-header/types';
import type { Collection } from '../../braindrive-plugin/pluginTypes';


class Dialog extends React.Component<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}> {
  handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && this.props.onOpenChange) {
      this.props.onOpenChange(false);
    }
  };

  isDarkMode = (): boolean => {
    // Check if dark class exists on any parent element
    return document.querySelector('.dark') !== null;
  };

  render() {
    if (!this.props.open) return null;

    const isDark = this.isDarkMode();

    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'dark' : ''}`}
        onKeyDown={this.handleKeyDown}
      >
        {this.props.children}
      </div>
    );
  }
}

class DialogContent extends React.Component<{
  className?: string;
  onClose?: () => void;
  children: React.ReactNode;
}> {
  handleBackdropClick = (e: React.MouseEvent) => {
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  isDarkMode = (): boolean => {
    return document.querySelector('.dark') !== null;
  };

  render() {
    const { className = '', children } = this.props;
    const isDark = this.isDarkMode();

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={this.handleBackdropClick}
        />

        {/* Content */}
        <div
          className={`relative rounded-lg shadow-lg p-6 w-full max-w-3xl ${className}`}
          style={{
            backgroundColor: isDark ? '#111827' : '#ffffff',
            color: isDark ? '#f3f4f6' : '#111827'
          }}
          onClick={this.handleContentClick}
        >
          {children}
        </div>
      </>
    );
  }
}

class DialogHeader extends React.Component<{ children: React.ReactNode }> {
  render() {
    return (
      <div className="mb-4">
        {this.props.children}
      </div>
    );
  }
}

class DialogTitle extends React.Component<{ children: React.ReactNode }> {
  isDarkMode = (): boolean => {
    return document.querySelector('.dark') !== null;
  };

  render() {
    const isDark = this.isDarkMode();
    return (
      <h2
        className="text-xl font-semibold mb-2"
        style={{ color: isDark ? '#f3f4f6' : '#111827' }}
      >
        {this.props.children}
      </h2>
    );
  }
}

class DialogDescription extends React.Component<{ children: React.ReactNode }> {
  isDarkMode = (): boolean => {
    return document.querySelector('.dark') !== null;
  };

  render() {
    const isDark = this.isDarkMode();
    return (
      <p
        className="text-sm"
        style={{ color: isDark ? '#9ca3af' : '#4b5563' }}
      >
        {this.props.children}
      </p>
    );
  }
}

class DialogFooter extends React.Component<{ children: React.ReactNode }> {
  isDarkMode = (): boolean => {
    return document.querySelector('.dark') !== null;
  };

  render() {
    const isDark = this.isDarkMode();
    return (
      <div
        className="flex justify-end gap-3 mt-6 pt-4 border-t"
        style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}
      >
        {this.props.children}
      </div>
    );
  }
}

interface RunEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    model: ModelInfo,
    persona: PersonaInfo | null,
    collectionId: string,
    questions: string[]
  ) => void;
  availableModels: ModelInfo[];
  availablePersonas: PersonaInfo[];
  collections: Collection[];
  isLoadingModels: boolean;
  isLoadingPersonas: boolean;
}

interface RunEvaluationDialogState {
  selectedModelKey: string;
  selectedPersonaId: string;
  selectedCollectionId: string;
  questions: string;
  modelSearchQuery: string;
  personaSearchQuery: string;
  collectionSearchQuery: string;
  validationErrors: {
    questions?: string;
  };
}

export class RunEvaluationDialog extends React.Component<
  RunEvaluationDialogProps,
  RunEvaluationDialogState
> {
  constructor(props: RunEvaluationDialogProps) {
    super(props);
    this.state = {
      selectedModelKey: '',
      selectedPersonaId: 'none',
      selectedCollectionId: '',
      questions: '',
      modelSearchQuery: '',
      personaSearchQuery: '',
      collectionSearchQuery: '',
      validationErrors: {},
    };
  }

  componentDidUpdate(prevProps: RunEvaluationDialogProps) {
    // Auto-select first model when models load
    if (
      prevProps.availableModels.length === 0 &&
      this.props.availableModels.length > 0 &&
      !this.state.selectedModelKey
    ) {
      const firstModel = this.props.availableModels[0];
      this.setState({
        selectedModelKey: this.getModelKey(firstModel),
      });
    }
  }

  getModelKey = (model: ModelInfo): string => {
    return `${model.provider}-${model.serverId}-${model.name}`;
  };

  validateQuestions = (text: string): { valid: boolean; questions: string[]; error?: string } => {
    const lines = text.split('\n').map(q => q.trim()).filter(q => q.length > 0);

    if (lines.length < 1) {
      return { valid: false, questions: [], error: 'At least 1 question is required' };
    }

    if (lines.length > 100) {
      return { valid: false, questions: [], error: 'Maximum 100 questions allowed' };
    }

    return { valid: true, questions: lines, error: undefined };
  };

  handleSubmit = () => {
    const { availableModels, availablePersonas, onSubmit } = this.props;
    const { selectedModelKey, selectedPersonaId, selectedCollectionId, questions } = this.state;

    const selectedModel = availableModels.find(
      (m) => this.getModelKey(m) === selectedModelKey
    );

    if (!selectedModel) {
      return;
    }

    // Collection is required
    if (!selectedCollectionId) {
      this.setState({
        validationErrors: { questions: 'Collection is required' },
      });
      return;
    }

    // Questions are required
    const validation = this.validateQuestions(questions);
    if (!validation.valid) {
      this.setState({
        validationErrors: { questions: validation.error },
      });
      return;
    }

    const selectedPersona = selectedPersonaId && selectedPersonaId !== 'none'
      ? availablePersonas.find((p) => p.id === selectedPersonaId) || null
      : null;

    // Submit with collection and questions
    onSubmit(selectedModel, selectedPersona, selectedCollectionId, validation.questions);
  };

  handleModelChange = (value: string) => {
    this.setState({ selectedModelKey: value });
  };

  handlePersonaChange = (value: string) => {
    this.setState({ selectedPersonaId: value === 'none' ? '' : value });
  };

  handleCollectionChange = (value: string) => {
    this.setState({
      selectedCollectionId: value,
      validationErrors: {},
    });
  };

  handleQuestionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({
      questions: e.target.value,
      validationErrors: {},
    });
  };

  handleModelSearchChange = (query: string) => {
    this.setState({ modelSearchQuery: query });
  };

  handlePersonaSearchChange = (query: string) => {
    this.setState({ personaSearchQuery: query });
  };

  handleCollectionSearchChange = (query: string) => {
    this.setState({ collectionSearchQuery: query });
  };

  getFilteredModels = (): ModelInfo[] => {
    const { availableModels } = this.props;
    const { modelSearchQuery } = this.state;

    if (!modelSearchQuery.trim()) {
      return availableModels;
    }

    const query = modelSearchQuery.toLowerCase();
    return availableModels.filter((model) => {
      const modelName = model.name.toLowerCase();
      const serverName = model.serverName.toLowerCase();
      return modelName.includes(query) || serverName.includes(query);
    });
  };

  getFilteredPersonas = (): PersonaInfo[] => {
    const { availablePersonas } = this.props;
    const { personaSearchQuery } = this.state;

    if (!personaSearchQuery.trim()) {
      return availablePersonas;
    }

    const query = personaSearchQuery.toLowerCase();
    return availablePersonas.filter((persona) => {
      const personaName = persona.name.toLowerCase();
      return personaName.includes(query);
    });
  };

  getFilteredCollections = (): Collection[] => {
    const { collections } = this.props;
    const { collectionSearchQuery } = this.state;

    if (!collectionSearchQuery.trim()) {
      return collections;
    }

    const query = collectionSearchQuery.toLowerCase();
    return collections.filter((collection) => {
      const collectionName = collection.name.toLowerCase();
      const collectionDesc = (collection.description || '').toLowerCase();
      return collectionName.includes(query) || collectionDesc.includes(query);
    });
  };

  isDarkMode = (): boolean => {
    return document.querySelector('.dark') !== null;
  };

  render() {
    const {
      isOpen,
      onClose,
      availableModels,
      availablePersonas,
      collections,
      isLoadingModels,
      isLoadingPersonas,
    } = this.props;
    const {
      selectedModelKey,
      selectedPersonaId,
      selectedCollectionId,
      questions,
      modelSearchQuery,
      personaSearchQuery,
      collectionSearchQuery,
      validationErrors,
    } = this.state;

    const filteredModels = this.getFilteredModels();
    const filteredPersonas = this.getFilteredPersonas();
    const filteredCollections = this.getFilteredCollections();
    const canSubmit = selectedModelKey && selectedCollectionId && questions.trim() && !isLoadingModels;
    const isDark = this.isDarkMode();

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] flex flex-col" onClose={onClose}>
          <DialogHeader>
            <DialogTitle>Run New Evaluation - Test</DialogTitle>
            <DialogDescription>
              Select a model, optional persona, collection, and provide custom questions to evaluate.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 overflow-y-auto flex-1">
            {/* Model, Persona, and Collection Selection - Single Row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Model Selection */}
              <div className="grid gap-2">
                <label
                  htmlFor="model-select"
                  className="text-sm font-medium"
                  style={{ color: isDark ? '#f3f4f6' : '#111827' }}
                >
                  LLM Model <span className="text-red-500">*</span>
                </label>
                {isLoadingModels ? (
                  <div
                    className="text-sm"
                    style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                  >
                    Loading...
                  </div>
                ) : (
                  <Select
                    value={selectedModelKey}
                    onValueChange={this.handleModelChange}
                    disabled={availableModels.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          availableModels.length === 0 ? 'No models' : 'Select model'
                        }
                      >
                        {selectedModelKey && (() => {
                          const selectedModel = availableModels.find(m => this.getModelKey(m) === selectedModelKey);
                          return selectedModel ? `${selectedModel.name}` : selectedModelKey;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      searchable={availableModels.length > 1}
                      searchPlaceholder="Search models..."
                      onSearchChange={this.handleModelSearchChange}
                    >
                      {filteredModels.length === 0 ? (
                        <div
                          className="px-2 py-1.5 text-sm text-center"
                          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        >
                          No models found
                        </div>
                      ) : (
                        filteredModels.map((model) => {
                          const key = this.getModelKey(model);
                          return (
                            <SelectItem key={key} value={key}>
                              {model.name} ({model.serverName})
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Persona Selection */}
              <div className="grid gap-2">
                <label
                  htmlFor="persona-select"
                  className="text-sm font-medium"
                  style={{ color: isDark ? '#f3f4f6' : '#111827' }}
                >
                  Persona{' '}
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    (Optional)
                  </span>
                </label>
                {isLoadingPersonas ? (
                  <div
                    className="text-sm"
                    style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                  >
                    Loading...
                  </div>
                ) : (
                  <Select
                    value={selectedPersonaId || 'none'}
                    onValueChange={this.handlePersonaChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None">
                        {(() => {
                          const value = selectedPersonaId || 'none';
                          if (value === 'none') return 'None';
                          const selectedPersona = availablePersonas.find(p => p.id === value);
                          return selectedPersona ? selectedPersona.name : value;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      searchable={availablePersonas.length > 1}
                      searchPlaceholder="Search personas..."
                      onSearchChange={this.handlePersonaSearchChange}
                    >
                      <SelectItem value="none">None</SelectItem>
                      {filteredPersonas.length === 0 ? (
                        <div
                          className="px-2 py-1.5 text-sm text-center"
                          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                        >
                          No personas found
                        </div>
                      ) : (
                        filteredPersonas.map((persona) => (
                          <SelectItem key={persona.id} value={persona.id}>
                            {persona.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Collection Selection */}
              <div className="grid gap-2">
                <label
                  htmlFor="collection-select"
                  className="text-sm font-medium"
                  style={{ color: isDark ? '#f3f4f6' : '#111827' }}
                >
                  Collection <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedCollectionId}
                  onValueChange={this.handleCollectionChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select collection">
                      {selectedCollectionId && (() => {
                        const selectedCollection = collections.find(c => c.id === selectedCollectionId);
                        return selectedCollection ? selectedCollection.name : selectedCollectionId;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    searchable={collections.length > 1}
                    searchPlaceholder="Search collections..."
                    onSearchChange={this.handleCollectionSearchChange}
                  >
                    {filteredCollections.length === 0 ? (
                      <div
                        className="px-2 py-1.5 text-sm text-center"
                        style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                      >
                        No collections found
                      </div>
                    ) : (
                      filteredCollections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Questions Textarea */}
            <div className="grid gap-2">
              <label
                htmlFor="questions-input"
                className="text-sm font-medium"
                style={{ color: isDark ? '#f3f4f6' : '#111827' }}
              >
                Custom Questions <span className="text-red-500">*</span>{' '}
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  (1-100, one per line)
                </span>
              </label>
              <Textarea
                id="questions-input"
                value={questions}
                onChange={this.handleQuestionsChange}
                placeholder={`Enter questions, one per line...

Example:
What is BrainDrive?
How do I upload documents?
What file types are supported?`}
                rows={6}
                className="resize-none"
              />
              {validationErrors.questions && (
                <p className="text-sm text-red-500">{validationErrors.questions}</p>
              )}
              {questions.trim() && (
                <p
                  className="text-xs"
                  style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
                >
                  {questions.split('\n').filter((q) => q.trim()).length} questions
                </p>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div
            className="flex items-start gap-3 p-3 rounded-md mt-4"
            style={{
              backgroundColor: isDark ? '#1e3a5f' : '#eff6ff',
              border: `1px solid ${isDark ? '#1e40af' : '#93c5fd'}`,
            }}
          >
            <Info
              className="flex-shrink-0 mt-0.5"
              size={18}
              style={{ color: isDark ? '#60a5fa' : '#3b82f6' }}
            />
            <div className="flex-1">
              <p
                className="text-sm"
                style={{ color: isDark ? '#e0e7ff' : '#1e3a8a' }}
              >
                <strong>Note:</strong> Keep this page open to complete the evaluation.
                You can leave and resume later from where you left off.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={this.handleSubmit} disabled={!canSubmit}>
              Start Evaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
