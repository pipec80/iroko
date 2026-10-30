import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '@/config/app.config';

const mocks = vi.hoisted(() => ({
  getActiveAccountId: vi.fn().mockResolvedValue('account'),
  getActiveAccountRole: vi.fn().mockResolvedValue('owner'),
  listByAccount: vi.fn().mockResolvedValue([]),
  getBySlug: vi.fn().mockResolvedValue(null),
  getById: vi.fn().mockResolvedValue(null),
  createClient: vi.fn().mockResolvedValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'user' } } }) },
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  }),
}));
vi.mock('@/config/app.config', () => ({
  appConfig: {
    brand: 'Iroko',
    features: { projects: false, members: true, billing: true, verticals: { robot: false } },
  },
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}));
vi.mock('@/lib/active-account', () => ({
  getActiveAccountId: mocks.getActiveAccountId,
  getActiveAccountRole: mocks.getActiveAccountRole,
}));
vi.mock('@/lib/projects', () => ({
  listByAccount: mocks.listByAccount,
  getBySlug: mocks.getBySlug,
}));
vi.mock('@/lib/project-documents', () => ({
  getById: mocks.getById,
  listByProject: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/user-timezone', () => ({ getUserTimezone: vi.fn().mockResolvedValue('UTC') }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));
vi.mock('@/components/dashboard/projects/new-project-dialog', () => ({
  NewProjectDialog: () => null,
}));
vi.mock('@/components/dashboard/projects/new-document-dialog', () => ({
  NewDocumentDialog: () => null,
}));
vi.mock('@/components/dashboard/projects/markdown-editor', () => ({ MarkdownEditor: () => null }));
vi.mock('../[slug]/doc/[docId]/actions', () => ({ saveDocument: vi.fn() }));

import ProjectsPage, { generateMetadata as projectsMetadata } from '../page';
import ProjectPage, { generateMetadata as projectMetadata } from '../[slug]/page';
import DocumentPage, { generateMetadata as documentMetadata } from '../[slug]/doc/[docId]/page';
import DashboardPage from '../../page';

const props = { params: Promise.resolve({ locale: 'es', slug: 'existing', docId: 'existing' }) };

describe('Projects excluded from the offered configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfig.features.projects = false;
  });

  it.each([
    ['index', () => ProjectsPage(props)],
    ['project', () => ProjectPage(props)],
    ['editor', () => DocumentPage(props)],
    ['index metadata', () => projectsMetadata()],
    ['project metadata', () => projectMetadata(props)],
    ['editor metadata', () => documentMetadata(props)],
  ])('denies direct %s access before data reads', async (_name, invoke) => {
    await expect(invoke()).rejects.toThrow('NOT_FOUND');
    expect(mocks.getActiveAccountId).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.listByAccount).not.toHaveBeenCalled();
    expect(mocks.getBySlug).not.toHaveBeenCalled();
    expect(mocks.getById).not.toHaveBeenCalled();
  });

  it('does not fetch Projects or offer its quick link from the home', async () => {
    render(await DashboardPage(props));
    expect(mocks.listByAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /quick_projects/ })).toBeNull();
    expect(screen.getByRole('link', { name: /quick_members/ })).toBeDefined();
  });

  it('preserves the enabled project listing and home query', async () => {
    appConfig.features.projects = true;
    render(await ProjectsPage(props));
    expect(mocks.listByAccount).toHaveBeenCalledWith('account');
  });
});
