export { AIService } from './aiService';
// export { SearchService, type SearchResponse, type SearchOptions } from './searchService';
export { DocumentService, type DocumentProcessingResult, type MultipleDocumentProcessingResult, type SupportedFileTypes } from './documentService';
export {
  startPluginEvaluation,
  submitPluginEvaluation,
  getEvaluationRuns,
  getEvaluationResults,
  startPluginEvaluationWithQuestions,
} from './evaluationApiService';
// export type { SearchResult } from '../types';