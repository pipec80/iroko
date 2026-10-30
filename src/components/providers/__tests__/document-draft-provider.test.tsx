import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DocumentDraftProvider,
  useDocumentDraftRegistry,
  useDocumentDraftTransition,
} from '../document-draft-provider';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const wrapper = ({ children }: { children: ReactNode }) => (
  <DocumentDraftProvider userId="a" accountId="account-a">
    {children}
  </DocumentDraftProvider>
);

describe('identity document drafts', () => {
  it('keeps a newer edit when an older snapshot is removed', () => {
    const { result } = renderHook(useDocumentDraftRegistry, { wrapper });
    result.current.put('doc', { content: 'B', pending: false, baseRevision: 0 });
    result.current.remove('doc', 'A');
    expect(result.current.get('doc')?.content).toBe('B');
    result.current.clear();
    expect(result.current.get('doc')).toBeUndefined();
  });
  it('retains drafts after the editor unmounts and warns before unload', () => {
    const { result } = renderHook(useDocumentDraftRegistry, { wrapper });
    result.current.put('doc', { content: 'retained', pending: false, baseRevision: 0 });
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.get('doc')?.content).toBe('retained');
  });
  it('cancels identity transitions without discarding a draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(
      () => ({ registry: useDocumentDraftRegistry(), transition: useDocumentDraftTransition() }),
      { wrapper },
    );
    result.current.registry.put('doc', { content: 'retained', pending: false, baseRevision: 0 });
    expect(await result.current.transition.confirmTransition()).toBe(false);
    expect(result.current.registry.get('doc')?.content).toBe('retained');
    expect(confirm).toHaveBeenCalledOnce();
  });
  it('retains failed flushes and clears only on explicit confirmed transition', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(
      () => ({ registry: useDocumentDraftRegistry(), transition: useDocumentDraftTransition() }),
      { wrapper },
    );
    result.current.registry.put('doc', { content: 'retained', pending: false, baseRevision: 0 });
    result.current.registry.register('doc', async () => false);
    expect(await result.current.transition.confirmTransition()).toBe(false);
    expect(result.current.registry.get('doc')?.content).toBe('retained');
    act(() => result.current.transition.clear());
    expect(result.current.registry.get('doc')).toBeUndefined();
  });
  it('a new keyed identity cannot restore drafts from the previous identity', () => {
    const first = renderHook(useDocumentDraftRegistry, { wrapper });
    first.result.current.put('doc', { content: 'private-a', pending: false, baseRevision: 0 });
    first.unmount();
    const next = renderHook(useDocumentDraftRegistry, {
      wrapper: ({ children }) => (
        <DocumentDraftProvider key="b" userId="b" accountId="account-b">
          {children}
        </DocumentDraftProvider>
      ),
    });
    expect(next.result.current.get('doc')).toBeUndefined();
  });
});
