'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export type DocumentDraft = { content: string; pending: boolean; baseRevision: number };
type Registry = ReturnType<typeof createRegistry>;
function createRegistry(userId: string, accountId: string | null) {
  const drafts = new Map<string, DocumentDraft>();
  const flushers = new Map<string, () => Promise<boolean>>();
  let generation = 0;
  let transitioning = false;
  const listeners = new Set<() => void>();
  return {
    userId,
    accountId,
    isTransitioning: () => transitioning,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setTransitioning(value: boolean) {
      transitioning = value;
      for (const listener of listeners) listener();
    },
    get: (id: string) => drafts.get(id),
    put(id: string, draft: DocumentDraft) {
      if (accountId) drafts.set(id, draft);
    },
    remove(id: string, expectedContent: string) {
      if (drafts.get(id)?.content === expectedContent) drafts.delete(id);
    },
    clear() {
      generation++;
      drafts.clear();
      flushers.clear();
    },
    generation: () => generation,
    hasDrafts: () => drafts.size > 0,
    register(id: string, flush: () => Promise<boolean>) {
      flushers.set(id, flush);
      return () => {
        if (flushers.get(id) === flush) flushers.delete(id);
      };
    },
    async flushAll() {
      for (const id of drafts.keys()) {
        const flush = flushers.get(id);
        // An unmounted editor's draft must be restored before leaving this identity.
        if (!flush || !(await flush())) return false;
      }
      return drafts.size === 0;
    },
  };
}
const DraftContext = createContext<Registry | null>(null);

/** Drafts live only for this verified identity's SPA session. */
export function DocumentDraftProvider({
  userId,
  accountId,
  children,
}: {
  userId: string;
  accountId: string | null;
  children: ReactNode;
}) {
  const [registry] = useState(() => createRegistry(userId, accountId));
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!registry.hasDrafts()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      // The keyed provider owns the registry's lifetime. Clearing in effect
      // cleanup also runs during StrictMode replay and invalidates live editors.
    };
  }, [registry]);
  return <DraftContext value={registry}>{children}</DraftContext>;
}

/** Removing a saved snapshot never removes a newer edit. */
export function useDocumentDraftRegistry() {
  const registry = useContext(DraftContext);
  if (!registry) throw new Error('DocumentDraftProvider is required');
  return registry;
}

/** Confirm before changing identity; clear only after the transition succeeds. */
export function useDocumentDraftTransition() {
  const registry = useContext(DraftContext);
  const t = useTranslations('documentEditor');
  return {
    async confirmTransition() {
      if (!registry) return true;
      if (registry.isTransitioning()) return false;
      if (registry.hasDrafts() && !window.confirm(t('leaveIdentity'))) return false;
      registry.setTransitioning(true);
      try {
        const ready = await registry.flushAll();
        if (!ready) registry.setTransitioning(false);
        return ready;
      } catch {
        registry.setTransitioning(false);
        return false;
      }
    },
    cancelTransition(error?: unknown) {
      // Next's successful redirect control flow keeps editing locked until remount.
      if (
        typeof error === 'object' &&
        error !== null &&
        'digest' in error &&
        typeof error.digest === 'string' &&
        error.digest.startsWith('NEXT_REDIRECT')
      )
        return;
      registry?.setTransitioning(false);
    },
    clear() {
      registry?.clear();
    },
  };
}
