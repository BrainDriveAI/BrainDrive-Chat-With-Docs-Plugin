import React from 'react';
import { Loader2, AlertCircle, Save, XCircle, Info, EyeOff, Eye, RotateCcw, X } from 'lucide-react';
import type { Services, ModelInfo } from '../../types';
import { BRAINDRIVE_CORE_API, DEFAULT_PLUGIN_SETTINGS as CHAT_SETTINGS} from '../../constants';
import { ActionButton } from './ActionButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface FieldDependency {
    field: string;
    value: any;
}

interface BaseFieldConfig {
    label: string;
    description: string;
    section: string;
    required?: boolean;
    dependsOn?: FieldDependency;
}

interface TextFieldConfig extends BaseFieldConfig {
    type: 'text' | 'url';
    placeholder?: string;
}

interface PasswordFieldConfig extends BaseFieldConfig {
    type: 'password';
    placeholder?: string;
}

interface SelectFieldConfig extends BaseFieldConfig {
    type: 'select';
    options: string[];
    placeholder?: string;
}

interface ModelSelectFieldConfig extends BaseFieldConfig {
    type: 'model-select';
    placeholder?: string;
}

interface NumberFieldConfig extends BaseFieldConfig {
    type: 'number';
    min?: number;
    max?: number;
    placeholder?: string;
}

interface CheckboxFieldConfig extends BaseFieldConfig {
    type: 'checkbox';
}

type FieldConfig = TextFieldConfig | PasswordFieldConfig | SelectFieldConfig | ModelSelectFieldConfig | NumberFieldConfig | CheckboxFieldConfig;

interface ChatCollectionsSettingsProps {
    services: Services;
    availableModels: ModelInfo[];
    onBack?: () => void;
}

interface ChatSettingsValue {
    LLM_PROVIDER: string;
    EMBEDDING_PROVIDER: string;
    ENABLE_CONTEXTUAL_RETRIEVAL: boolean;
    OLLAMA_CONTEXTUAL_LLM_BASE_URL: string;
    OLLAMA_CONTEXTUAL_LLM_MODEL: string;
    OLLAMA_LLM_BASE_URL: string;
    OLLAMA_LLM_MODEL: string;
    OLLAMA_EMBEDDING_BASE_URL: string;
    OLLAMA_EMBEDDING_MODEL: string;
    EVALUATION_PROVIDER: string;
    OPENAI_EVALUATION_API_KEY: string;
    OPENAI_EVALUATION_MODEL: string;
    // OpenRouter fields - commented out for now
    // OPENROUTER_EVALUATION_API_KEY: string;
    // OPENROUTER_EVALUATION_MODEL: string;
}

interface ChatCollectionsSettingsState {
    settings: ChatSettingsValue;
    isLoading: boolean;
    isSaving: boolean;
    isRestarting: boolean;
    error: string | null;
    success: string | null;
    hasUnsavedChanges: boolean;
    showApiKey: boolean;
    fieldErrors: Record<string, string>;
    restartStatus: null | string;
    llmModelSearchQuery: string;
    embeddingModelSearchQuery: string;
    contextualModelSearchQuery: string;
}

export interface SettingsInstance {
    definition_id: string;
    name: string;
    value: Record<keyof ChatSettingsValue, string>;
    scope: "user" | string;
    user_id: string;
    page_id: string | null;
    id: string;
    created_at: string;
    updated_at: string;
}

export type SettingsInstances = SettingsInstance[];

// Field configuration with enhanced metadata
const FIELD_CONFIG: Record<keyof ChatSettingsValue, FieldConfig> = {
  LLM_PROVIDER: {
    label: 'Provider',
    description: 'Choose your Large Language Model provider',
    type: 'select',
    options: ['ollama'],
    section: 'llm',
    required: true,
    placeholder: 'Select LLM provider...'
  },
  OLLAMA_LLM_BASE_URL: {
    label: 'Base URL',
    description: 'Base URL for your Ollama server (e.g., http://localhost:11434)',
    type: 'url',
    section: 'llm',
    placeholder: 'http://localhost:11434',
    dependsOn: { field: 'LLM_PROVIDER', value: 'ollama' }
  },
  OLLAMA_LLM_MODEL: {
    label: 'Model',
    description: 'The Ollama model to use for chat',
    type: 'model-select',
    section: 'llm',
    placeholder: 'Select model...',
    dependsOn: { field: 'LLM_PROVIDER', value: 'ollama' }
  },
  EMBEDDING_PROVIDER: {
    label: 'Provider',
    description: 'Choose your embedding model provider',
    type: 'select',
    options: ['ollama'],
    section: 'embedding',
    required: true,
    placeholder: 'Select embedding provider...'
  },
  OLLAMA_EMBEDDING_BASE_URL: {
    label: 'Base URL',
    description: 'Base URL for Ollama embedding service',
    type: 'url',
    section: 'embedding',
    placeholder: 'http://localhost:11434',
    dependsOn: { field: 'EMBEDDING_PROVIDER', value: 'ollama' }
  },
  OLLAMA_EMBEDDING_MODEL: {
    label: 'Model',
    description: 'The Ollama model to use for embeddings',
    type: 'model-select',
    section: 'embedding',
    placeholder: 'Select model...',
    dependsOn: { field: 'EMBEDDING_PROVIDER', value: 'ollama' }
  },
  ENABLE_CONTEXTUAL_RETRIEVAL: {
    label: 'Enable Contextual Retrieval',
    description: 'Uses a separate smaller LLM to generate chunk context for better retrieval',
    type: 'checkbox',
    section: 'contextual'
  },
  OLLAMA_CONTEXTUAL_LLM_BASE_URL: {
    label: 'Base URL',
    description: 'Base URL for contextual retrieval Ollama service',
    type: 'url',
    section: 'contextual',
    placeholder: 'http://localhost:11434',
    dependsOn: { field: 'ENABLE_CONTEXTUAL_RETRIEVAL', value: true }
  },
  OLLAMA_CONTEXTUAL_LLM_MODEL: {
    label: 'Model',
    description: 'Smaller model for generating context',
    type: 'model-select',
    section: 'contextual',
    placeholder: 'Select model...',
    dependsOn: { field: 'ENABLE_CONTEXTUAL_RETRIEVAL', value: true }
  },
  EVALUATION_PROVIDER: {
    label: 'Provider',
    description: 'Choose your evaluation LLM provider',
    type: 'select',
    options: ['openai'], // 'openrouter' - commented out for now
    section: 'evaluation',
    required: true,
    placeholder: 'Select evaluation provider...'
  },
  OPENAI_EVALUATION_API_KEY: {
    label: 'API Key',
    description: 'Your OpenAI API key for evaluation judge service',
    type: 'password',
    section: 'evaluation',
    placeholder: 'sk-...',
    dependsOn: { field: 'EVALUATION_PROVIDER', value: 'openai' }
  },
  OPENAI_EVALUATION_MODEL: {
    label: 'Model',
    description: 'The OpenAI model to use as judge for evaluation',
    type: 'text',
    section: 'evaluation',
    placeholder: 'gpt-5-mini',
    dependsOn: { field: 'EVALUATION_PROVIDER', value: 'openai' }
  },
  // OpenRouter fields - commented out for now
  // OPENROUTER_EVALUATION_API_KEY: {
  //   label: 'API Key',
  //   description: 'Your OpenRouter API key for evaluation judge service',
  //   type: 'password',
  //   section: 'evaluation',
  //   placeholder: 'sk-or-...',
  //   dependsOn: { field: 'EVALUATION_PROVIDER', value: 'openrouter' }
  // },
  // OPENROUTER_EVALUATION_MODEL: {
  //   label: 'Model',
  //   description: 'The OpenRouter model to use as judge for evaluation',
  //   type: 'text',
  //   section: 'evaluation',
  //   placeholder: 'openai/gpt-4o-mini',
  //   dependsOn: { field: 'EVALUATION_PROVIDER', value: 'openrouter' }
  // }
};

const SECTIONS = {
    llm: { title: 'LLM Provider', icon: '🤖' },
    embedding: { title: 'Embedding Provider', icon: '📊' },
    contextual: { title: 'Contextual Retrieval', icon: '🔍' },
    evaluation: { title: 'Evaluation Settings', icon: '✅' }
};


export class ChatCollectionsSettings extends React.Component<ChatCollectionsSettingsProps, ChatCollectionsSettingsState> {
    private settingsUnsubscribe?: () => void;

    constructor(props: ChatCollectionsSettingsProps) {
        super(props);
        this.state = {
            settings: CHAT_SETTINGS.DEFAULT_VALUE,
            isLoading: false,
            isSaving: false,
            isRestarting: false,
            error: null,
            success: null,
            hasUnsavedChanges: false,
            showApiKey: false,
            fieldErrors: {},
            restartStatus: null,
            llmModelSearchQuery: '',
            embeddingModelSearchQuery: '',
            contextualModelSearchQuery: '',
        };
    }

    async componentDidMount() {
        await this.loadSettings();
    }

    componentWillUnmount() {
        if (this.settingsUnsubscribe) {
            this.settingsUnsubscribe();
        }
    }

    private validateField = (name: string, value: any): string | null => {
        const config = FIELD_CONFIG[name as keyof ChatSettingsValue];
        if (!config) return null;

        if (config.required && (!value || (typeof value === 'string' && !value.trim()))) {
            return `${config.label} is required`;
        }

        if (config.type === 'url' && value) {
            try {
                new URL(value);
            } catch {
                return 'Please enter a valid URL';
            }
        }

        if (config.type === 'number' && value !== undefined) {
            const num = Number(value);
            if (isNaN(num)) return 'Please enter a valid number';
            if ('min' in config && config.min !== undefined && num < config.min) {
                return `Minimum value is ${config.min}`;
            }
            if ('max' in config && config.max !== undefined && num > config.max) {
                return `Maximum value is ${config.max}`;
            }
        }

        return null;
    };

    private validateAllFields = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        Object.keys(this.state.settings).forEach((key) => {
            const error = this.validateField(key, this.state.settings[key as keyof ChatSettingsValue]);
            if (error) {
                errors[key] = error;
            }
        });
        return errors;
    };

    private shouldShowField = (fieldName: string): boolean => {
        const config = FIELD_CONFIG[fieldName as keyof ChatSettingsValue];
        if (!config?.dependsOn) return true;

        const { field, value } = config.dependsOn;
        return this.state.settings[field as keyof ChatSettingsValue] === value;
    };

    private getFilteredModels = (searchQuery: string): ModelInfo[] => {
        const { availableModels } = this.props;

        if (!searchQuery.trim()) {
            return availableModels;
        }

        const query = searchQuery.toLowerCase();
        return availableModels.filter((model) => {
            const modelName = model.name.toLowerCase();
            const serverName = model.serverName.toLowerCase();
            return modelName.includes(query) || serverName.includes(query);
        });
    };

    private handleModelSearchChange = (fieldName: string) => (query: string) => {
        if (fieldName === 'OLLAMA_LLM_MODEL') {
            this.setState({ llmModelSearchQuery: query });
        } else if (fieldName === 'OLLAMA_EMBEDDING_MODEL') {
            this.setState({ embeddingModelSearchQuery: query });
        } else if (fieldName === 'OLLAMA_CONTEXTUAL_LLM_MODEL') {
            this.setState({ contextualModelSearchQuery: query });
        }
    };

    private getModelSearchQuery = (fieldName: string): string => {
        if (fieldName === 'OLLAMA_LLM_MODEL') {
            return this.state.llmModelSearchQuery;
        } else if (fieldName === 'OLLAMA_EMBEDDING_MODEL') {
            return this.state.embeddingModelSearchQuery;
        } else if (fieldName === 'OLLAMA_CONTEXTUAL_LLM_MODEL') {
            return this.state.contextualModelSearchQuery;
        }
        return '';
    };

    private handleModelChange = (fieldName: string) => (value: string) => {
        this.setState(prevState => ({
            settings: {
                ...prevState.settings,
                [fieldName]: value,
            },
            hasUnsavedChanges: true,
        }));
    };

    private async loadSettings() {
        const { services } = this.props;
        this.setState({ isLoading: true, error: null });
        
        try {
            if (services.api?.get) {
                const params = {
                    definition_id: CHAT_SETTINGS.DEFINITION_ID,
                    user_id: 'current',
                    scope: 'user'
                };
                const queryString = new URLSearchParams(params).toString();
                const url = `${BRAINDRIVE_CORE_API}/api/v1/settings/instances?${queryString}`;
                // Pass the url directly without a separate 'params' object
                const response = await services.api.get<SettingsInstances | SettingsInstance>(url);
                let instanceValue: any = null;
                if (Array.isArray(response) && response.length > 0) {
                    // If it's an array, get the value from the first item
                    instanceValue = response[0].value;
                } else if (response && typeof response === 'object' && response !== null) {
                    // If it's a single object, get the value directly from it
                    instanceValue = (response as SettingsInstance).value;
                }

                if (instanceValue) {
                    // Ensure the value is an object if it was serialized as a string
                    if (typeof instanceValue === 'string') {
                        instanceValue = JSON.parse(instanceValue);
                    }
                    console.log(instanceValue);
                    this.setState({ settings: { ...CHAT_SETTINGS.DEFAULT_VALUE, ...instanceValue } });
                }
            } else if (services.settings?.getSetting) {
                const settingValue = await services.settings.getSetting(CHAT_SETTINGS.DEFINITION_ID);
                if (settingValue) {
                    this.setState({ settings: { ...CHAT_SETTINGS.DEFAULT_VALUE, ...settingValue } });
                }
            } else {
                this.setState({ error: 'No service available to load settings' });
            }
        } catch (err: any) {
            console.error('Failed to load settings:', err);
            this.setState({ error: 'Failed to load settings' });
        } finally {
            this.setState({ isLoading: false, hasUnsavedChanges: false });
        }
    }

    private async saveSettingsOnly() {
        const fieldErrors = this.validateAllFields();
        this.setState({ fieldErrors });
        
        if (Object.keys(fieldErrors).length > 0) {
            this.setState({ error: 'Please fix validation errors before saving' });
            return false;
        }

        this.setState({ isSaving: true, error: null, success: null });
        const { services } = this.props;

        try {
            if (services.api?.put) {
                // First, find the existing instance to update it instead of creating a new one
                let existingInstanceId = null;
                
                try {
                    const getParams = {
                        definition_id: CHAT_SETTINGS.DEFINITION_ID,
                        user_id: 'current',
                        scope: 'user'
                    };
                    const queryString = new URLSearchParams(getParams).toString();
                    const url = `${BRAINDRIVE_CORE_API}/api/v1/settings/instances?${queryString}`;
                    const existingResponse = await services.api.get<SettingsInstances | SettingsInstance>(url);
                    
                    if (Array.isArray(existingResponse) && existingResponse.length > 0) {
                        existingInstanceId = existingResponse[0].id;
                    } else if (existingResponse && typeof existingResponse === 'object' && existingResponse !== null && 'id' in existingResponse) {
                        // Handle the single object case: check for object type and existence of 'id' property
                        existingInstanceId = existingResponse.id;
                    }
                } catch (searchError) {
                    console.warn('ComponentGeneralSettings: Could not search for existing instance:', searchError);
                }
                const payload: {[key: string]: any} = {
                    definition_id: CHAT_SETTINGS.DEFINITION_ID,
                    value: this.state.settings,
                    name: CHAT_SETTINGS.NAME,
                    scope: 'user',
                    user_id: 'current'
                };
                if (existingInstanceId) {
                    payload.id = existingInstanceId;
                }
                await services.api.post(`${BRAINDRIVE_CORE_API}/api/v1/settings/instances`, payload);
            } else if (services.settings?.setSetting) {
                await services.settings.setSetting(CHAT_SETTINGS.DEFINITION_ID, this.state.settings, { userId: 'current' });
            } else {
                throw new Error('No service available to save settings');
            }

            this.setState({
                isSaving: false,
                success: 'Settings saved successfully! The microservice will restart with new configuration.',
                hasUnsavedChanges: false,
                fieldErrors: {}
            });
            setTimeout(() => this.setState({ success: null }), 5000);
            return true;
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            this.setState({
                isSaving: false,
                error: 'Failed to save settings. Check console for details.'
            });
            return false;
        }
    }

    private async restartPluginServices(pluginSlug: string, definitionId: string, serviceName = null) {
        const {services} = this.props;
        this.setState({ isRestarting: true, error: null, restartStatus: null });

        try {
            if (services.api?.post) {
                // Construct the payload
                const payload: {[key: string]: string} = {
                    definition_id: definitionId,
                    user_id: 'current',
                };

                if (serviceName) {
                    payload.service_name = serviceName; // optional
                }

                // Build the endpoint URL
                const url = `${BRAINDRIVE_CORE_API}/api/v1/plugins/${pluginSlug}/services/restart`;

                // Make the POST request
                const response: any = await services.api.post(url, payload);

                // Update state with success results
                this.setState({
                    restartStatus: response,
                    error: null,
                    isRestarting: false,
                    success: response?.message || 'Plugin services have been restarted with the new configuration.',
                });

                console.log("Restart response:", response);
                setTimeout(() => this.setState({ success: null, restartStatus: null }), 5000);
                return true;
            }
        } catch (err) {
            console.error('Failed to restart services::', err);
            this.setState({
                isRestarting: false,
                error: 'Failed to restart services:. Check console for details.'
            });
            return false;
        }
        return false;
    };

    private handleSaveOnly = async () => {
        await this.saveSettingsOnly();
    };

    private handleSaveAndRestart = async () => {
        const saveSuccess = await this.saveSettingsOnly();
        if (saveSuccess) {
            const pluginSlug = CHAT_SETTINGS.PLUGIN_SLUG;
            const definitionId = CHAT_SETTINGS.DEFINITION_ID;
            const serviceName = null;
            await this.restartPluginServices(pluginSlug, definitionId, serviceName);
        }
    };

    private handleDismissChanges = () => {
        // Reset to the last loaded state
        this.loadSettings();
        this.setState({ 
            hasUnsavedChanges: false,
            error: null,
            success: null,
            fieldErrors: {}
        });
    };

    private handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = event.target;
        const { name, value, type } = target;
        
        this.setState(prevState => {
            let updatedValue: string | number | boolean;
            if (type === 'checkbox' && target instanceof HTMLInputElement) {
                updatedValue = target.checked;
            } else if (type === 'number') {
                updatedValue = value === '' ? 0 : Number(value);
            } else {
                updatedValue = value;
            }

            // Clear field error when user starts typing
            const newFieldErrors = { ...prevState.fieldErrors };
            delete newFieldErrors[name];

            return {
                settings: {
                    ...prevState.settings,
                    [name]: updatedValue,
                },
                hasUnsavedChanges: true,
                fieldErrors: newFieldErrors
            };
        });
    };

    private renderField = (fieldName: string) => {
        const config = FIELD_CONFIG[fieldName as keyof ChatSettingsValue];
        const value = this.state.settings[fieldName as keyof ChatSettingsValue];
        const error = this.state.fieldErrors[fieldName];
        
        if (!config || !this.shouldShowField(fieldName)) return null;

        const baseClasses = `mt-1 block w-full rounded-md border shadow-sm px-3 py-2 text-sm transition-colors ccs-input ${
        error ? 'border-red-300' : ''
        }`;

        let inputElement;

        switch (config.type) {
        case 'select':
            const selectConfig = config as SelectFieldConfig;
            inputElement = (
            <select
                name={fieldName}
                value={value as string}
                onChange={this.handleInputChange}
                className={baseClasses}
            >
                <option value="">{selectConfig.placeholder || 'Select option...'}</option>
                {selectConfig.options.map(option => (
                <option key={option} value={option}>{option}</option>
                ))}
            </select>
            );
            break;
        
        case 'checkbox':
            inputElement = (
            <div className="flex items-center space-x-2">
                <input
                    id={fieldName}
                    name={fieldName}
                    type="checkbox"
                    checked={value as boolean}
                    onChange={this.handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={fieldName} className="text-sm font-medium text-gray-700">
                {config.label}
                </label>
            </div>
            );
            break;
        
        case 'password':
            const passwordConfig = config as PasswordFieldConfig;
            inputElement = (
            <div className="relative">
                <input
                    name={fieldName}
                    type={this.state.showApiKey ? 'text' : 'password'}
                    value={value as string}
                    onChange={this.handleInputChange}
                    className={`${baseClasses} pr-10`}
                    placeholder={passwordConfig.placeholder || ''}
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => this.setState({ showApiKey: !this.state.showApiKey })}
                    >
                    {this.state.showApiKey ? 
                        <EyeOff className="h-4 w-4 text-gray-400" /> : 
                        <Eye className="h-4 w-4 text-gray-400" />
                    }
                </button>
            </div>
            );
            break;
        
        case 'number':
            const numberConfig = config as NumberFieldConfig;
            inputElement = (
            <input
                name={fieldName}
                type="number"
                value={typeof value === 'number' ? value : 0}
                onChange={this.handleInputChange}
                className={baseClasses}
                placeholder={numberConfig.placeholder || ''}
                min={numberConfig.min}
                max={numberConfig.max}
            />
            );
            break;

        case 'model-select':
            const modelSelectConfig = config as ModelSelectFieldConfig;
            const { availableModels } = this.props;
            const modelSearchQuery = this.getModelSearchQuery(fieldName);
            const filteredModels = this.getFilteredModels(modelSearchQuery);
            const selectedModelName = value as string;

            inputElement = (
                <Select value={selectedModelName} onValueChange={this.handleModelChange(fieldName)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={modelSelectConfig.placeholder || 'Select model...'}>
                            {selectedModelName || modelSelectConfig.placeholder}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                        searchable={availableModels.length > 1}
                        searchPlaceholder="Search models..."
                        onSearchChange={this.handleModelSearchChange(fieldName)}
                    >
                        {filteredModels.map((model) => (
                            <SelectItem key={model.name} value={model.name}>
                                <div className="flex flex-col">
                                    <span>{model.name}</span>
                                    <span className="text-xs text-gray-500">{model.serverName}</span>
                                </div>
                            </SelectItem>
                        ))}
                        {filteredModels.length === 0 && (
                            <div className="p-2 text-sm text-gray-500">No models found</div>
                        )}
                    </SelectContent>
                </Select>
            );
            break;

        default:
            const textConfig = config as TextFieldConfig;
            inputElement = (
            <input
                name={fieldName}
                type={config.type === 'url' ? 'url' : 'text'}
                value={value as string}
                onChange={this.handleInputChange}
                className={baseClasses}
                placeholder={textConfig.placeholder || ''}
            />
            );
        }

        if (config.type === 'checkbox') {
        return (
            <div key={fieldName} className="space-y-2">
                {inputElement}
                <p className="text-xs ccs-help flex items-start space-x-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{config.description}</span>
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        );
        }

        return (
        <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium ccs-label">
                {config.label}
                {config.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {inputElement}
            <p className="text-xs ccs-help flex items-start space-x-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{config.description}</span>
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        );
    };

    private renderSection = (sectionKey: string) => {
        const section = SECTIONS[sectionKey as keyof typeof SECTIONS];
        const fields = Object.keys(FIELD_CONFIG).filter(
            (key) => FIELD_CONFIG[key as keyof ChatSettingsValue].section === sectionKey
        );

        const visibleFields = fields.filter(field => this.shouldShowField(field));

        if (visibleFields.length === 0) return null;

        // Custom layout for provider sections (llm, embedding, evaluation)
        const isProviderSection = ['llm', 'embedding', 'evaluation'].includes(sectionKey);

        if (isProviderSection) {
            const providerField = visibleFields.find(f => f.endsWith('_PROVIDER') || f === 'EVALUATION_PROVIDER');
            const otherFields = visibleFields.filter(f => f !== providerField);

            return (
                <div key={sectionKey} className="p-6 ccs-card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 ccs-card-title">
                        <span>{section.icon}</span>
                        <span>{section.title}</span>
                    </h3>
                    <div className="space-y-6">
                        {/* Provider dropdown - half width */}
                        {providerField && (
                            <div className="md:w-1/2">
                                {this.renderField(providerField)}
                            </div>
                        )}
                        {/* Base URL and Model on one row */}
                        {otherFields.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {otherFields.map(field => this.renderField(field))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Custom layout for contextual retrieval section
        if (sectionKey === 'contextual') {
            const checkboxField = visibleFields.find(f => f === 'ENABLE_CONTEXTUAL_RETRIEVAL');
            const otherFields = visibleFields.filter(f => f !== checkboxField);

            return (
                <div key={sectionKey} className="p-6 ccs-card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 ccs-card-title">
                        <span>{section.icon}</span>
                        <span>{section.title}</span>
                    </h3>
                    <div className="space-y-6">
                        {/* Checkbox - half width */}
                        {checkboxField && (
                            <div className="md:w-1/2">
                                {this.renderField(checkboxField)}
                            </div>
                        )}
                        {/* Base URL and Model on one row */}
                        {otherFields.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {otherFields.map(field => this.renderField(field))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Default layout for other sections
        return (
        <div key={sectionKey} className="p-6 ccs-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 ccs-card-title">
                <span>{section.icon}</span>
                <span>{section.title}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleFields.map(field => this.renderField(field))}
            </div>
        </div>
        );
    };

    private renderForm() {
        const { isSaving, isRestarting, error, success, hasUnsavedChanges } = this.state;
        const isProcessing = isSaving || isRestarting;

        return (
        <div className="space-y-6">
                <div className="ccs-info p-4 mb-6">
                    <div className="flex">
                        <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                            These settings configure your document processing microservice. 
                            Use "Save & Restart" to apply changes immediately, or "Save Only" to save without restarting the service.
                        </p>
                    </div>
                </div>

                {Object.keys(SECTIONS).map(sectionKey => this.renderSection(sectionKey))}

                <div className="flex items-center justify-between pt-6 ccs-divider">
                    <div className="flex-1">
                        {success && (
                        <div className="flex items-center text-green-600">
                            <Save className="w-4 h-4 mr-2" />
                            <span className="text-sm">{success}</span>
                        </div>
                        )}
                        {error && (
                        <div className="flex items-center text-red-600">
                            <XCircle className="w-4 h-4 mr-2" />
                            <span className="text-sm">{error}</span>
                        </div>
                        )}
                    </div>
                
                    <div className="flex items-center space-x-4">
                        {hasUnsavedChanges && (
                            <span className="text-sm text-orange-600 font-medium">
                                Unsaved changes
                            </span>
                        )}
                        {hasUnsavedChanges && (
                            // <button
                            //     onClick={this.handleDismissChanges}
                            //     disabled={isProcessing}
                            //     className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            //     >
                            //     <X className="w-4 h-4 mr-2" />
                            //     Dismiss
                            // </button>
                            <ActionButton
                                onClick={this.handleDismissChanges}
                                disabled={isProcessing}
                                text="Dismiss"
                                icon={<X className="w-4 h-4 mr-2" />}
                            />
                        )}
                        <ActionButton
                            onClick={this.handleSaveOnly}
                            text="Save Only"
                            icon={<Save className="w-4 h-4" />}
                            isProcessing={isSaving && !isRestarting}
                            disabled={!hasUnsavedChanges}
                        />

                        <ActionButton
                            onClick={this.handleSaveAndRestart}
                            text="Save & Restart"
                            icon={<RotateCcw className="w-4 h-4" />}
                            isProcessing={isProcessing}
                            processingText={isSaving ? 'Saving...' : 'Restarting...'}
                            disabled={!hasUnsavedChanges}
                        />
                        {/* <button
                            onClick={this.handleSaveOnly}
                            disabled={isProcessing || !hasUnsavedChanges}
                            className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-all duration-200 ${
                                hasUnsavedChanges && !isProcessing
                                ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            >
                            {isSaving && !isRestarting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Save Settings'}
                            <Save className='w-4 h-4 mr-2' />
                            Save Only
                        </button>
                        <button
                            onClick={this.handleSaveAndRestart}
                            disabled={isProcessing || !hasUnsavedChanges}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-all duration-200 ${
                                hasUnsavedChanges && !isProcessing
                                ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                                : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                            }`}
                            >
                            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {isProcessing ? (isSaving ? 'Saving...' : 'Restarting...') : 'Save & Restart'}
                        </button> */}
                    </div>
                </div>
            </div>
        );
    }

    render() {
        const { isLoading, error } = this.state;

        return (
        <div className="max-w-4xl mx-auto p-6 ccs-container">
            <div className="mb-6">
            <h1 className="text-xl font-bold mb-2">
                Plugin Service Runtime Settings
            </h1>
            <p className="ccs-help">
                Configure your LLM providers, document processing, and retrieval settings
            </p>
            </div>

            {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                <p className="ccs-help">Loading settings...</p>
            </div>
            ) : error && !this.state.settings ? (
            <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
                <p className="ccs-help">{error}</p>
            </div>
            ) : (
            this.renderForm()
            )}
        </div>
        );
    }
}
