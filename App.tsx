
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Menu, Moon, Sun, Send, Globe, MessageSquare, Trash2, X, Bot, Search } from 'lucide-react';
import { ChatSession, Message, Language, SourceInfo } from './types';
import { TRANSLATIONS, SUPPORTED_LANGUAGES } from './constants';
import { searchWikipedia } from './services/wikipediaService';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<Language>('en');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('wiki_chat_sessions');
    const savedTheme = localStorage.getItem('wiki_chat_theme');
    const savedLang = localStorage.getItem('wiki_chat_lang');
    
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme || 'dark');
    if (savedLang) setLanguage(savedLang as Language);
  }, []);

  useEffect(() => {
    localStorage.setItem('wiki_chat_sessions', JSON.stringify(sessions));
    localStorage.setItem('wiki_chat_theme', theme);
    localStorage.setItem('wiki_chat_lang', language);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [sessions, theme, language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, isLoading]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const t = TRANSLATIONS[language];

  const handleNewChat = () => {
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: t.newChat,
      messages: [],
      language,
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
  };

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || isLoading) return;

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: currentSessionId,
        title: messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : ''),
        messages: [],
        language,
        updatedAt: Date.now()
      };
      currentSessions = [newSession, ...currentSessions];
      setSessions(currentSessions);
      setActiveSessionId(currentSessionId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: Date.now()
    };

    const sessionIdx = currentSessions.findIndex(s => s.id === currentSessionId);
    if (sessionIdx === -1) return;

    const updatedMessages = [...currentSessions[sessionIdx].messages, userMessage];
    currentSessions[sessionIdx].messages = updatedMessages;
    
    if (updatedMessages.length === 1) {
      currentSessions[sessionIdx].title = messageContent.slice(0, 30) + (messageContent.length > 30 ? '...' : '');
    }
    
    currentSessions[sessionIdx].updatedAt = Date.now();
    setSessions([...currentSessions]);
    const currentInput = messageContent;
    setInput('');
    setIsLoading(true);

    try {
      const wikiResults = await searchWikipedia(currentInput, language);
      const sources: SourceInfo[] = wikiResults.map(r => ({
        title: r.title,
        url: r.url,
        thumbnail: r.thumbnail
      }));
      
      let responseContent = "";
      if (wikiResults.length > 0) {
        // High confidence match
        const mainResult = wikiResults[0];
        
        // Check if confidence is extremely low despite results
        const isLowConfidence = (mainResult as any).score < 30;

        if (isLowConfidence) {
          responseContent = language === 'en' 
            ? `I found some potential matches, but I'm not entirely sure. Here is the most relevant one:\n\n### ${mainResult.title}\n${mainResult.extract}`
            : language === 'bg'
            ? `Открих няколко възможни съвпадения, но не съм напълно сигурен. Ето най-подходящото:\n\n### ${mainResult.title}\n${mainResult.extract}`
            : `Я нашел несколько потенциальных совпадений, но не совсем уверен. Вот наиболее подходящее:\n\n### ${mainResult.title}\n${mainResult.extract}`;
        } else {
          responseContent = `### ${mainResult.title}\n${mainResult.extract}`;
        }
        
        if (wikiResults.length > 1) {
          const others = wikiResults.slice(1, 4).map(r => r.title);
          const relatedLabel = language === 'en' ? 'Related topics' : language === 'bg' ? 'Свързани теми' : 'Связанные темы';
          responseContent += `\n\n---\n\n**${relatedLabel}:** ${others.join(', ')}`;
        }
      } else {
        const wikiSearchUrl = `https://${language}.wikipedia.org/w/index.php?search=${encodeURIComponent(currentInput)}`;
        responseContent = language === 'en' 
          ? `I couldn't find any specific Wikipedia articles for "${currentInput}". \n\n[Search directly on Wikipedia](${wikiSearchUrl})` 
          : language === 'bg' 
            ? `Не можах да открия статии в Wikipedia за "${currentInput}". \n\n[Потърсете директно в Wikipedia](${wikiSearchUrl})` 
            : `Я не смог найти статей в Wikipedia по запросу "${currentInput}". \n\n[Искать напрямую в Wikipedia](${wikiSearchUrl})`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
        sources
      };

      const finalSessions = [...currentSessions];
      const finalIdx = finalSessions.findIndex(s => s.id === currentSessionId);
      finalSessions[finalIdx].messages = [...finalSessions[finalIdx].messages, assistantMessage];
      setSessions(finalSessions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#212121] overflow-hidden text-gray-900 dark:text-gray-100">
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-20 p-2 rounded-lg bg-white/80 dark:bg-[#171717]/80 backdrop-blur shadow-sm border border-gray-200 dark:border-gray-800 md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <Menu size={20} />
        </button>
      )}

      <aside className={`
        ${isSidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-0'}
        transition-all duration-300 ease-in-out
        bg-gray-50 dark:bg-[#171717] border-r border-gray-200 dark:border-gray-800 flex flex-col z-30 fixed md:relative h-full
      `}>
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={handleNewChat}
            className="flex-grow flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-200 transition-all shadow-sm"
          >
            <Plus size={18} />
            {t.newChat}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="ml-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-500 dark:text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto px-2 space-y-1 mt-2">
          <p className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {t.history}
          </p>
          {sessions.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400 italic">{t.noHistory}</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all
                  ${activeSessionId === session.id ? 'bg-white dark:bg-[#2f2f2f] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'}
                `}
              >
                <MessageSquare size={16} className={`flex-shrink-0 ${activeSessionId === session.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                <span className="flex-grow truncate text-xs font-medium text-gray-600 dark:text-gray-300">
                  {session.title}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-gray-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <Globe size={14} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent focus:outline-none flex-grow cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="dark:bg-[#171717]">{lang.flag} {lang.name}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 transition-all"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? t.dark : t.light}
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col relative overflow-hidden h-full">
        <header className="h-14 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white/80 dark:bg-[#212121]/80 backdrop-blur-md z-10">
          <div className="flex items-center">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 md:block hidden"
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              WikiTalk <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter font-black shadow-lg shadow-emerald-500/20">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Online</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-grow overflow-y-auto scroll-smooth">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 fade-in duration-700">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30 rotate-3">
                <Search size={40} className="text-white -rotate-3" />
              </div>
              <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-3 tracking-tight">
                {t.welcome}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm font-medium">
                {t.welcomeSub}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 max-w-2xl w-full">
                {language === 'en' ? (
                  <>
                    <button onClick={() => handleSend(undefined, "Quantum mechanics")} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/5 text-left transition-all">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Quantum mechanics</p>
                      <p className="text-xs text-gray-400 mt-1">Physics & Science</p>
                    </button>
                    <button onClick={() => handleSend(undefined, "Ancient Rome")} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/5 text-left transition-all">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Ancient Rome</p>
                      <p className="text-xs text-gray-400 mt-1">History & Empire</p>
                    </button>
                  </>
                ) : language === 'bg' ? (
                  <>
                    <button onClick={() => handleSend(undefined, "Слави Трифонов")} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/5 text-left transition-all">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Слави Трифонов</p>
                      <p className="text-xs text-gray-400 mt-1">Личности на България</p>
                    </button>
                    <button onClick={() => handleSend(undefined, "Рилски манастир")} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/5 text-left transition-all">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Рилски манастир</p>
                      <p className="text-xs text-gray-400 mt-1">Култура и история</p>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleSend(undefined, "Млечный Путь")} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/5 text-left transition-all">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Млечный Путь</p>
                      <p className="text-xs text-gray-400 mt-1">Астрономия</p>
                    </button>
                    <button onClick={() => handleSend(undefined, "Эрмитаж")} className="group p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/5 text-left transition-all">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Эрмитаж</p>
                      <p className="text-xs text-gray-400 mt-1">Искусство</p>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col pb-12">
              {activeSession.messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} lang={language} />
              ))}
              {isLoading && (
                <div className="py-8 w-full bg-gray-50/50 dark:bg-[#2f2f2f]/50 border-b border-gray-100/50 dark:border-gray-800/50">
                  <div className="max-w-3xl mx-auto px-4 flex gap-4 md:gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600 shadow-md animate-pulse">
                      <Bot size={20} className="text-white" />
                    </div>
                    <div className="flex-grow py-1">
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest italic">
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-duration:800ms]"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:200ms]"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-duration:800ms] [animation-delay:400ms]"></span>
                        </div>
                        {t.aiThinking}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 md:p-8 flex-shrink-0 bg-gradient-to-t from-white dark:from-[#212121] via-white/95 dark:via-[#212121]/95 to-transparent">
          <form 
            onSubmit={handleSend}
            className="max-w-3xl mx-auto relative"
          >
            <div className="relative flex items-center">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t.typePlaceholder}
                className="w-full min-h-[56px] resize-none bg-white dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-200 rounded-2xl py-4 pl-5 pr-14 border border-gray-200 dark:border-gray-700 shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium text-sm leading-relaxed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95 group"
              >
                <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </form>
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-4 mt-4 opacity-30 hover:opacity-100 transition-opacity">
            <span className="h-px bg-gray-300 dark:bg-gray-700 flex-grow"></span>
            <p className="text-[9px] text-gray-400 uppercase tracking-[0.3em] font-black">
              Data Fetch: {language.toUpperCase()}_WIKI_API
            </p>
            <span className="h-px bg-gray-300 dark:bg-gray-700 flex-grow"></span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
