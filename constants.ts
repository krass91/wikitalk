
import { Translations } from './types';

export const TRANSLATIONS: Translations = {
  en: {
    newChat: "New Chat",
    history: "History",
    typePlaceholder: "Ask Wikipedia anything...",
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    aiThinking: "Searching Wikipedia...",
    wikiSource: "Source: Wikipedia",
    welcome: "How can I help you today?",
    welcomeSub: "I use Wikipedia to provide accurate information.",
    noHistory: "No chat history yet."
  },
  bg: {
    newChat: "Нов чат",
    history: "История",
    typePlaceholder: "Попитай Wikipedia за всичко...",
    settings: "Настройки",
    language: "Език",
    theme: "Тема",
    light: "Светла",
    dark: "Тъмна",
    aiThinking: "Търся в Wikipedia...",
    wikiSource: "Източник: Wikipedia",
    welcome: "Как мога да ви помогна днес?",
    welcomeSub: "Използвам Wikipedia, за да предоставя точна информация.",
    noHistory: "Все още няма история."
  },
  ru: {
    newChat: "Новый чат",
    history: "История",
    typePlaceholder: "Спроси Wikipedia о чем угодно...",
    settings: "Настройки",
    language: "Язык",
    theme: "Тема",
    light: "Светлая",
    dark: "Темная",
    aiThinking: "Ищу в Wikipedia...",
    wikiSource: "Источник: Wikipedia",
    welcome: "Чем я могу вам помочь сегодня?",
    welcomeSub: "Я использую Wikipedia для предоставления точной информации.",
    noHistory: "История чатов пока пуста."
  }
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
] as const;
