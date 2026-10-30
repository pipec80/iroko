import type { SaveDocumentResult } from '@/app/[locale]/dashboard/projects/[slug]/doc/[docId]/actions';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DocumentDraftProvider,
  useDocumentDraftRegistry,
  useDocumentDraftTransition,
} from '@/components/providers/document-draft-provider';
import { useDocumentDraft } from '../use-document-draft';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const wrapper = ({ children }: { children: ReactNode }) => (
  <DocumentDraftProvider userId="user-a" accountId="account-a">
    {children}
  </DocumentDraftProvider>
);
function deferred() {
  let resolve!: (value: SaveDocumentResult) => void;
  const promise = new Promise<SaveDocumentResult>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
describe('document draft', () => {
  it('prevents a new edit after flush while an identity operation is pending, and allows retry on failure', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(
      () => ({
        draft: useDocumentDraft({
          docId: 'doc-a',
          userId: 'user-a',
          accountId: 'account-a',
          initialContent: '',
          initialRevision: 0,
          save: async () => ({ success: true, revision: 1 }),
        }),
        transition: useDocumentDraftTransition(),
      }),
      { wrapper },
    );
    act(() => result.current.draft.setContent('A'));
    await act(async () => {
      expect(await result.current.transition.confirmTransition()).toBe(true);
    });
    act(() => result.current.draft.setContent('B'));
    expect(result.current.draft.content).toBe('A');
    act(() => result.current.transition.cancelTransition());
    act(() => result.current.draft.setContent('B'));
    expect(result.current.draft.content).toBe('B');
  });
  it('removes a discarded edit when returning to the confirmed content', () => {
    const { result } = renderHook(
      () => ({
        draft: useDocumentDraft({
          docId: 'doc-a',
          userId: 'user-a',
          accountId: 'account-a',
          initialContent: '',
          initialRevision: 0,
          save: async () => ({ success: true, revision: 1 }),
        }),
        registry: useDocumentDraftRegistry(),
      }),
      { wrapper },
    );
    act(() => result.current.draft.setContent('edited'));
    act(() => result.current.draft.setContent(''));
    expect(result.current.registry.get('doc-a')).toBeUndefined();
  });
  it('allows editing after StrictMode effect replay', () => {
    const { result } = renderHook(
      () =>
        useDocumentDraft({
          docId: 'doc-a',
          userId: 'user-a',
          accountId: 'account-a',
          initialContent: '',
          initialRevision: 0,
          save: async () => ({ success: true, revision: 1 }),
        }),
      { wrapper, reactStrictMode: true },
    );
    act(() => result.current.setContent('edited'));
    expect(result.current.content).toBe('edited');
  });
  it('preserves the latest draft while an older save finishes', async () => {
    const pending = deferred();
    const save = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ success: false, error: 'save_failed' });
    const { result } = renderHook(
      () =>
        useDocumentDraft({
          docId: 'doc-a',
          userId: 'user-a',
          accountId: 'account-a',
          initialContent: '',
          initialRevision: 0,
          save,
        }),
      { wrapper },
    );
    act(() => result.current.setContent('A'));
    let flushing!: Promise<boolean>;
    act(() => {
      flushing = result.current.flush();
    });
    act(() => result.current.setContent('B'));
    await act(async () => {
      pending.resolve({ success: true, revision: 1 });
      await flushing;
    });
    expect(result.current.content).toBe('B');
    expect(result.current.dirty).toBe(true);
    expect(save).toHaveBeenNthCalledWith(2, 'B', 1);
  });
  it('retains the draft after rejected flush', async () => {
    const save = vi.fn().mockRejectedValue(new Error('unavailable'));
    const { result } = renderHook(
      () =>
        useDocumentDraft({
          docId: 'doc-a',
          userId: 'user-a',
          accountId: 'account-a',
          initialContent: '',
          initialRevision: 0,
          save,
        }),
      { wrapper },
    );
    act(() => result.current.setContent('retained'));
    await act(async () => {
      expect(await result.current.flush()).toBe(false);
    });
    expect(result.current.content).toBe('retained');
    expect(result.current.dirty).toBe(true);
    expect(result.current.error).toBe(true);
  });
  it('serializes concurrent flushes and confirms the latest content', async () => {
    const pending = deferred();
    const save = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ success: true, revision: 2 });
    const { result } = renderHook(
      () =>
        useDocumentDraft({
          docId: 'doc-a',
          userId: 'user-a',
          accountId: 'account-a',
          initialContent: '',
          initialRevision: 0,
          save,
        }),
      { wrapper },
    );
    act(() => result.current.setContent('A'));
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.flush();
      second = result.current.flush();
    });
    act(() => result.current.setContent('B'));
    await act(async () => {
      pending.resolve({ success: true, revision: 1 });
      expect(await first).toBe(true);
      expect(await second).toBe(true);
    });
    expect(save.mock.calls).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
    expect(result.current.dirty).toBe(false);
  });
});
