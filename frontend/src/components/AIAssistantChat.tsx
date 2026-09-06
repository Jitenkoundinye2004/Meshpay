import { useState } from 'react';
import { Bot, Send, Sparkles, Activity } from 'lucide-react';

export function AIAssistantChat() {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; context?: any }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your MeshPay AI Intelligence Assistant. Ask me anything about offline transactions, network node reliability, latency, or bridge ingestion status.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQueries = [
    "Why was transaction TX-8291 delayed?",
    "Which nodes have the highest failure rate?",
    "Show suspicious transactions.",
    "Which bridge node is most reliable?"
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    if (!queryText) setInput('');

    setMessages((prev: any[]) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      });
      const data = await res.json();

      setMessages((prev: any[]) => [...prev, {
        sender: 'ai',
        text: data.answer || 'No analysis response generated.',
        context: data.retrievedContext
      }]);
    } catch (e) {
      setMessages((prev: any[]) => [...prev, {
        sender: 'ai',
        text: 'AI Service currently operating in fallback mode. Unable to reach external AI endpoint.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] max-w-4xl mx-auto w-full bg-card border border-border rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-300">
      <div className="bg-secondary/50 border-b border-border p-4 flex items-center gap-3">
        <div className="bg-primary/20 p-2.5 rounded-2xl text-primary">
          <Bot size={22} />
        </div>
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            MeshPay Intelligence Assistant <Sparkles size={16} className="text-amber-400 fill-amber-400" />
          </h3>
          <p className="text-xs text-muted-foreground">Controlled query layer for natural-language telemetry insights.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg: any, idx: number) => (
          <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm font-medium leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-primary text-primary-foreground font-semibold' 
                : 'bg-secondary/60 border border-border text-foreground'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.context && (
                <div className="mt-3 pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px] opacity-80 font-mono">
                  <div>Total Ledger Tx: {msg.context.totalTx}</div>
                  <div>Active Nodes: {msg.context.activeNodes}</div>
                </div>
              )}
            </div>
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                You
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-secondary/60 border border-border p-3 rounded-2xl flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="animate-spin text-primary" size={14} /> Retrieving telemetry context & generating answer...
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-secondary/20 border-t border-border flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase text-muted-foreground shrink-0">Suggested:</span>
        {sampleQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-xs bg-secondary/80 hover:bg-secondary border border-border px-3 py-1 rounded-full shrink-0 font-medium transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 bg-background border-t border-border flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask MeshPay AI Assistant..."
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-primary text-primary-foreground p-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
