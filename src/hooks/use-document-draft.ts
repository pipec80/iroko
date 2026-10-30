'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useDocumentDraftRegistry } from '@/components/providers/document-draft-provider';
import type { DocumentDraft } from '@/components/providers/document-draft-provider';
import type { SaveDocumentResult } from '@/app/[locale]/dashboard/projects/[slug]/doc/[docId]/actions';

const AUTOSAVE_DELAY = 800;

/** Serializes saves; a failed or stale completion cannot discard the latest draft. */
export function useDocumentDraft({
  docId,
  userId,
  accountId,
  initialContent,
  initialRevision,
  save,
}: {
  docId: string;
  userId: string;
  accountId: string;
  initialContent: string;
  initialRevision: number;
  save: (content: string, expectedRevision: number) => Promise<SaveDocumentResult>;
}) {
  const registry = useDocumentDraftRegistry();
  const transitioning = useSyncExternalStore(
    registry.subscribe,
    registry.isTransitioning,
    () => false,
  );
  const [content, updateContent] = useState(initialContent);
  const [confirmedContent, setConfirmedContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const latest = useRef(initialContent);
  const confirmed = useRef(initialContent);
  const revision = useRef(initialRevision);
  const active = useRef(true);
  const generation = useRef(registry.generation());
  const pending = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const enabled = userId === registry.userId && accountId === registry.accountId;
  function isCurrent() {
    return active.current && generation.current === registry.generation();
  }
  function setContent(value: string) {
    if (!enabled || !isCurrent() || registry.isTransitioning()) return;
    latest.current = value;
    updateContent(value);
    setError(false);
    if (value === confirmed.current && !pending.current) {
      const stored = registry.get(docId);
      if (stored) registry.remove(docId, stored.content);
    } else registry.put(docId, { content: value, pending: false, baseRevision: revision.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flushRef.current();
    }, AUTOSAVE_DELAY);
  }
  function restore(snapshot: DocumentDraft) {
    if (!enabled || !isCurrent() || registry.isTransitioning()) return;
    revision.current = snapshot.baseRevision;
    setContent(snapshot.content);
  }
  function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current) return pending.current;
    if (!enabled || !isCurrent()) return Promise.resolve(false);
    if (latest.current === confirmed.current) return Promise.resolve(true);
    const run = async () => {
      setSaving(true);
      setError(false);
      try {
        while (latest.current !== confirmed.current) {
          const snapshot = latest.current;
          registry.put(docId, { content: snapshot, pending: true, baseRevision: revision.current });
          let result: SaveDocumentResult;
          try {
            result = await saveRef.current(snapshot, revision.current);
          } catch {
            result = { success: false, error: 'save_failed' };
          }
          if (!isCurrent()) return false;
          if (!result.success) {
            registry.put(docId, {
              content: latest.current,
              pending: false,
              baseRevision: revision.current,
            });
            setError(true);
            return false;
          }
          revision.current = result.revision;
          if (latest.current !== snapshot) {
            registry.put(docId, {
              content: latest.current,
              pending: false,
              baseRevision: revision.current,
            });
          }
          confirmed.current = snapshot;
          setConfirmedContent(snapshot);
          registry.remove(docId, snapshot);
        }
        return true;
      } finally {
        pending.current = null;
        if (isCurrent()) setSaving(false);
      }
    };
    pending.current = run();
    return pending.current;
  }
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => {
    active.current = true;
    const unregister = registry.register(docId, () => flushRef.current());
    return () => {
      active.current = false;
      unregister();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [registry, docId]);
  return {
    content,
    dirty: content !== confirmedContent,
    saving,
    error,
    setContent,
    restore,
    flush,
    canEdit: enabled && !transitioning,
  };
}
