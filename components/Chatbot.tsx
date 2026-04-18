'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

/**
 * Chatbot — floating bottom-right assistant.
 *
 * Only rendered when FEATURE_CHATBOT=true (see app/layout.tsx).
 * Persists open/closed state across navigation via localStorage.
 *
 * Calls /api/chatbot which uses lib/ai.ts with the built search index
 * (run `npm run build-search-index` before deploying).
 */
export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem('chatbot.open') === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('chatbot.open', open ? '1' : '0');
  }, [open]);

  async function send() {
    if (!input.trim() || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: input }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const { reply } = await res.json();
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Sorry, something went wrong. Try again?' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 sm:w-96 h-[28rem] flex flex-col rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
          <div className="flex justify-between items-center p-3 border-b border-base-300">
            <strong className="text-base">Assistant</strong>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite">
            {messages.length === 0 && !loading && (
              <p className="text-sm opacity-60">Ask me anything about the site.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200'
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownLinks(m.content) }}
                />
              </div>
            ))}
            {loading && <div className="opacity-60 text-sm">Thinking&hellip;</div>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="p-3 border-t border-base-300 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input input-bordered flex-1 text-sm"
              placeholder="Ask anything&hellip;"
              aria-label="Message"
            />
            <button className="btn btn-primary btn-square" disabled={loading}>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary btn-circle btn-lg shadow-xl"
          aria-label="Open assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

/**
 * Render only [text](/internal/url) markdown links.
 * Escapes everything else — assistant output is not trusted HTML.
 */
function renderMarkdownLinks(s: string) {
  const escaped = s.replace(/[<>&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;',
  );
  return escaped.replace(
    /\[([^\]]+)\]\((\/[^)\s]*)\)/g,
    (_, text, url) => `<a href="${url}" class="link link-primary">${text}</a>`,
  );
}
