
import React from 'react';
import { Message } from '../types';
import { User, Bot, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  lang: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, lang }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`py-8 w-full border-b border-gray-100/50 dark:border-gray-800/50 ${isAssistant ? 'bg-gray-50/50 dark:bg-[#2f2f2f]/50' : 'bg-white dark:bg-[#212121]'}`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-4 md:gap-6">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${isAssistant ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
          {isAssistant ? <Bot size={20} /> : <User size={20} />}
        </div>
        <div className="flex-grow min-w-0 space-y-4">
          <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 text-[15px] whitespace-pre-wrap leading-relaxed font-[450]">
            {message.content}
          </div>
          
          {message.sources && message.sources.length > 0 && (
            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-[0.2em]">
                Verified Wikipedia Results
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                      {source.thumbnail ? (
                        <img src={source.thumbnail} alt={source.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <ImageIcon size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {source.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                        <ExternalLink size={10} />
                        <span>Read full article</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
