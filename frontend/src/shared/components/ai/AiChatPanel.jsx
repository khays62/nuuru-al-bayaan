import React from 'react';
import { Send, X } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../ui/Button.jsx';
import { fetchJson } from '../../api/http.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { useAiChat } from './AiChatContext.jsx';

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content || ''),
      createdAt: m?.createdAt || null,
    }))
    .filter((m) => m.content.trim().length > 0);
}

export default function AiChatPanel() {
  const { t, isRTL } = useI18n();
  const ctx = useAiChat();

  const isOpen = Boolean(ctx?.isOpen);
  const close = typeof ctx?.close === 'function' ? ctx.close : () => {};
  const width = Number(ctx?.width || 420);
  const setWidth = typeof ctx?.setWidth === 'function' ? ctx.setWidth : () => {};

  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const loadedRef = React.useRef(false);
  const listRef = React.useRef(null);

  const title = t('aiChat.title', { defaultValue: 'AI Assistant' });

  const scrollToBottom = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(scrollToBottom, 0);
    return () => window.clearTimeout(id);
  }, [isOpen, messages.length, scrollToBottom]);

  const loadHistory = React.useCallback(async () => {
    if (loadedRef.current) return;
    setLoadingHistory(true);
    try {
      const data = await fetchJson('/ai/chat/history');
      setMessages(normalizeMessages(data?.messages));
      loadedRef.current = true;
    } catch (e) {
      toast.error(e?.data?.message || e?.message || t('common.errors.failedToLoad', { defaultValue: 'Failed to load' }));
    } finally {
      setLoadingHistory(false);
    }
  }, [t]);

  React.useEffect(() => {
    if (!isOpen) return;
    loadHistory();
  }, [isOpen, loadHistory]);

  const send = async () => {
    const text = String(input || '').trim();
    if (!text) return;
    if (sending) return;

    setSending(true);
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: text, createdAt: new Date().toISOString() }]);

    try {
      const data = await fetchJson('/ai/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      const reply = String(data?.reply || '').trim();
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply, createdAt: new Date().toISOString() }]);
      } else {
        toast.error(t('aiChat.errors.emptyReply', { defaultValue: 'AI returned an empty reply' }));
      }
    } catch (e) {
      toast.error(e?.data?.message || e?.message || t('common.errors.networkOrServerError', { defaultValue: 'Network or server error' }));
    } finally {
      setSending(false);
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Drag-to-resize
  const dragRef = React.useRef({ active: false });

  const onDragStart = (e) => {
    e.preventDefault();
    dragRef.current.active = true;

    const onMove = (ev) => {
      if (!dragRef.current.active) return;
      const clientX = typeof ev?.clientX === 'number' ? ev.clientX : (ev?.touches?.[0]?.clientX ?? 0);
      // Panel is always on the RIGHT (LTR + RTL), so width = distance from RIGHT edge.
      const next = window.innerWidth - clientX;
      setWidth(next);
    };

    const onUp = () => {
      dragRef.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  if (!isOpen) return null;

  return (
    <aside
      className={
        'relative shrink-0 h-full flex flex-col bg-(--nb-color-bg-card) ' +
        'border-(--nb-color-border) border-l'
      }
      style={{ width }}
      aria-label={title}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={
          'absolute top-0 bottom-0 w-2 left-0 cursor-col-resize bg-(--nb-color-border)/60 hover:bg-(--nb-color-border) '
        }
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        title={t('aiChat.resize', { defaultValue: 'Drag to resize' })}
        role="separator"
        aria-orientation="vertical"
      />

      <div className="shrink-0 p-4 border-b border-(--nb-color-border) flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-(--nb-color-fg) truncate">{title}</div>
          <div className="text-xs text-(--nb-color-muted)">
            {t('aiChat.subtitle', { defaultValue: 'Chat is saved for your account' })}
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          className="text-(--nb-color-muted) hover:text-(--nb-color-fg) p-1 rounded-(--nb-radius-sm) hover:bg-(--nb-color-brand-50) transition-colors"
          title={t('common.close', { defaultValue: 'Close' })}
        >
          <X size={20} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
        {loadingHistory ? (
          <div className="text-sm text-(--nb-color-muted)">{t('common.loading', { defaultValue: 'Loading…' })}</div>
        ) : null}

        {!loadingHistory && messages.length === 0 ? (
          <div className="text-sm text-(--nb-color-muted)">
            {t('aiChat.empty', { defaultValue: 'Ask anything about how to use the system.' })}
          </div>
        ) : null}

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  'max-w-[85%] rounded-(--nb-radius-md) border px-3 py-2 text-sm whitespace-pre-wrap ' +
                  (isUser
                    ? 'bg-amber-700 border-amber-800 text-white'
                    : 'bg-orange-50 border-orange-200 text-orange-950')
                }
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {sending ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-(--nb-radius-md) border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
              {t('aiChat.thinking', { defaultValue: 'Thinking…' })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 p-4 border-t border-(--nb-color-border)">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            rows={2}
            className={
              'flex-1 resize-none rounded-(--nb-radius-md) border border-(--nb-color-border) ' +
              'bg-(--nb-color-bg-card) px-3 py-2 text-sm text-(--nb-color-fg) ' +
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand)'
            }
            placeholder={t('aiChat.placeholder', { defaultValue: 'Type a message…' })}
            disabled={sending}
          />
          <Button
            variant="brand"
            size="md"
            onClick={send}
            disabled={sending || String(input || '').trim().length === 0}
            title={t('aiChat.send', { defaultValue: 'Send' })}
            icon={<Send size={16} />}
          >
            {t('aiChat.send', { defaultValue: 'Send' })}
          </Button>
        </div>
      </div>
    </aside>
  );
}
