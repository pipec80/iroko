'use client';

import { useEffect, useInsertionEffect, useRef } from 'react';

interface ShortcutOptions {
  ctrlOrMeta?: boolean;
  shift?: boolean;
  ignoreInputs?: boolean;
}

export function useShortcut(
  key: string,
  handler: () => void,
  { ctrlOrMeta = false, shift = false, ignoreInputs = false }: ShortcutOptions = {},
) {
  // Ref pattern: avoids re-registering the listener on every render
  const handlerRef = useRef(handler);
  useInsertionEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (ignoreInputs) {
        const el = e.target as HTMLElement;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
      }

      const ctrlOrMetaOk = ctrlOrMeta ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey;
      const shiftOk = shift ? e.shiftKey : !e.shiftKey;

      if (ctrlOrMetaOk && shiftOk && !e.altKey && e.key === key) {
        e.preventDefault();
        handlerRef.current();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key, ctrlOrMeta, shift, ignoreInputs]);
}
