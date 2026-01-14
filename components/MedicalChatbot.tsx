import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Minimize2, Maximize2, X, ExternalLink } from 'lucide-react';
import { ChatMessage, AnalysisResult } from '../types';
import { chatWithMedicalAI } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface MedicalChatbotProps {
  contextReport?: AnalysisResult | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const MedicalChatbot: React.FC<MedicalChatbotProps> = ({ contextReport, messages, setMessages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithMedicalAI(userMessage.text, messages, contextReport?.markdown);
      setMessages(prev => [...prev, response]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: `Errore durante la consultazione: ${error.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 bg-medical-600 text-white p-4 rounded-full shadow-2xl hover:bg-medical-700 transition-all z-50 animate-bounce hover:animate-none flex items-center gap-2 group"
      >
        <Bot size={28} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold uppercase text-xs whitespace-nowrap">Assistente Medico</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-24 right-8 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'}`}>
      {/* Header */}
      <div className="bg-medical-900 p-4 rounded-t-3xl flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <Bot className="text-medical-400" size={20} />
          <h3 className="font-black text-xs uppercase tracking-widest">MediMind Assistant</h3>
          {contextReport && (
            <span className="bg-green-500 text-[8px] px-2 py-0.5 rounded-full animate-pulse">Context Ready</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-red-500 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="text-center py-10 opacity-40">
                <Bot size={48} className="mx-auto mb-2 text-medical-600" />
                <p className="text-[10px] font-black uppercase tracking-widest">Inizia una consultazione medica AI</p>
                <p className="text-[9px] mt-1 font-bold">Puoi chiedere dettagli sul referto o ricerche su PubMed</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${
                  msg.role === 'user' 
                    ? 'bg-medical-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="flex items-center gap-2 mb-2 opacity-50 text-[9px] font-black uppercase">
                    {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                    {msg.role === 'user' ? 'Specialista' : 'MediMind AI'}
                  </div>
                  <div className="prose prose-sm max-w-none text-justify prose-p:my-1">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  
                  {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-slate-100 space-y-1">
                      <p className="text-[8px] font-black text-medical-600 uppercase">Fonti Scientifiche:</p>
                      {msg.groundingChunks.map((chunk, cIdx) => (
                        chunk.web && (
                          <a key={cIdx} href={chunk.web.uri} target="_blank" rel="noopener" className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-medical-600 truncate">
                            <ExternalLink size={8} /> {chunk.web.title}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none">
                  <Loader2 size={16} className="animate-spin text-medical-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 rounded-b-3xl">
            <div className="relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Fai una domanda clinica..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-medical-500 outline-none font-bold"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                  input.trim() ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-300'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[8px] text-center text-slate-400 mt-2 font-bold uppercase tracking-widest">
              L'AI può commettere errori. Valuta sempre i dati clinicamente.
            </p>
          </form>
        </>
      )}
    </div>
  );
};