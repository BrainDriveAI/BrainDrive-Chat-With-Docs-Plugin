import type { TemplateTheme, Services } from "../types";
import type { DocumentProcessingResult } from "../services";
import type { IPluginService } from "./IPluginService";

export interface ServiceRuntimeStatus {
  name: string;
  status: 'checking' | 'ready' | 'not-ready' | 'error';
  lastChecked?: Date;
  error?: string;
}

export enum ViewType {
  COLLECTIONS = 'collections',
  DOCUMENTS = 'documents',
  CHAT = 'chat',
  SETTINGS = 'settings'
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  chat_session_count?: number;
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export interface Document {
  id: string;
  original_filename: string;
  file_size: number;
  document_type: string;
  collection_id: string;
  status: DocumentStatus;
  created_at: string;
  processed_at: string;
  error_message?: string;
  metadata?: object;
  chunk_count: number;
}

export interface DocumentChunkMetadata {
  created_at?: string;
  start_char?: number;
  end_char?: number;
  token_count?: number;
  document_filename?: string;
  document_type?: string;
  chunk_token_count?: number;
  chunk_char_count?: number;
  processing_method?: string;
  context_prefix?: string;
  has_context?: boolean;
  bm25_score?: number;
  rrf_score?: number;
  fusion_method?: string;
  found_in_vector?: boolean;
  found_in_bm25?: boolean;
  [key: string]: any;
}

export interface DocumentChunk {
    id: string;
    document_id: string;
    collection_id: string;
    content: string;
    chunk_index: number;
    chunk_type: string;
    parent_chunk_id?: string;
    metadata: DocumentChunkMetadata;
    embedding_vector?: number[];
}

export interface IntentResponse {
  /** Classified intent type (e.g., "retrieval", "chat", "summary") */
  type: string;
  /** Whether backend determined retrieval is required */
  requires_retrieval: boolean;
  /** Whether a full collection scan is required */
  requires_collection_scan: boolean;
  /** Confidence score (0–1) */
  confidence: number;
  /** LLM reasoning or explanation text */
  reasoning: string;
}

export interface ContextRetrievalResult {
  /** Retrieved document chunks relevant to the query */
  chunks: DocumentChunk[];
  /** Optional intent classification result */
  intent: IntentResponse | null;
  /** Indicates if an answer needs to be generated from context */
  requires_generation: boolean;
  /** What type of generation (e.g., "qa", "summary", "none") */
  generation_type: string;
  /** Any additional metadata from backend */
  metadata: Record<string, any>;
}

export enum ChatSessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export interface ChatSession {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  status: ChatSessionStatus;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count?: number;
}

// Interface for web search
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  engine?: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  // User control features
  isEditable?: boolean;
  isEdited?: boolean;
  originalContent?: string;
  canContinue?: boolean;
  canRegenerate?: boolean;
  isCutOff?: boolean;

  // Search results
  isSearchResults?: boolean;
  searchData?: {
    query: string;
    results: SearchResult[];
    scrapedContent?: any;
    totalResults: number;
    successfulScrapes?: number;
  };
  
  // Document context
  isDocumentContext?: boolean;
  documentData?: {
    results: DocumentProcessingResult[];
    context: string;
  };
  // Retrieved chunks context (collection retrieval)
  isRetrievedContext?: boolean;
  retrievalData?: {
    chunks: DocumentChunk[];
    context: string;
    intent?: IntentResponse | null;
    metadata?: Record<string, any>;
  };
  // Markdown toggle
  showRawMarkdown?: boolean;
}

// Plugin types
export interface ChatCollectionsConfig {
  apiBaseUrl?: string;
  refreshInterval?: number;
  showAdvancedOptions?: boolean;
  maxDocuments?: number;
  chatSettings?: {
    maxMessages?: number;
    autoSave?: boolean;
  };
}

export interface ChatCollectionsPluginState {
  currentView: ViewType;
  selectedCollection: Collection | null;
  selectedChatSession: ChatSession | null;
  collections: Collection[];
  documents: Document[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  loading: boolean;
  error: string | null;
  currentTheme: TemplateTheme;
  isInitializing: boolean;
  serviceStatuses: ServiceRuntimeStatus[];
  showServiceDetails: boolean;
}

export interface ChatCollectionsPluginProps {
  title?: string;
  description?: string;
  pluginId?: string;
  moduleId?: string;
  instanceId?: string;
  config?: ChatCollectionsConfig;
  services: Services;
  initialGreeting?: string;
  defaultStreamingMode?: boolean;
  promptQuestion?: string;
  conversationType?: string;
  // Persona-related props
  showPersonaSelection?: boolean;
}

// Plugin Service
// Type for the setState function passed from the React component
export type PluginStateUpdater = (newState: Partial<ChatCollectionsPluginState>) => void;

export interface PluginHeaderProps {
    pluginService: IPluginService;
    currentView: ViewType;
    serviceStatuses: ServiceRuntimeStatus[];
    showServiceDetails: boolean;
    areServicesReady: boolean;
    collectionName?: string;
}
