import React from 'react';
import { Loader2, Menu, Plus, Send, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../ui/Button.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { fetchJson } from '../../api/http.js';
import { useI18n } from '../../../i18n/useI18n';
import { useAiChat } from './AiChatContext.jsx';

function SidebarThreadsSkeleton() {
  return (
    <div className="flex-1 min-h-0 overflow-auto p-2 space-y-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) px-2 py-2"
        >
          <Skeleton className="h-3 w-3/4" />
          <div className="mt-2">
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageListSkeleton({ t }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto p-4" aria-hidden="true">
      <div className="rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) p-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-(--nb-color-border) border-t-(--nb-color-accent)" />
          <span className="text-sm text-(--nb-color-fg)">{t('common.loading', { defaultValue: 'Loading…' })}</span>
        </div>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    </div>
  );
}

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

const MAX_MESSAGE_WORDS = 300;

function countWords(text) {
  const s = String(text || '');
  const matches = s.match(/\S+/g);
  return matches ? matches.length : 0;
}

function clampToWords(text, maxWords) {
  const s = String(text || '');
  const re = /\S+/g;
  let match;
  let count = 0;
  let endIndex = 0;

  while ((match = re.exec(s))) {
    count += 1;
    if (count === maxWords) {
      endIndex = re.lastIndex;
      break;
    }
  }

  if (count < maxWords) return s;
  return s.slice(0, endIndex);
}

export default function AiChatPanel() {
  const { t, isRTL } = useI18n();
  const ctx = useAiChat();

  const isEnabled = ctx?.enabled !== false;

  const isOpen = Boolean(ctx?.isOpen);
  const close = typeof ctx?.close === 'function' ? ctx.close : () => {};
  const width = Number(ctx?.width || 420);
  const setWidth = typeof ctx?.setWidth === 'function' ? ctx.setWidth : () => {};

  const [threadsOpen, setThreadsOpen] = React.useState(false);
  const [loadingThreads, setLoadingThreads] = React.useState(false);
  const [threads, setThreads] = React.useState([]);
  const [activeThreadId, setActiveThreadId] = React.useState(null);

  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [sidebarBusy, setSidebarBusy] = React.useState(false);
  const [creatingThread, setCreatingThread] = React.useState(false);
  const [switchingThread, setSwitchingThread] = React.useState(false);
  const [deletingThreadId, setDeletingThreadId] = React.useState(null);

  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const loadedRef = React.useRef(false);
  const listRef = React.useRef(null);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(Boolean(mq.matches));
    onChange();
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange);
      else if (typeof mq.removeListener === 'function') mq.removeListener(onChange);
    };
  }, []);

  // Mobile keyboard handling: keep the footer/input visible when the on-screen keyboard opens.
  const [viewportBottomInset, setViewportBottomInset] = React.useState(0);

  const title = t('aiChat.title', { defaultValue: 'AI Assistant' });

  const threadUiLocked = Boolean(
    !hasLoaded || sending || creatingThread || switchingThread || deletingThreadId
  );

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

  React.useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;
    if (!isMobile) {
      setViewportBottomInset(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const bottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setViewportBottomInset(bottom);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
    };
  }, [isMobile, isOpen]);

  const loadThreads = React.useCallback(async () => {
    setLoadingThreads(true);
    try {
      const data = await fetchJson('/ai/chat/threads?limit=20');
      const items = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(items);
      const nextActive = data?.activeThreadId || items?.[0]?.threadId || null;
      setActiveThreadId(nextActive);
      return { items, activeThreadId: nextActive };
    } catch (e) {
      toast.error(e?.data?.message || e?.message || t('common.errors.failedToLoad', { defaultValue: 'Failed to load' }));
      return { items: [], activeThreadId: null };
    } finally {
      setLoadingThreads(false);
    }
  }, [t]);

  const loadHistory = React.useCallback(async (threadId) => {
    setLoadingHistory(true);
    try {
      const qs = threadId ? `?threadId=${encodeURIComponent(threadId)}` : '';
      const data = await fetchJson(`/ai/chat/history${qs}`);
      setMessages(normalizeMessages(data?.messages));
      if (data?.threadId) setActiveThreadId(String(data.threadId));
      loadedRef.current = true;
      setHasLoaded(true);
    } catch (e) {
      toast.error(e?.data?.message || e?.message || t('common.errors.failedToLoad', { defaultValue: 'Failed to load' }));
      setHasLoaded(true);
    } finally {
      setLoadingHistory(false);
    }
  }, [t]);

  React.useEffect(() => {
    if (!isOpen) return;
    setHasLoaded(Boolean(loadedRef.current));
  }, [isOpen]);


  React.useEffect(() => {
    if (!isOpen) return;
    if (loadedRef.current) return;
    (async () => {
      const { activeThreadId: tid } = await loadThreads();
      await loadHistory(tid);
    })();
  }, [isOpen, loadHistory, loadThreads]);

  const startNewChat = React.useCallback(async () => {
    if (creatingThread || switchingThread || sending) return;
    const wasOpen = Boolean(threadsOpen);
    if (wasOpen) setSidebarBusy(true);
    setCreatingThread(true);
    try {
      const data = await fetchJson('/ai/chat/threads', { method: 'POST', body: JSON.stringify({}) });
      const threadId = data?.threadId ? String(data.threadId) : null;
      if (!threadId) throw new Error('Missing threadId');
      setActiveThreadId(threadId);
      setMessages([]);
      loadedRef.current = true;
      await Promise.all([loadHistory(threadId), loadThreads()]);
    } catch (e) {
      toast.error(e?.data?.message || e?.message || t('common.errors.failedToLoad', { defaultValue: 'Failed to load' }));
    } finally {
      setCreatingThread(false);
      if (wasOpen) {
        setSidebarBusy(false);
        setThreadsOpen(false);
      }
    }
  }, [creatingThread, loadHistory, loadThreads, sending, switchingThread, t, threadsOpen]);

  const selectThread = React.useCallback(async (threadId) => {
    const tid = String(threadId || '').trim();
    if (!tid) return;
    if (sending || creatingThread || switchingThread) return;

    const wasOpen = Boolean(threadsOpen);
    if (wasOpen) setSidebarBusy(true);

    setSwitchingThread(true);
    setActiveThreadId(tid);
    try {
      await Promise.all([loadHistory(tid), loadThreads()]);
    } finally {
      setSwitchingThread(false);
      if (wasOpen) {
        setSidebarBusy(false);
        setThreadsOpen(false);
      }
    }
  }, [creatingThread, loadHistory, loadThreads, sending, switchingThread, threadsOpen]);

  const deleteThread = React.useCallback(async (threadId) => {
    const tid = String(threadId || '').trim();
    if (!tid) return;
    if (sending || creatingThread || switchingThread || deletingThreadId) return;
    const ok = window.confirm(t('aiChat.deleteConfirm', { defaultValue: 'Delete this chat?' }));
    if (!ok) return;

    setDeletingThreadId(tid);

    try {
      await fetchJson(`/ai/chat/threads/${encodeURIComponent(tid)}`, { method: 'DELETE' });
      const { activeThreadId: nextTid } = await loadThreads();
      await loadHistory(nextTid);
    } catch (e) {
      toast.error(e?.data?.message || e?.message || t('common.errors.failedToLoad', { defaultValue: 'Failed to load' }));
    } finally {
      setDeletingThreadId(null);
    }
  }, [creatingThread, deletingThreadId, loadHistory, loadThreads, sending, switchingThread, t]);

  const send = async () => {
    const text = String(input || '').trim();
    if (!text) return;
    if (sending) return;
    if (creatingThread || switchingThread || deletingThreadId) return;

    setSending(true);
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: text, createdAt: new Date().toISOString() }]);

    try {
      const data = await fetchJson('/ai/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message: text, threadId: activeThreadId || undefined }),
      });

      const reply = String(data?.reply || '').trim();
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply, createdAt: new Date().toISOString() }]);
        // Thread title/ordering might have changed.
        await loadThreads();
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

  const toggleThreads = () => {
    setThreadsOpen((v) => !v);
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

  if (!isEnabled) return null;
  if (!isOpen) return null;

  const showInitialSkeleton = !hasLoaded && (loadingThreads || loadingHistory);
  const showSidebarSkeleton = threadsOpen && (sidebarBusy || loadingThreads);
  const showConversationSkeleton = (creatingThread || switchingThread) && loadingHistory;
  const showMessageSkeleton = showInitialSkeleton || showConversationSkeleton;

  return (
    <aside
      className={
        (isMobile
          ? 'fixed inset-0 z-70 w-screen '
          : 'relative shrink-0 h-full ') +
        'flex flex-col bg-(--nb-color-bg-card) border-(--nb-color-border) border-l'
      }
      style={isMobile
        ? {
          width: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          paddingBottom: `calc(${viewportBottomInset}px + env(safe-area-inset-bottom))`,
        }
        : { width }}
      aria-label={title}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={
          'hidden sm:block absolute top-0 bottom-0 w-2 left-0 cursor-col-resize bg-(--nb-color-border)/60 hover:bg-(--nb-color-border) '
        }
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        title={t('aiChat.resize', { defaultValue: 'Drag to resize' })}
        role="separator"
        aria-orientation="vertical"
      />

      <div className="shrink-0 p-4 border-b border-(--nb-color-border) bg-(--nb-color-bg) text-(--nb-color-fg) flex items-center justify-between">
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleThreads}
            className="text-(--nb-color-muted) hover:text-(--nb-color-fg) p-1 rounded-(--nb-radius-sm) hover:bg-(--nb-color-brand-50) transition-colors"
            title={t('aiChat.history', { defaultValue: 'History' })}
            aria-label={t('aiChat.history', { defaultValue: 'History' })}
            disabled={threadUiLocked}
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-(--nb-color-brand-ui)">{title}</div>
            <div className="text-xs text-(--nb-color-muted)">
              {t('aiChat.subtitle', { defaultValue: 'Chat is saved for your account' })}
            </div>
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

      <div className="flex-1 min-h-0 flex">
        {threadsOpen ? (
          <div className="w-64 shrink-0 border-r border-(--nb-color-border) bg-linear-to-b from-(--nb-color-brand-50) to-(--nb-color-accent-50) flex flex-col">
            <div className="p-3 border-b border-(--nb-color-border) bg-linear-to-r from-(--nb-color-brand-50) to-(--nb-color-accent-50)">
              <Button
                variant="brand"
                size="md"
                className="w-full justify-center"
                onClick={startNewChat}
                icon={creatingThread ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                title={t('aiChat.newChat', { defaultValue: 'New chat' })}
                disabled={threadUiLocked}
              >
                {t('aiChat.newChat', { defaultValue: 'New chat' })}
              </Button>
            </div>

            {showSidebarSkeleton ? (
              <SidebarThreadsSkeleton />
            ) : (
              <div className="flex-1 min-h-0 overflow-auto p-2 space-y-1">
                {!loadingThreads && threads.length === 0 ? (
                  <div className="text-sm text-(--nb-color-muted) px-2 py-1">
                    {t('common.empty', { defaultValue: 'Empty' })}
                  </div>
                ) : null}

                {threads.map((th) => {
                  const tid = String(th?.threadId || '');
                  const isActive = tid && tid === String(activeThreadId || '');
                  const isDeleting = deletingThreadId && String(deletingThreadId) === tid;
                  return (
                    <div
                      key={tid}
                      className={
                        'w-full rounded-(--nb-radius-md) border overflow-hidden ' +
                        (isActive
                          ? 'border-(--nb-color-accent-200) bg-(--nb-color-accent-50)'
                          : 'border-(--nb-color-border) bg-(--nb-color-bg-card)')
                      }
                    >
                      <div className="w-full px-2 py-1 flex flex-nowrap items-stretch gap-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => selectThread(tid)}
                          className={
                            'flex-1 min-w-0 px-1.5 py-1.5 text-left flex items-start justify-between gap-2 rounded-(--nb-radius-sm) ' +
                            (isActive ? 'text-(--nb-color-brand-ui)' : 'text-(--nb-color-fg) hover:bg-(--nb-color-accent-50)')
                          }
                          title={String(th?.title || '')}
                          disabled={threadUiLocked}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{String(th?.title || t('aiChat.newChat', { defaultValue: 'New chat' }))}</div>
                            {th?.preview ? (
                              <div className="text-xs text-(--nb-color-muted) truncate">{String(th.preview)}</div>
                            ) : null}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteThread(tid)}
                          className={
                            'shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-(--nb-radius-sm) border border-(--nb-color-border) bg-(--nb-color-bg-card) text-red-600 ' +
                            (threadUiLocked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-(--nb-color-accent-50)')
                          }
                          title={t('aiChat.deleteChat', { defaultValue: 'Delete' })}
                          aria-label={t('aiChat.deleteChat', { defaultValue: 'Delete' })}
                          disabled={threadUiLocked}
                        >
                          {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {showMessageSkeleton ? (
          <MessageListSkeleton t={t} />
        ) : (
          <div ref={listRef} className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
            {messages.length === 0 ? (
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
                        ? 'bg-(--nb-color-accent-50) border-(--nb-color-accent-200) text-(--nb-color-fg)'
                        : 'bg-(--nb-color-bg-card) border-(--nb-color-border) text-(--nb-color-fg)')
                    }
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {sending ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-(--nb-radius-md) border border-(--nb-color-accent-200) bg-(--nb-color-accent-50) px-3 py-2 text-sm text-(--nb-color-fg)">
                  {t('aiChat.thinking', { defaultValue: 'Thinking…' })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 border-t border-(--nb-color-border)">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(clampToWords(e.target.value, MAX_MESSAGE_WORDS))}
            onKeyDown={onInputKeyDown}
            rows={2}
            className={
              'flex-1 resize-none rounded-(--nb-radius-md) border border-(--nb-color-border) ' +
              'bg-(--nb-color-bg-card) px-3 py-2 text-sm text-(--nb-color-fg) ' +
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand)'
            }
            placeholder={t('aiChat.placeholder', { defaultValue: 'Type a message…' })}
            disabled={sending || loadingHistory || creatingThread || switchingThread || Boolean(deletingThreadId) || !hasLoaded}
          />
          <Button
            variant="brand"
            size="md"
            onClick={send}
            disabled={
              sending
              || loadingHistory
              || creatingThread
              || switchingThread
              || Boolean(deletingThreadId)
              || !hasLoaded
              || String(input || '').trim().length === 0
              || countWords(input) > MAX_MESSAGE_WORDS
            }
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
