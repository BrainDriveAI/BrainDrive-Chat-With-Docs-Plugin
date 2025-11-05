import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
      validationErrors,
    } = this.state;

    const canSubmit = selectedModelKey && selectedCollectionId && questions.trim() && !isLoadingModels;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run New Evaluation</DialogTitle>
            <DialogDescription>
              Select a model, optional persona, collection, and provide custom questions to evaluate.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Model Selection */}
            <div className="grid gap-2">
              <label htmlFor="model-select" className="text-sm font-medium">
                LLM Model <span className="text-red-500">*</span>
              </label>
              {isLoadingModels ? (
                <div className="text-sm text-muted-foreground">Loading models...</div>
              ) : (
                <Select
                  value={selectedModelKey}
                  onValueChange={this.handleModelChange}
                  disabled={availableModels.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        availableModels.length === 0 ? 'No models available' : 'Select a model'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => {
                      const key = this.getModelKey(model);
                      return (
                        <SelectItem key={key} value={key}>
                          {model.name} ({model.serverName})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Persona Selection */}
            <div className="grid gap-2">
              <label htmlFor="persona-select" className="text-sm font-medium">
                Persona <span className="text-muted-foreground">(Optional)</span>
              </label>
              {isLoadingPersonas ? (
                <div className="text-sm text-muted-foreground">Loading personas...</div>
              ) : (
                <Select
                  value={selectedPersonaId || 'none'}
                  onValueChange={this.handlePersonaChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No persona (Default)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No persona (Default)</SelectItem>
                    {availablePersonas.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Collection Selection */}
            <div className="grid gap-2">
              <label htmlFor="collection-select" className="text-sm font-medium">
                Collection <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedCollectionId}
                onValueChange={this.handleCollectionChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Questions Textarea */}
            <div className="grid gap-2">
              <label htmlFor="questions-input" className="text-sm font-medium">
                Custom Questions <span className="text-red-500">*</span>{' '}
                <span className="text-muted-foreground">(1-100, one per line)</span>
              </label>
              <Textarea
                id="questions-input"
                value={questions}
                onChange={this.handleQuestionsChange}
                placeholder="Enter questions, one per line...\n\nExample:\nWhat is BrainDrive?\nHow do I upload documents?\nWhat file types are supported?"
                rows={6}
                className="resize-none"
              />
              {validationErrors.questions && (
                <p className="text-sm text-red-500">{validationErrors.questions}</p>
              )}
              {questions.trim() && (
                <p className="text-xs text-muted-foreground">
                  {questions.split('\n').filter((q) => q.trim()).length} questions
                </p>
              )}
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
