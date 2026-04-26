import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Bot, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function AIChat() {
  const { user } = useAuth();
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'Sortd'}`;
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Sortd AI. I can answer questions based on your saved notes. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    const userMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.chat(query);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the brain right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f7f9] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-black/5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/inbox" className="p-2 -ml-2 bg-[#f5f7f9] rounded-full text-black/40 hover:text-black transition-all active:scale-90">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Sortd AI" className="w-10 h-10 rounded-2xl object-cover shadow-sm" />
            <div>
              <h1 className="text-[17px] font-black tracking-tight leading-none mb-1">Sortd AI</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Thinking with your notes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 no-scrollbar pb-32">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center shadow-sm overflow-hidden ${
              m.role === 'user' 
                ? 'bg-[#f5f7f9]' 
                : 'bg-white'
            }`}>
              {m.role === 'user' ? <img src={avatarUrl} alt="User" className="w-full h-full object-cover" /> : <img src="/logo.png" className="w-full h-full object-cover" alt="AI" />}
            </div>
            <div className={`max-w-[85%] px-5 py-4 rounded-[28px] text-[15px] leading-relaxed shadow-sm ${
              m.role === 'user' 
                ? 'bg-[#33b1ff] text-white rounded-tr-none' 
                : 'bg-white text-[#1a1d1f] rounded-tl-none border border-black/5'
            }`}>
              <div className={`prose prose-sm max-w-none ${m.role === 'user' ? 'prose-invert' : ''}`}>
                <ReactMarkdown>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-2xl shrink-0 bg-white overflow-hidden flex items-center justify-center shadow-sm">
              <img src="/logo.png" className="w-full h-full object-cover" alt="AI" />
            </div>
            <div className="bg-white px-6 py-5 rounded-[28px] rounded-tl-none border border-black/5 flex items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#33b1ff]/20 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#33b1ff]/20 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#33b1ff]/20 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Container */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#f5f7f9] via-[#f5f7f9] to-transparent pointer-events-none z-30">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ask your notes anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="input-flat !pl-5 !pr-[54px] text-[15px] placeholder:text-[13px] placeholder:text-black/20 neo-shadow"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 w-9 h-9 rounded-2xl bg-[#33b1ff]/20 text-[#33b1ff] flex items-center justify-center transition-all active:scale-90 disabled:opacity-20 hover:bg-[#33b1ff]/30"
            >
              {loading ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
