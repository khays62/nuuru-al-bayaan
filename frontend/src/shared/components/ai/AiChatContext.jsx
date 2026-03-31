import React from 'react';

const AiChatContext = React.createContext(null);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function AiChatProvider({ children, enabled = true }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [width, setWidthState] = React.useState(420);

  const setWidth = React.useCallback((next) => {
    const n = Number(next);
    if (!Number.isFinite(n)) return;
    // Keep the split usable.
    const max = typeof window !== 'undefined' ? Math.max(320, Math.floor(window.innerWidth * 0.8)) : 900;
    setWidthState(clamp(n, 320, max));
  }, []);

  const open = React.useCallback(() => {
    if (!enabled) return;
    setIsOpen(true);
  }, [enabled]);

  const close = React.useCallback(() => setIsOpen(false), []);

  const toggle = React.useCallback(() => {
    if (!enabled) return;
    setIsOpen((v) => !v);
  }, [enabled]);

  React.useEffect(() => {
    if (enabled) return;
    setIsOpen(false);
  }, [enabled]);

  const value = React.useMemo(() => ({
    enabled,
    isOpen,
    open,
    close,
    toggle,
    width,
    setWidth,
  }), [enabled, isOpen, open, close, toggle, width, setWidth]);

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAiChat() {
  return React.useContext(AiChatContext);
}
