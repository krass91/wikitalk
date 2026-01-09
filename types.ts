
export type Language = 'en' | 'bg' | 'ru';

export interface SourceInfo {
  title: string;
  url: string;
  thumbnail?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: SourceInfo[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  language: Language;
  updatedAt: number;
}

export interface TranslationStrings {
  newChat: string;
  history: string;
  typePlaceholder: string;
  settings: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  aiThinking: string;
  wikiSource: string;
  welcome: string;
  welcomeSub: string;
  noHistory: string;
}

export type Translations = Record<Language, TranslationStrings>;
