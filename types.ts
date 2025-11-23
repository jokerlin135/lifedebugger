export enum Language {
  VI = 'vi',
  EN = 'en'
}

export interface ItemDetails {
  analysis: string; // Deep dive analysis
  steps: string[]; // Step by step guide
  risks: string; // Potential risks
}

export interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  details?: ItemDetails; // Optional: populated on demand
}

export interface SearchResult {
  id: string;
  query: string;
  timestamp: number;
  suggestions: SuggestionItem[];
  roastCommentary: string; // The "fun/rude" analysis
  sources: string[]; // Sources cited by the AI
  promptSuggestion?: string; // NEW: The optimized prompt
  bestModel?: string; // NEW: Recommended AI model
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'warning' | 'system';
  message: string;
  details?: string;
}

export type PageView = 'home' | 'docs' | 'history' | 'logs' | 'report';

export interface AppState {
  language: Language;
  currentPage: PageView;
  logs: LogEntry[];
  history: SearchResult[];
}

export interface GeminiResponseSchema {
  suggestions: { title: string; description: string }[];
  roast: string;
  sources: string[];
  promptSuggestion: string;
  bestModel: string;
}

export interface GeminiDetailSchema {
  analysis: string;
  steps: string[];
  risks: string;
}

export interface Attachment {
  type: 'file' | 'link';
  content: string; // Base64 for file, URL for link
  mimeType?: string; // For files
  name?: string; // Filename or truncated URL
}