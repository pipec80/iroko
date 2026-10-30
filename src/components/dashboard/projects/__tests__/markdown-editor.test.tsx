import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentDraftProvider } from '@/components/providers/document-draft-provider';
import { MarkdownEditor } from '../markdown-editor';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const props = {
  docId: 'doc-a',
  userId: 'user-a',
  accountId: 'account-a',
  initialContent: '',
  initialRevision: 0,
  docName: 'Document',
  projectName: 'Project',
  projectSlug: 'project',
};
describe('editor navigation', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([0, 1])(
    'restores a draft after %i confirmed saves without a server change',
    async (confirmedSaves) => {
      const saveAction = vi.fn(async (_id: string, _content: string, expected: number) => ({
        success: true as const,
        revision: expected + 1,
      }));
      const view = render(
        <DocumentDraftProvider userId="user-a" accountId="account-a">
          <MarkdownEditor {...props} saveAction={saveAction} />
        </DocumentDraftProvider>,
      );
      if (confirmedSaves) {
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'confirmed' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'save' })));
      }
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'next draft' } });
      view.rerender(
        <DocumentDraftProvider userId="user-a" accountId="account-a">
          <div>Other route</div>
        </DocumentDraftProvider>,
      );
      view.rerender(
        <DocumentDraftProvider userId="user-a" accountId="account-a">
          <MarkdownEditor
            {...props}
            initialContent={confirmedSaves ? 'confirmed' : ''}
            initialRevision={confirmedSaves}
            saveAction={saveAction}
          />
        </DocumentDraftProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'restore' }));
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'save' })));
      expect(saveAction).toHaveBeenLastCalledWith('doc-a', 'next draft', confirmedSaves);
      expect(screen.getByRole('status').textContent).toBe('saved');
    },
  );
  it('restores the original revision and keeps the draft when the server has advanced', async () => {
    const saveAction = vi.fn(async (_id: string, _content: string, expected: number) =>
      expected === 0 ?
        { success: false as const, error: 'conflict_or_unavailable' as const }
      : { success: true as const, revision: 2 },
    );
    const view = render(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'session A draft' } });
    view.rerender(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <div>Other route</div>
      </DocumentDraftProvider>,
    );
    view.rerender(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor
          {...props}
          initialContent="session B saved"
          initialRevision={1}
          saveAction={saveAction}
        />
      </DocumentDraftProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'restore' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'save' })));
    expect(saveAction).toHaveBeenCalledWith('doc-a', 'session A draft', 0);
    expect(screen.getByRole('alert').textContent).toContain('conflict');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('session A draft');
  });
  it('does not apply a pending result from document A after opening document B', async () => {
    let finish!: (value: { success: true; revision: number }) => void;
    const saveAction = vi.fn(
      () =>
        new Promise<{ success: true; revision: number }>((resolve) => {
          finish = resolve;
        }),
    );
    const view = render(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor key="doc-a" {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'private A' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    view.rerender(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor
          key="doc-b"
          {...props}
          docId="doc-b"
          initialContent="B content"
          saveAction={saveAction}
        />
      </DocumentDraftProvider>,
    );
    await act(async () => finish({ success: true, revision: 1 }));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('B content');
    expect(screen.getByRole('status').textContent).toBe('saved');
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it('offers explicit restoration after a SPA unmount and remount', () => {
    const saveAction = vi.fn().mockResolvedValue({ success: true, revision: 1 });
    const view = render(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unsaved SPA draft' } });
    view.rerender(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <div>Another route</div>
      </DocumentDraftProvider>,
    );
    view.rerender(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'restore' }));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('unsaved SPA draft');
    expect(saveAction).not.toHaveBeenCalled();
  });
  it('keeps a conflicting draft and suspends subsequent writes', async () => {
    const saveAction = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'conflict_or_unavailable' });
    render(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'conflicting draft' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'save' })));
    expect(screen.getByRole('alert').textContent).toContain('conflict');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('conflicting draft');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'save' })));
    expect(saveAction).toHaveBeenCalledTimes(1);
  });
  it('waits for a successful flush before navigating before debounce', async () => {
    let finish!: (value: { success: true; revision: number }) => void;
    const saveAction = vi.fn(
      () =>
        new Promise<{ success: true; revision: number }>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'latest' } });
    fireEvent.click(screen.getByRole('link', { name: 'Project' }));
    expect(saveAction).toHaveBeenCalledWith('doc-a', 'latest', 0);
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => finish({ success: true, revision: 1 }));
    expect(mocks.push).toHaveBeenCalledWith('/dashboard/projects/project');
  });
  it('keeps the editor and content when save is rejected', async () => {
    const saveAction = vi.fn().mockResolvedValue({ error: 'unavailable' });
    render(
      <DocumentDraftProvider userId="user-a" accountId="account-a">
        <MarkdownEditor {...props} saveAction={saveAction} />
      </DocumentDraftProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'retained' } });
    await act(async () => fireEvent.click(screen.getByRole('link', { name: 'Project' })));
    expect(mocks.push).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('retained');
    expect(screen.getByRole('status').textContent).toBe('error');
  });
});
