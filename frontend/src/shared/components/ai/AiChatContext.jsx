import React from 'react';

const AiChatContext = React.createContext(null);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function AiChatProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [width, setWidthState] = React.useState(420);

  const setWidth = React.useCallback((next) => {
    const n = Number(next);
    if (!Number.isFinite(n)) return;
    // Keep the split usable.
    const max = typeof window !== 'undefined' ? Math.max(320, Math.floor(window.innerWidth * 0.8)) : 900;
    setWidthState(clamp(n, 320, max));
  }, []);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((v) => !v), []);

  const value = React.useMemo(() => ({
    isOpen,
    open,
    close,
    toggle,
    width,
    setWidth,
  }), [isOpen, open, close, toggle, width, setWidth]);

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  return React.useContext(AiChatContext);
}
